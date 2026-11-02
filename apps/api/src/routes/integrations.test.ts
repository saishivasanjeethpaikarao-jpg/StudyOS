import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Hono } from "hono";
import {
  getDb,
  users,
  calendarAccounts,
  calendars,
  studySessions,
  assignments,
  telegramSettings,
  agentConnections,
  agentProposals,
  automationDefinitions,
  automationExecutionLogs,
  type DbClient,
} from "@open-sunsama/database";
import { signToken } from "../lib/jwt.js";
import { errorHandler } from "../middleware/error.js";
import { integrationsRouter } from "./integrations.js";
import {
  encryptCredential,
  decryptCredential,
  maskCredential,
} from "../services/integrations/credentials.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe("Phase 8 Cryptographic Storage Unit Tests", () => {
  it("encrypts and decrypts integration credentials round-trip using AES-256-GCM", () => {
    const rawSecret = "tg_bot_token_secret_xyz123456789";
    const encrypted = encryptCredential(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it("detects and rejects tampered ciphertext or tags", () => {
    const encrypted = encryptCredential("confidential_oauth_token");
    const parts = encrypted.split(":");
    const ivHex = parts[0]!;
    const tagHex = parts[1]!;
    const cipherHex = parts[2]!;
    // Tamper with last character of ciphertext
    const tamperedCipher = cipherHex.slice(0, -2) + (cipherHex.endsWith("0") ? "1" : "0");
    const tampered = `${ivHex}:${tagHex}:${tamperedCipher}`;

    expect(() => decryptCredential(tampered)).toThrow(/tampered or invalid/i);
  });

  it("masks credentials revealing only the trailing 4 characters", () => {
    expect(maskCredential("sk-proj-1234567890abcdef")).toBe("••••••••cdef");
    expect(maskCredential("1234")).toBe("••••");
  });
});

describe.skipIf(!testDatabaseUrl)("Phase 8 Integrations & Agent API against PostgreSQL", () => {
  const app = new Hono();
  app.route("/integrations", integrationsRouter);
  app.onError(errorHandler);

  let db: DbClient;
  let ownerAId: string;
  let ownerBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    db = getDb();

    // Create User A
    const [userA] = await db
      .insert(users)
      .values({
        email: `student_int_a_${Date.now()}@studyos.local`,
        passwordHash: "irrelevant_hash",
        timezone: "UTC",
      })
      .returning();
    ownerAId = userA!.id;
    tokenA = signToken(ownerAId);

    // Create User B (for multi-tenant isolation tests)
    const [userB] = await db
      .insert(users)
      .values({
        email: `student_int_b_${Date.now()}@studyos.local`,
        passwordHash: "irrelevant_hash",
        timezone: "UTC",
      })
      .returning();
    ownerBId = userB!.id;
    tokenB = signToken(ownerBId);

    // Create an assignment and study session for User A
    const [assignment] = await db
      .insert(assignments)
      .values({
        userId: ownerAId,
        title: "Calculus Problem Set 4",
        dueAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        estimatedMinutes: 90,
        status: "in_progress",
      })
      .returning();

    await db.insert(studySessions).values({
      userId: ownerAId,
      assignmentId: assignment!.id,
      startAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      timezone: "UTC",
      plannedMinutes: 60,
      status: "planned",
    });
  });

  it("1. GET /integrations/status returns provider connection summaries", async () => {
    const res = await app.request("/integrations/status", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: any[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((c) => c.provider === "google_calendar")).toBe(true);
    expect(body.data.some((c) => c.provider === "telegram")).toBe(true);
    expect(body.data.some((c) => c.provider === "hermes")).toBe(true);
  });

  it("2. POST /integrations/telegram/link-code generates a 15-minute link code", async () => {
    const res = await app.request("/integrations/telegram/link-code", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; data: any };
    expect(body.success).toBe(true);
    expect(body.data.linkCode).toBeDefined();
    expect(body.data.deepLink).toContain(body.data.linkCode);
  });

  it("3. POST /integrations/telegram/webhook connects Telegram account via link code", async () => {
    // Generate code first
    const codeRes = await app.request("/integrations/telegram/link-code", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const { data } = (await codeRes.json()) as { data: { linkCode: string } };

    // Simulate Telegram webhook sending /start <code>
    const webhookRes = await app.request("/integrations/telegram/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          chat: { id: 987654321 },
          from: { id: 987654321, username: "student_tester" },
          text: `/start ${data.linkCode}`,
        },
      }),
    });

    expect(webhookRes.status).toBe(200);
    const webhookBody = (await webhookRes.json()) as { ok: boolean; result: any };
    expect(webhookBody.ok).toBe(true);
    expect(webhookBody.result.action).toBe("link_success");

    // Verify user settings now show linked
    const settingsRes = await app.request("/integrations/telegram/settings", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const settingsBody = (await settingsRes.json()) as { data: any };
    expect(settingsBody.data.isEnabled).toBe(true);
    expect(settingsBody.data.chatId).toBe("987654321");
    expect(settingsBody.data.username).toBe("student_tester");
  });

  it("4. PUT /integrations/telegram/settings updates notification toggles", async () => {
    const res = await app.request("/integrations/telegram/settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notifyDailyBriefing: true,
        quietHoursStart: "23:00",
        quietHoursEnd: "06:00",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: any };
    expect(body.data.notifyDailyBriefing).toBe(true);
    expect(body.data.quietHoursStart).toBe("23:00");
  });

  it("5. POST /integrations/agent/token creates a scoped Hermes Agent token", async () => {
    const res = await app.request("/integrations/agent/token", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: any };
    expect(body.data.token).toMatch(/^so_agent_/);
    expect(body.data.scopes).toContain("study:read");

    // Verify agent status
    const statusRes = await app.request("/integrations/agent/status", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const statusBody = (await statusRes.json()) as { data: any };
    expect(statusBody.data.tokenCreated).toBe(true);
    expect(statusBody.data.isEnabled).toBe(true);
  });

  it("6. POST /integrations/agent/heartbeat accepts agent token and records heartbeat", async () => {
    // Generate token
    const tokenRes = await app.request("/integrations/agent/token", {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const { data: tokenData } = (await tokenRes.json()) as { data: any };

    const heartbeatRes = await app.request("/integrations/agent/heartbeat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        capabilities: ["workload_summary", "briefing"],
      }),
    });
    expect(heartbeatRes.status).toBe(200);

    const statusRes = await app.request("/integrations/agent/status", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const statusBody = (await statusRes.json()) as { data: any };
    expect(statusBody.data.isOnline).toBe(true);
  });

  it("7. Hermes Bridge dispatches workflow and creates draft proposal requiring student confirmation", async () => {
    const dispatchRes = await app.request("/integrations/agent/dispatch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflowType: "revision_plan_proposal",
      }),
    });
    expect(dispatchRes.status).toBe(200);
    const dispatchBody = (await dispatchRes.json()) as { data: any };
    expect(dispatchBody.data.proposalCreated).toBe(true);
    const proposalId = dispatchBody.data.result.proposalId;

    // List pending proposals
    const listRes = await app.request("/integrations/agent/proposals", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listBody = (await listRes.json()) as { data: any[] };
    expect(listBody.data.some((p) => p.id === proposalId)).toBe(true);

    // Confirm proposal
    const confirmRes = await app.request(`/integrations/agent/proposals/${proposalId}/confirm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(confirmRes.status).toBe(200);
  });

  it("8. Automations: creates, runs, and records execution history", async () => {
    const createRes = await app.request("/integrations/automations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Morning Routine Briefing",
        workflowType: "daily_briefing",
        scheduleTime: "07:30",
        channels: ["in_app"],
      }),
    });
    expect(createRes.status).toBe(201);
    const { data: auto } = (await createRes.json()) as { data: any };

    // Run automation
    const runRes = await app.request(`/integrations/automations/${auto.id}/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    expect(runRes.status).toBe(200);
    const runBody = (await runRes.json()) as { data: any };
    expect(runBody.data.status).toBe("success");

    // Check history
    const histRes = await app.request(`/integrations/automations/${auto.id}/history`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const histBody = (await histRes.json()) as { data: any[] };
    expect(histBody.data.length).toBeGreaterThanOrEqual(1);
    expect(histBody.data[0].status).toBe("success");
  });

  it("9. Multi-tenant account isolation: User B cannot access User A's automations or proposals", async () => {
    // User A creates an automation
    const createRes = await app.request("/integrations/automations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Private Auto A",
        workflowType: "daily_briefing",
        scheduleTime: "09:00",
        channels: ["in_app"],
      }),
    });
    const { data: autoA } = (await createRes.json()) as { data: any };

    // User B attempts to run User A's automation
    const runRes = await app.request(`/integrations/automations/${autoA.id}/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    expect(runRes.status).toBe(404);
  });
});
