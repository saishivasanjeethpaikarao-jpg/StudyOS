import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiClient } from "../lib/api-client.js";
import { defineTool } from "../lib/define-tool.js";

export function registerAcademicTools(
  server: McpServer,
  client: ApiClient
): void {
  // 1. list_subjects
  defineTool(
    server,
    "list_subjects",
    "List all academic subjects for the student",
    {},
    async () => {
      const res = await client.request<Array<{ id: string; name: string; color: string }>>(
        "GET",
        "/subjects"
      );
      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to list subjects"}` }] };
      }
      const text = (res.data || [])
        .map((s) => `• ${s.name} (ID: ${s.id}, Color: ${s.color})`)
        .join("\n") || "No subjects found.";
      return { content: [{ type: "text", text }] };
    }
  );

  // 2. list_assignments
  defineTool(
    server,
    "list_assignments",
    "List active student assignments with status, due dates and estimated effort",
    {
      subjectId: z.string().uuid().optional().describe("Filter by subject ID"),
    },
    async ({ subjectId }) => {
      const res = await client.request<
        Array<{
          id: string;
          title: string;
          dueAt: string;
          estimatedMinutes: number | null;
          status: string;
          subjectId: string | null;
        }>
      >("GET", "/assignments", undefined, subjectId ? { subjectId } : undefined);

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to list assignments"}` }] };
      }

      const text = (res.data || [])
        .map(
          (a) =>
            `• [${a.status}] ${a.title}\n  ID: ${a.id}\n  Due: ${a.dueAt} | Est: ${a.estimatedMinutes ?? 0}m`
        )
        .join("\n\n") || "No assignments found.";
      return { content: [{ type: "text", text }] };
    }
  );

  // 3. get_assignment
  defineTool(
    server,
    "get_assignment",
    "Get full details of a specific assignment by ID",
    {
      id: z.string().uuid().describe("Assignment UUID"),
    },
    async ({ id }) => {
      const res = await client.request<{
        id: string;
        title: string;
        description: string | null;
        dueAt: string;
        estimatedMinutes: number | null;
        status: string;
      }>("GET", `/assignments/${id}`);

      if (!res.success || !res.data) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Assignment not found"}` }] };
      }

      const a = res.data;
      const text = [
        `Title: ${a.title}`,
        `ID: ${a.id}`,
        `Status: ${a.status}`,
        `Due At: ${a.dueAt}`,
        `Estimated Duration: ${a.estimatedMinutes ?? "N/A"} minutes`,
        `Description: ${a.description || "None"}`,
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // 4. list_study_sessions
  defineTool(
    server,
    "list_study_sessions",
    "List planned and completed study sessions",
    {
      assignmentId: z.string().uuid().optional().describe("Filter by assignment ID"),
    },
    async ({ assignmentId }) => {
      const res = await client.request<
        Array<{
          id: string;
          assignmentId: string;
          startAt: string;
          endAt: string;
          plannedMinutes: number;
          status: string;
        }>
      >("GET", "/study-sessions", undefined, assignmentId ? { assignmentId } : undefined);

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to list study sessions"}` }] };
      }

      const text = (res.data || [])
        .map(
          (s) =>
            `• [${s.status}] ${s.plannedMinutes}m session (${s.startAt} - ${s.endAt})\n  ID: ${s.id}`
        )
        .join("\n\n") || "No study sessions found.";

      return { content: [{ type: "text", text }] };
    }
  );

  // 5. get_today_schedule
  defineTool(
    server,
    "get_today_schedule",
    "Get all study sessions and academic events scheduled for today",
    {},
    async () => {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const res = await client.request<
        Array<{
          id: string;
          startAt: string;
          endAt: string;
          plannedMinutes: number;
          status: string;
        }>
      >("GET", "/study-sessions");

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to fetch schedule"}` }] };
      }

      const todaySessions = (res.data || []).filter((s) => s.startAt.startsWith(todayStr));
      const text = todaySessions.length > 0
        ? todaySessions
            .map((s) => `• [${s.status}] ${s.startAt.slice(11, 16)} - ${s.endAt.slice(11, 16)} (${s.plannedMinutes}m)`)
            .join("\n")
        : "No study sessions scheduled for today.";

      return { content: [{ type: "text", text }] };
    }
  );

  // 6. list_resources
  defineTool(
    server,
    "list_resources",
    "List learning resources, PDFs, and links",
    {},
    async () => {
      const res = await client.request<
        Array<{ id: string; type: string; title: string; filename: string | null }>
      >("GET", "/resources");

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to list resources"}` }] };
      }

      const text = (res.data || [])
        .map((r) => `• [${r.type}] ${r.title} (ID: ${r.id})`)
        .join("\n") || "No resources found.";

      return { content: [{ type: "text", text }] };
    }
  );

  // 7. search_resources
  defineTool(
    server,
    "search_resources",
    "Search study materials and resources by title query",
    {
      query: z.string().describe("Search query text"),
    },
    async ({ query }) => {
      const res = await client.request<
        Array<{ id: string; type: string; title: string; filename: string | null }>
      >("GET", "/resources");

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Search failed"}` }] };
      }

      const matched = (res.data || []).filter((r) =>
        r.title.toLowerCase().includes(query.toLowerCase())
      );

      const text = matched.length > 0
        ? matched.map((r) => `• [${r.type}] ${r.title} (ID: ${r.id})`).join("\n")
        : `No resources found matching "${query}".`;

      return { content: [{ type: "text", text }] };
    }
  );

  // 8. list_notes
  defineTool(
    server,
    "list_notes",
    "List student study notes",
    {},
    async () => {
      const res = await client.request<Array<{ id: string; title: string; updatedAt: string }>>(
        "GET",
        "/study-notes"
      );

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to list notes"}` }] };
      }

      const text = (res.data || [])
        .map((n) => `• ${n.title} (ID: ${n.id}, Updated: ${n.updatedAt})`)
        .join("\n") || "No study notes found.";

      return { content: [{ type: "text", text }] };
    }
  );

  // 9. get_study_progress
  defineTool(
    server,
    "get_study_progress",
    "Get completion and time tracking metrics for an assignment",
    {
      assignmentId: z.string().uuid().describe("Assignment ID"),
    },
    async ({ assignmentId }) => {
      const res = await client.request<{
        targetMinutes: number;
        completedMinutes: number;
        plannedRemainingMinutes: number;
        totalSessions: number;
        completedSessions: number;
      }>("GET", `/study-sessions/progress/${assignmentId}`);

      if (!res.success || !res.data) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Progress not available"}` }] };
      }

      const p = res.data;
      const text = [
        `Target: ${p.targetMinutes} minutes`,
        `Completed: ${p.completedMinutes} minutes`,
        `Planned Remaining: ${p.plannedRemainingMinutes} minutes`,
        `Sessions: ${p.completedSessions} / ${p.totalSessions} completed`,
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // 10. suggest_study_plan
  defineTool(
    server,
    "suggest_study_plan",
    "Suggest a spaced study session distribution for an assignment using AI recommendation",
    {
      assignmentId: z.string().uuid().describe("Assignment ID"),
      timezone: z.string().optional().describe("User timezone e.g. UTC, America/New_York"),
    },
    async ({ assignmentId, timezone }) => {
      const res = await client.request<{
        summary: string;
        explanation: string;
        suggestedDistribution: Array<{ date: string; minutes: number; reason: string }>;
      }>("POST", "/ai/plan/suggest", {
        assignmentId,
        timezone: timezone || "UTC",
      });

      if (!res.success || !res.data) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Could not generate plan"}` }] };
      }

      const d = res.data;
      const dist = (d.suggestedDistribution || [])
        .map((item) => `  - ${item.date}: ${item.minutes}m (${item.reason})`)
        .join("\n");

      const text = [
        `Summary: ${d.summary}`,
        `Rationale: ${d.explanation}`,
        `Suggested Sessions:\n${dist}`,
        `\nNote: This is an advisory suggestion. Call preview and confirm in StudyOS to apply to calendar.`,
      ].join("\n");

      return { content: [{ type: "text", text }] };
    }
  );

  // 11. prepare_reminder
  defineTool(
    server,
    "prepare_reminder",
    "Draft a study reminder for student review and confirmation",
    {
      title: z.string().describe("Reminder title"),
      remindAt: z.string().describe("ISO datetime when the reminder should trigger"),
      assignmentId: z.string().uuid().optional().describe("Related assignment ID"),
    },
    async ({ title, remindAt, assignmentId }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              proposal: "prepare_reminder",
              status: "draft_prepared",
              data: { title, remindAt, assignmentId },
              confirmationRequired: true,
              message: "Reminder draft prepared. Call create_reminder or confirm in StudyOS to activate.",
            }),
          },
        ],
      };
    }
  );

  // 12. prepare_assignment_update
  defineTool(
    server,
    "prepare_assignment_update",
    "Draft an assignment update for student review and confirmation",
    {
      assignmentId: z.string().uuid().describe("Assignment ID"),
      title: z.string().optional().describe("New title"),
      status: z.enum(["in_progress", "completed", "cancelled"]).optional(),
    },
    async ({ assignmentId, title, status }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              proposal: "prepare_assignment_update",
              status: "draft_prepared",
              data: { assignmentId, title, status },
              confirmationRequired: true,
              message: "Assignment update draft prepared. Call update_assignment or confirm in StudyOS to apply.",
            }),
          },
        ],
      };
    }
  );

  // 13. prepare_daily_briefing
  defineTool(
    server,
    "prepare_daily_briefing",
    "Synthesize today's academic agenda and upcoming deadlines",
    {},
    async () => {
      const now = new Date();
      return {
        content: [
          {
            type: "text",
            text: `Daily Academic Briefing for ${now.toLocaleDateString()}:\nReview active assignments and planned study blocks to maintain steady momentum.`,
          },
        ],
      };
    }
  );

  // 14. create_reminder (WRITE)
  defineTool(
    server,
    "create_reminder",
    "Create a study reminder with scheduled notification time",
    {
      title: z.string().min(1).max(300).describe("Reminder title"),
      remindAt: z.string().describe("ISO timestamp with timezone"),
      assignmentId: z.string().uuid().optional().describe("Related assignment UUID"),
    },
    async ({ title, remindAt, assignmentId }) => {
      const res = await client.request<{ id: string }>("POST", "/study-reminders", {
        title,
        remindAt,
        assignmentId,
      });

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to create reminder"}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: `✅ Reminder created successfully. ID: ${res.data?.id || "created"}`,
          },
        ],
      };
    }
  );

  // 15. update_assignment (WRITE)
  defineTool(
    server,
    "update_assignment",
    "Update assignment details (title, status, etc.)",
    {
      id: z.string().uuid().describe("Assignment UUID"),
      title: z.string().optional().describe("Updated title"),
      status: z.enum(["in_progress", "completed", "cancelled"]).optional().describe("Updated status"),
      revision: z.number().int().positive().describe("Expected assignment revision number"),
    },
    async ({ id, title, status, revision }) => {
      const res = await client.request("PATCH", `/assignments/${id}`, {
        title,
        status,
        expectedRevision: revision,
      });

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to update assignment"}` }] };
      }

      return { content: [{ type: "text", text: `✅ Assignment ${id} updated successfully.` }] };
    }
  );

  // 16. create_note (WRITE)
  defineTool(
    server,
    "create_note",
    "Create a new study note for academic organization",
    {
      title: z.string().min(1).max(300).describe("Note title"),
      content: z.string().describe("Note text content"),
    },
    async ({ title, content }) => {
      const contentJson = JSON.stringify({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: content }] }],
      });

      const res = await client.request<{ id: string }>("POST", "/study-notes", {
        title,
        contentJson,
      });

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to create note"}` }] };
      }

      return { content: [{ type: "text", text: `✅ Study note created successfully. ID: ${res.data?.id}` }] };
    }
  );

  // 17. create_study_session (WRITE)
  defineTool(
    server,
    "create_study_session",
    "Create an individual study session linked to an assignment",
    {
      assignmentId: z.string().uuid().describe("Assignment UUID"),
      startAt: z.string().describe("ISO start time"),
      endAt: z.string().describe("ISO end time"),
      plannedMinutes: z.number().int().positive().describe("Duration in minutes"),
      timezone: z.string().default("UTC").describe("Timezone"),
    },
    async ({ assignmentId, startAt, endAt, plannedMinutes, timezone }) => {
      const res = await client.request<{ id: string }>("POST", "/study-sessions", {
        assignmentId,
        startAt,
        endAt,
        plannedMinutes,
        timezone,
      });

      if (!res.success) {
        return { content: [{ type: "text", text: `Error: ${res.error?.message || "Failed to create session"}` }] };
      }

      return { content: [{ type: "text", text: `✅ Study session created. ID: ${res.data?.id}` }] };
    }
  );
}
