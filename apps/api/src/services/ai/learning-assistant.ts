import {
  and,
  assignments,
  eq,
  getDb,
  isNull,
  subjects,
} from "@open-sunsama/database";
import type {
  LearningAssistantCitation,
  LearningAssistantRequest,
  LearningAssistantResponse,
} from "@open-sunsama/types";
import { ingestAcademicSource } from "./ingestion/index.js";
import { AIRouter } from "./router.js";

export class LearningAssistantService {
  /**
   * Conversational contextual tutor assisting students with concepts, summaries,
   * step-by-step solutions, and practice drills.
   */
  static async processAssistantRequest(
    userId: string,
    req: LearningAssistantRequest
  ): Promise<LearningAssistantResponse> {
    const db = getDb();
    let contextHeader = "";
    const citations: LearningAssistantCitation[] = [];
    let isGrounded = false;

    // Attach subject context if present
    if (req.context?.subjectId) {
      const [subj] = await db
        .select()
        .from(subjects)
        .where(
          and(
            eq(subjects.id, req.context.subjectId),
            eq(subjects.userId, userId),
            isNull(subjects.archivedAt)
          )
        )
        .limit(1);
      if (subj) {
        contextHeader += `Subject: ${subj.name}\n`;
      }
    }

    // Attach assignment context if present
    if (req.context?.assignmentId) {
      const [asgn] = await db
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.id, req.context.assignmentId),
            eq(assignments.userId, userId),
            isNull(assignments.deletedAt)
          )
        )
        .limit(1);
      if (asgn) {
        contextHeader += `Assignment: ${asgn.title} (Due: ${asgn.dueAt.toISOString()})\n`;
      }
    }

    // Attach resource context if present
    if (req.context?.resourceId) {
      try {
        const source = await ingestAcademicSource(userId, {
          sourceType: "resource",
          resourceId: req.context.resourceId,
        });
        const snippet = source.fullText.slice(0, 15_000);
        contextHeader += `Attached Resource (${source.referenceSummary}):\n"""\n${snippet}\n"""\n`;
        citations.push({
          sourceType: "resource",
          title: source.title,
          reference: source.referenceSummary,
          snippet: snippet.slice(0, 200) + "...",
        });
        isGrounded = true;
      } catch {
        // Skip resource text if extraction fails
      }
    }

    // Attach note context if present
    if (req.context?.noteId) {
      try {
        const source = await ingestAcademicSource(userId, {
          sourceType: "note",
          noteId: req.context.noteId,
        });
        const snippet = source.fullText.slice(0, 15_000);
        contextHeader += `Attached Note (${source.title}):\n"""\n${snippet}\n"""\n`;
        citations.push({
          sourceType: "note",
          title: source.title,
          reference: `Note: ${source.title}`,
          snippet: snippet.slice(0, 200) + "...",
        });
        isGrounded = true;
      } catch {
        // Skip note text if unavailable
      }
    }

    if (req.context?.selectedText) {
      contextHeader += `Selected Study Excerpt:\n"""\n${req.context.selectedText.slice(0, 4000)}\n"""\n`;
      isGrounded = true;
    }

    const systemPrompt = `You are the StudyOS AI Learning Assistant — an expert, supportive academic tutor.
Your mission is to help students learn deeply, understand challenging concepts, and prepare for exams.

Core Guidelines:
1. Grounding: When source materials, notes, or excerpts are attached, draw primarily upon them. If citing facts, reference the section/page/timestamp if present.
2. Distinction: Clearly distinguish between facts explicitly supported by the student's material versus general background educational knowledge.
3. Anti-Hallucination: Never fabricate page numbers, timestamps, citations, or formulas not in the text. If a topic is not in the material, state clearly: "This topic is not covered in your attached notes, but conceptually...".
4. Tone: Rigorous, encouraging, clear, formatted in clean Markdown with KaTeX math when appropriate.`;

    let actionInstruction = "";
    switch (req.action) {
      case "explain":
        actionInstruction = "Explain this concept in simple, accessible language with an intuitive real-world analogy and key points.";
        break;
      case "summarize":
        actionInstruction = "Provide an executive summary of the attached study material, highlighting core arguments, formulas, and takeaways.";
        break;
      case "revision_notes":
        actionInstruction = "Generate high-yield revision notes / cheatsheet with key definitions, formulas, and common exam pitfalls.";
        break;
      case "practice":
        actionInstruction = "Create 3 quick practice questions (with step-by-step solution breakdowns) to test understanding of this topic.";
        break;
      default:
        actionInstruction = "Answer the student's question accurately and helpfully.";
        break;
    }

    const promptParts: string[] = [];
    if (contextHeader.trim()) {
      promptParts.push(`Context Information:\n${contextHeader.trim()}`);
    }
    if (actionInstruction) {
      promptParts.push(`Directive: ${actionInstruction}`);
    }

    if (Array.isArray(req.history) && req.history.length > 0) {
      const recentHistory = req.history.slice(-4).map((h) => `${h.role === "user" ? "Student" : "Assistant"}: ${h.content}`).join("\n");
      promptParts.push(`Recent Conversation:\n${recentHistory}`);
    }

    promptParts.push(`Student Request: ${req.message}`);

    const fullPrompt = promptParts.join("\n\n");

    const routerResult = await AIRouter.executeText(
      userId,
      {
        systemPrompt,
        prompt: fullPrompt,
        temperature: 0.3,
      },
      {
        taskType: "learning_assistant",
      }
    );

    return {
      content: routerResult.result.text.trim(),
      grounded: isGrounded,
      citations,
      provider: routerResult.provider,
      model: routerResult.model,
    };
  }
}
