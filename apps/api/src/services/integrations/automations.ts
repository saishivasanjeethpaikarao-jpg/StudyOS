import {
  getDb,
  eq,
  and,
  desc,
  studySessions,
  assignments,
  automationDefinitions,
  automationExecutionLogs,
} from "@open-sunsama/database";
import { NotFoundError } from "@open-sunsama/utils";
import { TelegramIntegrationService } from "./telegram.js";
import type {
  AutomationDefinition,
  CreateAutomationInput,
  UpdateAutomationInput,
  AutomationExecutionLog,
} from "@open-sunsama/types";

export class AutomationsService {
  private telegramService = new TelegramIntegrationService();

  async listAutomations(userId: string): Promise<AutomationDefinition[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(automationDefinitions)
      .where(eq(automationDefinitions.userId, userId))
      .orderBy(desc(automationDefinitions.createdAt));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      workflowType: r.workflowType as any,
      scheduleTime: r.scheduleTime,
      timezone: r.timezone,
      channels: r.channels as any,
      isActive: r.isActive,
      lastRunAt: r.lastRunAt ? new Date(r.lastRunAt).toISOString() : null,
      nextRunAt: r.nextRunAt ? new Date(r.nextRunAt).toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async createAutomation(
    userId: string,
    input: CreateAutomationInput
  ): Promise<AutomationDefinition> {
    const db = getDb();
    const [row] = await db
      .insert(automationDefinitions)
      .values({
        userId,
        title: input.title,
        workflowType: input.workflowType,
        scheduleTime: input.scheduleTime,
        timezone: input.timezone || "UTC",
        channels: input.channels,
        isActive: input.isActive ?? true,
      })
      .returning();

    if (!row) throw new Error("Failed to create automation");

    return {
      id: row.id,
      title: row.title,
      workflowType: row.workflowType as any,
      scheduleTime: row.scheduleTime,
      timezone: row.timezone,
      channels: row.channels as any,
      isActive: row.isActive,
      lastRunAt: null,
      nextRunAt: null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateAutomation(
    userId: string,
    id: string,
    input: UpdateAutomationInput
  ): Promise<AutomationDefinition> {
    const db = getDb();
    const [row] = await db
      .update(automationDefinitions)
      .set({
        ...(input.title ? { title: input.title } : {}),
        ...(input.scheduleTime ? { scheduleTime: input.scheduleTime } : {}),
        ...(input.timezone ? { timezone: input.timezone } : {}),
        ...(input.channels ? { channels: input.channels } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(automationDefinitions.id, id), eq(automationDefinitions.userId, userId)))
      .returning();

    if (!row) throw new Error("Automation not found");

    return {
      id: row.id,
      title: row.title,
      workflowType: row.workflowType as any,
      scheduleTime: row.scheduleTime,
      timezone: row.timezone,
      channels: row.channels as any,
      isActive: row.isActive,
      lastRunAt: row.lastRunAt ? new Date(row.lastRunAt).toISOString() : null,
      nextRunAt: row.nextRunAt ? new Date(row.nextRunAt).toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async deleteAutomation(userId: string, id: string): Promise<void> {
    const db = getDb();
    await db
      .delete(automationDefinitions)
      .where(and(eq(automationDefinitions.id, id), eq(automationDefinitions.userId, userId)));
  }

  /**
   * Run an automation manually or via scheduler.
   */
  async runAutomation(
    userId: string,
    automationId: string
  ): Promise<{ status: "success" | "failed" | "skipped"; summary: string }> {
    const db = getDb();
    const [automation] = await db
      .select()
      .from(automationDefinitions)
      .where(
        and(
          eq(automationDefinitions.id, automationId),
          eq(automationDefinitions.userId, userId)
        )
      )
      .limit(1);

    if (!automation) throw new NotFoundError("Automation definition not found");
    if (!automation.isActive) {
      return { status: "skipped", summary: "Automation is paused" };
    }

    let summary = "";
    let details: Record<string, unknown> = {};

    try {
      if (automation.workflowType === "daily_briefing") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const sessions = await db
          .select({
            id: studySessions.id,
            plannedMinutes: studySessions.plannedMinutes,
            startAt: studySessions.startAt,
            title: assignments.title,
          })
          .from(studySessions)
          .innerJoin(assignments, eq(studySessions.assignmentId, assignments.id))
          .where(
            and(
              eq(studySessions.userId, userId),
              eq(studySessions.status, "planned")
            )
          );

        summary = `Daily Briefing: ${sessions.length} study sessions planned for today.`;
        details = { sessionCount: sessions.length };

        // Dispatch to channels
        if (automation.channels.includes("telegram")) {
          await this.telegramService.sendNotification(userId, summary, "briefing");
        }
      } else if (automation.workflowType === "assignment_due_reminder") {
        const dueSoon = await db
          .select({ id: assignments.id, title: assignments.title })
          .from(assignments)
          .where(
            and(
              eq(assignments.userId, userId),
              eq(assignments.status, "in_progress")
            )
          )
          .limit(5);

        summary = `Assignment Reminder: You have ${dueSoon.length} pending assignments.`;
        details = { pendingCount: dueSoon.length };

        if (automation.channels.includes("telegram")) {
          await this.telegramService.sendNotification(userId, summary, "due_date");
        }
      } else {
        summary = `Executed ${automation.workflowType} automation successfully.`;
      }

      await db.insert(automationExecutionLogs).values({
        automationId: automation.id,
        userId,
        status: "success",
        summary,
        details,
      });

      await db
        .update(automationDefinitions)
        .set({
          lastRunAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(automationDefinitions.id, automation.id));

      return { status: "success", summary };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Execution failed";
      await db.insert(automationExecutionLogs).values({
        automationId: automation.id,
        userId,
        status: "failed",
        summary: "Execution failed with error",
        errorMessage: errorMsg,
      });

      return { status: "failed", summary: errorMsg };
    }
  }

  async getExecutionLogs(
    userId: string,
    automationId: string
  ): Promise<AutomationExecutionLog[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(automationExecutionLogs)
      .where(
        and(
          eq(automationExecutionLogs.automationId, automationId),
          eq(automationExecutionLogs.userId, userId)
        )
      )
      .orderBy(desc(automationExecutionLogs.executedAt))
      .limit(20);

    return rows.map((r) => ({
      id: r.id,
      automationId: r.automationId,
      status: r.status as any,
      summary: r.summary,
      details: r.details || {},
      errorMessage: r.errorMessage,
      executedAt: r.executedAt.toISOString(),
    }));
  }
}
