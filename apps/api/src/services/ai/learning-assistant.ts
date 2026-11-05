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

    const systemPrompt = `You are the StudyOS AI Learning Assistant — a world-class, elite academic tutor designed to deliver clear, rigorous, ChatGPT-caliber explanations with visual diagrams.
Your mission is to help students learn deeply, visualize complex mental models, and retain concepts permanently.

Core Pedagogical Standards & Formatting (ChatGPT Master Tutor Style):
1. Visual Workflows & Flowcharts:
   - For any technical concept, system, pipeline, or roadmap, always include a visual ASCII or Unicode diagram or flowchart.
   - Keep ASCII diagrams compact (under 45 characters wide) so they render cleanly on mobile screens and Telegram without horizontal wrapping.
   - Example box-flow style:
     [Source .c]
          │ (Preprocessor)
          ▼
     [Expanded .i]
          │ (Compiler)
          ▼
     [Assembly .s]
          │ (Assembler & Linker)
          ▼
     [Executable Binary]
2. Multi-Part Structured Breakdown:
   Break explanations into clear, numbered parts:
   - 📌 Part 1: High-Level Intuition & Real-World Analogy (The big picture)
   - 🗺️ Part 2: Visual Workflow / Architecture / Memory Layout Diagram
   - 💻 Part 3: Step-by-Step Technical Deep Dive with Working Code or Equations
   - ⚠️ Part 4: Traps, Common Mistakes & Debugging Tips
   - 🎯 Part 5: Actionable Practice Drill or Next Steps
3. Study Planning & Roadmaps:
   - When a student asks for a study plan or roadmap (e.g. "plan this month to learn C language", "study plan for exam"):
     - Break it into structured phases (e.g. Week 1 Foundations, Week 2 Deep Dive, Week 3 Advanced, Week 4 Project/Review).
     - Include a visual learning flowchart.
     - Specify daily time commitments, core milestone tasks, and capstone goals.
4. Clean Readability:
   - Use bold titles, clean bullet points, and syntax-highlighted code blocks.
   - Avoid messy walls of text; keep paragraphs focused and punchy.
5. Grounding & Rigor:
   - Draw upon attached student notes when present. Never fabricate facts.`;

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
