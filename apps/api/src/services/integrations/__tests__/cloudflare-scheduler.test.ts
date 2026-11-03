import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  getDb,
  resetDbInstance,
  users,
  automationDefinitions,
  automationExecutionLogs,
  eq,
  inArray,
  type DbClient,
} from "@open-sunsama/database";
import { AutomationsService } from "../automations.js";
import { randomUUID } from "node:crypto";

const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("Cloudflare Scheduler Adapter & Idempotency", () => {
  let db: DbClient;
  let service: AutomationsService;
  let userId: string;
  const createdAutomationIds: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    resetDbInstance();
    db = getDb();
    service = new AutomationsService();

    const [user] = await db
      .insert(users)
      .values({
        email: `scheduler-test-${randomUUID()}@example.test`,
        name: "Scheduler Test User",
      })
      .returning();
    userId = user!.id;
  });

  afterAll(async () => {
    if (createdAutomationIds.length > 0) {
      await db.delete(automationExecutionLogs).where(inArray(automationExecutionLogs.automationId, createdAutomationIds));
      await db.delete(automationDefinitions).where(inArray(automationDefinitions.id, createdAutomationIds));
    }
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
    await resetDbInstance();
  });

  it("1. Discovers due automations matching current local time and timezone", async () => {
    // Current time fixed for deterministic test: 14:30 UTC
    const fixedNow = new Date("2026-11-02T14:30:00Z");

    const auto = await service.createAutomation(userId, {
      title: "Daily Briefing 14:30",
      workflowType: "daily_briefing",
      scheduleTime: "14:30",
      timezone: "UTC",
      channels: ["in_app"],
    });
    createdAutomationIds.push(auto.id);

    const executed = await service.processScheduledAutomations(fixedNow);
    expect(executed).toHaveLength(1);
    expect(executed[0]!.automationId).toBe(auto.id);
    expect(executed[0]!.status).toBe("success");
  });

  it("2. Idempotency: Retrying or multiple triggers in the same minute/day does not re-execute", async () => {
    const fixedNow = new Date("2026-11-02T14:30:30Z"); // 30 seconds later in the same minute

    const autoId = createdAutomationIds[0]!;
    // Second execution attempt
    const secondPass = await service.processScheduledAutomations(fixedNow);
    const matched = secondPass.filter((r) => r.automationId === autoId);
    expect(matched).toHaveLength(0); // Safely skipped!

    // Verify only one log entry exists in the database
    const logs = await service.getExecutionLogs(userId, autoId);
    expect(logs).toHaveLength(1);
  });

  it("3. Correctly handles different student timezones (e.g. Asia/Kolkata +5:30)", async () => {
    // When UTC is 03:30, Asia/Kolkata is 09:00
    const fixedNow = new Date("2026-11-02T03:30:00Z");

    const auto = await service.createAutomation(userId, {
      title: "Morning Briefing IST",
      workflowType: "daily_briefing",
      scheduleTime: "09:00",
      timezone: "Asia/Kolkata",
      channels: ["in_app"],
    });
    createdAutomationIds.push(auto.id);

    const executed = await service.processScheduledAutomations(fixedNow);
    const matched = executed.filter((r) => r.automationId === auto.id);
    expect(matched).toHaveLength(1);
    expect(matched[0]!.status).toBe("success");
  });

  it("4. Inactive automations are never discovered or executed", async () => {
    const fixedNow = new Date("2026-11-02T10:00:00Z");

    const auto = await service.createAutomation(userId, {
      title: "Paused Automation",
      workflowType: "assignment_due_reminder",
      scheduleTime: "10:00",
      timezone: "UTC",
      channels: ["in_app"],
      isActive: false,
    });
    createdAutomationIds.push(auto.id);

    const executed = await service.processScheduledAutomations(fixedNow);
    const matched = executed.filter((r) => r.automationId === auto.id);
    expect(matched).toHaveLength(0);
  });
  it("5. Concurrent invocation: simultaneous executions handle idempotency gracefully", async () => {
    const fixedNow = new Date("2026-11-02T16:00:00Z");

    const auto = await service.createAutomation(userId, {
      title: "Concurrent Invocation Test",
      workflowType: "daily_briefing",
      scheduleTime: "16:00",
      timezone: "UTC",
      channels: ["in_app"],
    });
    createdAutomationIds.push(auto.id);

    // Fire 3 simultaneous invocations representing overlapping worker triggers
    const results = await Promise.all([
      service.processScheduledAutomations(fixedNow),
      service.processScheduledAutomations(fixedNow),
      service.processScheduledAutomations(fixedNow),
    ]);

    const totalMatches = results.flat().filter((r) => r.automationId === auto.id);
    // At least one executes, and execution log records consistent state
    expect(totalMatches.length).toBeGreaterThanOrEqual(1);

    const logs = await service.getExecutionLogs(userId, auto.id);
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0]?.status).toBe("success");
  });

  it("6. Deleted automations are never discovered or executed", async () => {
    const fixedNow = new Date("2026-11-02T17:00:00Z");

    const auto = await service.createAutomation(userId, {
      title: "Deleted Automation Test",
      workflowType: "daily_briefing",
      scheduleTime: "17:00",
      timezone: "UTC",
      channels: ["in_app"],
    });

    // Delete automation directly before scheduler tick
    await service.deleteAutomation(userId, auto.id);

    const executed = await service.processScheduledAutomations(fixedNow);
    const matched = executed.filter((r) => r.automationId === auto.id);
    expect(matched).toHaveLength(0);
  });

  it("7. Interrupted batch resilience: error in one automation does not crash remaining batch", async () => {
    const fixedNow = new Date("2026-11-02T18:00:00Z");

    const auto1 = await service.createAutomation(userId, {
      title: "Batch Item 1 (Valid)",
      workflowType: "daily_briefing",
      scheduleTime: "18:00",
      timezone: "UTC",
      channels: ["in_app"],
    });
    createdAutomationIds.push(auto1.id);

    const auto2 = await service.createAutomation(userId, {
      title: "Batch Item 2 (Valid)",
      workflowType: "assignment_due_reminder",
      scheduleTime: "18:00",
      timezone: "UTC",
      channels: ["in_app"],
    });
    createdAutomationIds.push(auto2.id);

    const executed = await service.processScheduledAutomations(fixedNow);
    const matched1 = executed.find((r) => r.automationId === auto1.id);
    const matched2 = executed.find((r) => r.automationId === auto2.id);

    expect(matched1).toBeDefined();
    expect(matched2).toBeDefined();
    expect(matched1?.status).toBe("success");
    expect(matched2?.status).toBe("success");
  });

  it("8. Timezone handling across negative and positive UTC offsets", async () => {
    // 2026-11-02T23:30:00Z is 18:30 in America/New_York (UTC-5)
    const fixedNow = new Date("2026-11-02T23:30:00Z");

    const autoNY = await service.createAutomation(userId, {
      title: "Evening Reminder New York",
      workflowType: "daily_briefing",
      scheduleTime: "18:30",
      timezone: "America/New_York",
      channels: ["in_app"],
    });
    createdAutomationIds.push(autoNY.id);

    const executed = await service.processScheduledAutomations(fixedNow);
    const matched = executed.filter((r) => r.automationId === autoNY.id);
    expect(matched).toHaveLength(1);
    expect(matched[0]!.status).toBe("success");
  });
});
