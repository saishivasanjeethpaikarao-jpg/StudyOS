import {
  and,
  assignments,
  eq,
  getDb,
  isNull,
  studySessions,
} from "@open-sunsama/database";
import type {
  StudyPlanPreview,
  StudyPlanSuggestionInput,
  StudyPlanSuggestionResult,
} from "@open-sunsama/types";
import { NotFoundError, ValidationError } from "@open-sunsama/utils";
import { previewStudyPlan } from "../study-plans.js";
import { AIRouter } from "./router.js";

interface RawPlanSuggestionOutput {
  summary: string;
  recommendedTargetMinutes: number;
  recommendedSessionLengthMinutes: number;
  suggestedDistribution: {
    date: string;
    minutes: number;
    reason: string;
  }[];
  explanation: string;
}

export interface EnhancedStudyPlanSuggestion extends StudyPlanSuggestionResult {
  preview: StudyPlanPreview;
}

export class StudyPlannerAssistantService {
  /**
   * Generates AI-assisted planning recommendations and feeds them into the
   * canonical deterministic planning engine for preview.
   * Does NOT persist any schedule changes without explicit student confirmation.
   */
  static async suggestStudyPlan(
    userId: string,
    input: StudyPlanSuggestionInput
  ): Promise<EnhancedStudyPlanSuggestion> {
    const db = getDb();

    const [assignment] = await db
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.id, input.assignmentId),
          eq(assignments.userId, userId),
          isNull(assignments.deletedAt)
        )
      )
      .limit(1);

    if (!assignment) {
      throw new NotFoundError("Assignment", input.assignmentId);
    }

    if (assignment.status === "completed" || assignment.status === "cancelled") {
      throw new ValidationError("Completed or cancelled assignments cannot receive study plans.");
    }

    // Existing sessions for this assignment
    const existingSessions = await db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.assignmentId, input.assignmentId),
          eq(studySessions.userId, userId)
        )
      );

    const plannedMinutes = existingSessions.reduce((acc, s) => acc + (s.plannedMinutes || 0), 0);
    const completedMinutes = assignment.completedMinutes || 0;
    const estimatedMinutes = assignment.estimatedMinutes || 120;
    const remainingEstimated = Math.max(0, estimatedMinutes - completedMinutes - plannedMinutes);

    const systemPrompt = `You are an expert academic advisor and cognitive pacing specialist for StudyOS.
Help students break down assignment deadlines into sustainable, effective study sessions.
Respect cognitive load, spaced repetition, and the student's deadline.
AI provides suggestions only; the student must explicitly approve all schedule changes.`;

    const prompt = `Assignment: "${assignment.title}"
Due Date (UTC): ${assignment.dueAt.toISOString()}
Student Timezone: ${input.timezone}
Estimated Effort: ${estimatedMinutes} minutes
Completed Effort: ${completedMinutes} minutes
Already Planned in Schedule: ${plannedMinutes} minutes
Remaining Unscheduled: ${remainingEstimated} minutes
${input.notes ? `Student Notes / Preferences: "${input.notes}"` : ""}

Task:
Analyze the remaining workload and recommend an optimal study distribution.
1. Recommend the total target minutes to schedule (between 15 and 600 minutes).
2. Recommend the preferred single session length (between 25 and 90 minutes).
3. Provide a day-by-day distribution recommendation.
4. Explain clearly why this schedule balances retention, momentum, and deadline safety.`;

    const jsonSchema = {
      type: "object",
      properties: {
        summary: { type: "string" },
        recommendedTargetMinutes: { type: "integer" },
        recommendedSessionLengthMinutes: { type: "integer" },
        suggestedDistribution: {
          type: "array",
          items: {
            type: "object",
            properties: {
              date: { type: "string" },
              minutes: { type: "integer" },
              reason: { type: "string" },
            },
            required: ["date", "minutes", "reason"],
          },
        },
        explanation: { type: "string" },
      },
      required: [
        "summary",
        "recommendedTargetMinutes",
        "recommendedSessionLengthMinutes",
        "explanation",
      ],
    };

    const routerResult = await AIRouter.executeStructured<RawPlanSuggestionOutput>(
      userId,
      {
        systemPrompt,
        prompt,
        jsonSchema,
      },
      {
        taskType: "study_planning",
      }
    );

    const data = routerResult.result.data;

    // Sanitize parameters for deterministic planner
    const targetMinutes = Math.max(
      15,
      Math.min(1440, data.recommendedTargetMinutes || remainingEstimated || 120)
    );
    const preferredSessionMinutes = Math.max(
      15,
      Math.min(180, data.recommendedSessionLengthMinutes || 45)
    );

    const proposedInput = {
      assignmentId: assignment.id,
      timezone: input.timezone,
      targetMinutes,
      preferredSessionMinutes,
    };

    // Feed AI suggestion into the CANONICAL deterministic planner
    const preview = await previewStudyPlan(userId, assignment.id, proposedInput);

    return {
      summary: data.summary || "Recommended study plan distribution.",
      suggestedDistribution: data.suggestedDistribution || [],
      proposedInput,
      explanation: data.explanation || "Balanced schedule to maximize recall before deadline.",
      preview,
      provider: routerResult.provider,
      model: routerResult.model,
    };
  }
}
