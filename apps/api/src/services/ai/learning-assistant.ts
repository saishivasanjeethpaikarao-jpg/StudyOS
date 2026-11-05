import {
  and,
  assignments,
  eq,
  getDb,
  isNull,
  resources,
  studyNotes,
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

    // Attach student's live workspace state so AI tutor has complete contextual awareness
    try {
      const activeSubjects = await db
        .select({ id: subjects.id, name: subjects.name })
        .from(subjects)
        .where(and(eq(subjects.userId, userId), isNull(subjects.archivedAt)));

      const activeResources = await db
        .select({ title: resources.title, url: resources.url, type: resources.type })
        .from(resources)
        .where(eq(resources.userId, userId))
        .limit(12);

      const activeAssignments = await db
        .select({ title: assignments.title, dueAt: assignments.dueAt, status: assignments.status })
        .from(assignments)
        .where(and(eq(assignments.userId, userId), isNull(assignments.deletedAt)))
        .limit(6);

      const activeNotes = await db
        .select({ id: studyNotes.id, title: studyNotes.title })
        .from(studyNotes)
        .where(and(eq(studyNotes.userId, userId), isNull(studyNotes.deletedAt)))
        .limit(8);

      if (activeSubjects.length > 0 || activeResources.length > 0 || activeAssignments.length > 0 || activeNotes.length > 0) {
        contextHeader += `=== CURRENT STUDENT WORKSPACE STATE ===\n`;
        if (activeSubjects.length > 0) {
          contextHeader += `Enrolled Subjects: ${activeSubjects.map((s) => s.name).join(", ")}\n`;
        }
        if (activeResources.length > 0) {
          contextHeader += `FocusTube & Verified Courses (${activeResources.length} active in library):\n${activeResources.map((r) => `  • [${r.type.toUpperCase()}] ${r.title}`).join("\n")}\n`;
        }
        if (activeAssignments.length > 0) {
          contextHeader += `Active Assignments:\n${activeAssignments.map((a) => `  • ${a.title} (Status: ${a.status})`).join("\n")}\n`;
        }
        if (activeNotes.length > 0) {
          contextHeader += `Lecture Notes in Notebook:\n${activeNotes.map((n) => `  • ${n.title}`).join("\n")}\n`;
        }
        contextHeader += `=======================================\n\n`;
      }
    } catch {
      // Continue gracefully if workspace query fails
    }

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

StudyOS Identity & Creator Knowledge:
- Creator & Lead Architect: StudyOS was designed, engineered, and built by **Sai Shiva Sanjeeth** (GitHub: https://github.com/saishivasanjeethpaikarao-jpg/StudyOS, Email: saishivasanjeethpaikarao@gmail.com).
- Purpose: StudyOS is an intelligent, open-source Student Operating System bringing together distraction-free YouTube video courses (FocusTube), lecture notes and structured slide decks, assignment deadline management, calendar timeblocks, and adaptive AI knowledge checks.
- If asked "who made you", "who made studyos", or "who created this", ALWAYS answer accurately: "I am the StudyOS AI Learning Assistant. StudyOS was created and engineered by **Sai Shiva Sanjeeth** (GitHub: [saishivasanjeethpaikarao-jpg](https://github.com/saishivasanjeethpaikarao-jpg/StudyOS))."
- NEVER output placeholder brackets like "[Your Name/Team Name]" or "[Your Organization]"!
- NEVER claim you are just a generic Google LLM that cannot browse or knows nothing about StudyOS. You ARE the native StudyOS AI Learning Assistant!
- You have complete access to the student's active subjects, FocusTube video courses, assignments, and study notes through the workspace context provided below. Always speak with direct familiarity about what is in the student's FocusTube and notes library.

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
   - Draw upon attached student notes and FocusTube courses when present. Never fabricate facts.`;

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
