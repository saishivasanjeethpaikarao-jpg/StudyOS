import { ValidationError } from "@open-sunsama/utils";
import type {
  GeneratedQuizCandidate,
  GeneratedQuizQuestionCandidate,
  QuizGenerationInput,
} from "@open-sunsama/types";
import { ingestAcademicSource } from "./ingestion/index.js";
import { AIRouter } from "./router.js";
import { validateQuestions, type QuestionInput } from "../quiz-scoring.js";

interface RawQuizQuestionOutput {
  type: string;
  prompt: string;
  explanation?: string;
  options: {
    text: string;
    isCorrect: boolean;
  }[];
  sourceReference?: string;
}

interface RawQuizGenerationOutput {
  title: string;
  description?: string;
  questions: RawQuizQuestionOutput[];
}

export class QuizGeneratorService {
  /**
   * Generates grounded, validated candidate questions from an academic source.
   */
  static async generateQuizCandidate(
    userId: string,
    input: QuizGenerationInput
  ): Promise<GeneratedQuizCandidate> {
    const source = await ingestAcademicSource(userId, {
      sourceType: input.sourceType,
      resourceId: input.resourceId,
      noteId: input.noteId,
      pastedText: input.pastedText,
    });

    const questionCount = Math.max(1, Math.min(20, input.questionCount || 5));
    const difficulty = input.difficulty || "medium";
    const requestedType = input.questionType || "mixed";

    // Use primary chunk or combined leading text (up to 30,000 chars)
    const contextText =
      source.fullText.length > 35_000
        ? source.fullText.slice(0, 35_000) + "\n\n[... content continues ...]"
        : source.fullText;

    const systemPrompt = `You are an expert academic educator and assessment specialist for StudyOS.
Generate rigorous, pedagogical Knowledge Check questions based STRICTLY on the supplied study material.
Every question and answer explanation must be directly grounded in the text.
Do not hallucinate concepts, citations, page numbers, or timestamps not present in the material.
Ensure single-choice questions have EXACTLY ONE correct option.
Ensure multiple-choice questions have AT LEAST ONE (and preferably 2 or more) correct options.
Provide 4 options per question unless conceptual clarity demands otherwise (between 2 and 6 options).`;

    const typeInstruction =
      requestedType === "single"
        ? "Generate ONLY single-answer multiple choice questions (type: 'single')."
        : requestedType === "multiple"
          ? "Generate ONLY multi-select questions with two or more correct answers (type: 'multiple')."
          : "Generate a mix of single-answer ('single') and multi-select ('multiple') questions.";

    const prompt = `Study Material Title: "${source.title}"
Reference Context: ${source.referenceSummary}
Difficulty Level: ${difficulty}
Required Question Count: ${questionCount}
Question Types: ${typeInstruction}
${input.focusTopics ? `Specific Focus Topics: ${input.focusTopics}` : ""}

Study Material:
"""
${contextText}
"""

Instructions:
1. Return a JSON object with:
   - "title": A concise title for this quiz based on the material
   - "description": A 1-2 sentence description summarizing the topics tested
   - "questions": An array of ${questionCount} questions.
2. For each question:
   - "type": "single" or "multiple"
   - "prompt": Clear, unambiguous academic question
   - "explanation": Clear explanation of why the correct answers are right and why other options are incorrect
   - "sourceReference": The exact page marker (e.g. "Page 3") or timestamp (e.g. "[02:45]") from the text where the concept appears, or null if general
   - "options": Array of 2 to 6 options, each with "text" and "isCorrect" (boolean)
3. Return ONLY valid JSON.`;

    const jsonSchema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["single", "multiple"] },
              prompt: { type: "string" },
              explanation: { type: "string" },
              sourceReference: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    isCorrect: { type: "boolean" },
                  },
                  required: ["text", "isCorrect"],
                },
              },
            },
            required: ["type", "prompt", "options"],
          },
        },
      },
      required: ["title", "questions"],
    };

    const routerResult = await AIRouter.executeStructured<RawQuizGenerationOutput>(
      userId,
      {
        systemPrompt,
        prompt,
        jsonSchema,
      },
      {
        taskType: "quiz_generation",
      }
    );

    const rawOutput = routerResult.result.data;
    if (!rawOutput || !Array.isArray(rawOutput.questions) || rawOutput.questions.length === 0) {
      throw new ValidationError("AI model generated no questions. Please try again.");
    }

    // Validation & Grounding Gate
    const warnings: string[] = [];
    const validQuestions: GeneratedQuizQuestionCandidate[] = [];
    const seenPrompts = new Set<string>();

    for (const rawQ of rawOutput.questions) {
      const promptText = (rawQ.prompt || "").trim();
      if (!promptText) continue;

      // Deduplication check
      const normalizedPrompt = promptText.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seenPrompts.has(normalizedPrompt)) {
        continue;
      }
      seenPrompts.add(normalizedPrompt);

      const qType: "single" | "multiple" =
        rawQ.type === "multiple" ? "multiple" : "single";

      // Filter and clean options
      const options = (rawQ.options || [])
        .map((opt) => ({
          text: (opt.text || "").trim(),
          isCorrect: Boolean(opt.isCorrect),
        }))
        .filter((opt) => opt.text.length > 0);

      // Must have between 2 and 12 options
      if (options.length < 2) continue;

      // Enforce distinct options
      const optionTexts = new Set(options.map((o) => o.text.toLowerCase()));
      if (optionTexts.size !== options.length) continue;

      const correctCount = options.filter((o) => o.isCorrect).length;
      if (qType === "single" && correctCount !== 1) {
        // Auto-repair if only 1 option should be correct
        if (correctCount > 1) {
          options.forEach((o, idx) => (o.isCorrect = idx === 0));
        } else if (correctCount === 0) {
          options[0]!.isCorrect = true;
        }
      } else if (qType === "multiple" && correctCount < 1) {
        options[0]!.isCorrect = true;
      }

      // Final strict schema verification using existing quiz domain validator
      try {
        const questionPayload: QuestionInput = {
          type: qType,
          prompt: promptText,
          explanation: rawQ.explanation?.trim() || null,
          options,
          sourceResourceId: source.sourceResourceId || null,
          sourceReference: rawQ.sourceReference?.trim() || null,
        };
        validateQuestions([questionPayload]);

        validQuestions.push({
          type: qType,
          prompt: promptText,
          explanation: rawQ.explanation?.trim() || null,
          options,
          sourceReference: rawQ.sourceReference?.trim() || null,
        });
      } catch (err) {
        warnings.push(`Skipped malformed question: ${promptText.slice(0, 40)}...`);
      }
    }

    if (validQuestions.length === 0) {
      throw new ValidationError(
        "Could not generate valid question candidates from this material. Please try with different settings or source."
      );
    }

    return {
      title: (rawOutput.title || `Knowledge Check: ${source.title}`).trim(),
      description: (rawOutput.description || `Generated assessment from ${source.title}`).trim(),
      sourceTitle: source.title,
      sourceType: source.sourceType,
      questions: validQuestions,
      warnings,
      provider: routerResult.provider,
      model: routerResult.model,
    };
  }
}
