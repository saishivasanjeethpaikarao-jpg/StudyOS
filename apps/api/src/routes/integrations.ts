import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getDb,
  eq,
  desc,
  calendarAccounts,
  integrationAuditLogs,
} from "@open-sunsama/database";
import { auth, type AuthVariables } from "../middleware/auth.js";
import { GoogleCalendarIntegrationService } from "../services/integrations/google-calendar.js";
import { GoogleDriveIntegrationService } from "../services/integrations/google-drive.js";
import { TelegramIntegrationService } from "../services/integrations/telegram.js";
import {
  HermesBridgeService,
  ALLOWED_HERMES_WORKFLOWS,
} from "../services/integrations/hermes-bridge.js";
import { AutomationsService } from "../services/integrations/automations.js";
import type {
  IntegrationConnectionSummary,
  IntegrationProvider,
} from "@open-sunsama/types";

export const integrationsRouter = new Hono<{ Variables: AuthVariables }>();

const googleCalendarService = new GoogleCalendarIntegrationService();
const googleDriveService = new GoogleDriveIntegrationService();
const telegramService = new TelegramIntegrationService();
const hermesService = new HermesBridgeService();
const automationsService = new AutomationsService();

// ==========================================
// 1. PUBLIC WEBHOOK (Telegram)
// ==========================================
integrationsRouter.post("/telegram/webhook", async (c) => {
  const secretToken = c.req.header("x-telegram-bot-api-secret-token");
  const body = await c.req.json().catch(() => ({}));

  try {
    const result = await telegramService.handleWebhook(body, secretToken);
    return c.json({ ok: true, result });
  } catch (err) {
    return c.json(
      { ok: false, error: err instanceof Error ? err.message : "Webhook error" },
      400
    );
  }
});

// ==========================================
// AGENT AUTHENTICATED ENDPOINTS (Can use Agent Token or User Session)
// ==========================================
integrationsRouter.post("/agent/heartbeat", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer so_agent_")) {
    const token = authHeader.replace("Bearer ", "").trim();
    const agent = await hermesService.authenticateAgent(token);
    if (!agent) return c.json({ error: "Invalid agent token" }, 401);
    userId = agent.userId;
  } else {
    // Try standard session auth
    try {
      await auth(c, async () => {});
      userId = c.get("userId") || null;
    } catch {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json().catch(() => ({}));
  await hermesService.recordHeartbeat(userId, body.capabilities);
  return c.json({ success: true, timestamp: new Date().toISOString() });
});

// ==========================================
// ALL OTHER ENDPOINTS REQUIRE USER AUTH
// ==========================================
integrationsRouter.use("*", auth);

// ------------------------------------------
// Integration Status Overview
// ------------------------------------------
integrationsRouter.get("/status", async (c) => {
  const userId = c.get("userId");
  const db = getDb();

  // Check Google Calendar connection
  const [googleAccount] = await db
    .select({
      id: calendarAccounts.id,
      email: calendarAccounts.email,
      lastSyncedAt: calendarAccounts.lastSyncedAt,
      syncStatus: calendarAccounts.syncStatus,
      syncError: calendarAccounts.syncError,
    })
    .from(calendarAccounts)
    .where(eq(calendarAccounts.userId, userId))
    .limit(1);

  const telegramSettings = await telegramService.getSettings(userId);
  const agentStatus = await hermesService.getStatus(userId);

  const connections: IntegrationConnectionSummary[] = [
    {
      id: googleAccount?.id || "google_calendar",
      provider: "google_calendar",
      displayName: googleAccount ? `Google Calendar (${googleAccount.email})` : "Google Calendar",
      status: googleAccount
        ? googleAccount.syncStatus === "error"
          ? "error"
          : "active"
        : "disconnected",
      lastSyncedAt: googleAccount?.lastSyncedAt
        ? new Date(googleAccount.lastSyncedAt).toISOString()
        : null,
      lastError: googleAccount?.syncError || null,
      scopes: ["calendar.events", "calendar.readonly"],
    },
    {
      id: googleAccount?.id || "google_drive",
      provider: "google_drive",
      displayName: googleAccount ? `Google Drive (${googleAccount.email})` : "Google Drive",
      status: googleAccount ? "active" : "disconnected",
      lastSyncedAt: null,
      lastError: null,
      scopes: ["drive.readonly"],
    },
    {
      id: "telegram",
      provider: "telegram",
      displayName: telegramSettings.username
        ? `Telegram (@${telegramSettings.username})`
        : "Telegram Notifications",
      status: telegramSettings.isEnabled && telegramSettings.chatId ? "active" : "disconnected",
      lastSyncedAt: null,
      lastError: null,
      scopes: ["notifications:write"],
    },
    {
      id: "hermes",
      provider: "hermes",
      displayName: "Hermes Agent Bridge",
      status: agentStatus.isEnabled
        ? agentStatus.isOnline
          ? "active"
          : "pending"
        : "disconnected",
      lastSyncedAt: agentStatus.lastHeartbeatAt,
      lastError: null,
      scopes: agentStatus.capabilities,
      details: {
        isOnline: agentStatus.isOnline,
        allowedWorkflows: agentStatus.allowedWorkflows,
      },
    },
  ];

  return c.json({ success: true, data: connections });
});

// ------------------------------------------
// Google Calendar Integration
// ------------------------------------------
integrationsRouter.post("/google-calendar/export-session/:id", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const result = await googleCalendarService.exportStudySession(
    userId,
    sessionId,
    body.calendarId
  );

  return c.json({ success: result.success, data: result });
});

// ------------------------------------------
// Google Drive Integration
// ------------------------------------------
integrationsRouter.get("/google-drive/files", async (c) => {
  const userId = c.get("userId");
  const q = c.req.query("q");
  const pageSize = Number(c.req.query("pageSize")) || 25;

  try {
    const data = await googleDriveService.listFiles(userId, q, pageSize);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to list Google Drive files",
      },
      400
    );
  }
});

const importDriveSchema = z.object({
  fileId: z.string().min(1),
  fileName: z.string().min(1),
  link: z
    .object({
      subjectId: z.string().uuid().optional(),
      assignmentId: z.string().uuid().optional(),
      studySessionId: z.string().uuid().optional(),
    })
    .optional(),
});

integrationsRouter.post(
  "/google-drive/import",
  zValidator("json", importDriveSchema),
  async (c) => {
    const userId = c.get("userId");
    const payload = c.req.valid("json");

    try {
      const data = await googleDriveService.importFile(userId, payload);
      return c.json({ success: true, data });
    } catch (err) {
      return c.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "Failed to import file",
        },
        400
      );
    }
  }
);

// ------------------------------------------
// Telegram Integration
// ------------------------------------------
integrationsRouter.post("/telegram/link-code", async (c) => {
  const userId = c.get("userId");
  const data = await telegramService.generateLinkCode(userId);
  return c.json({ success: true, data });
});

integrationsRouter.get("/telegram/settings", async (c) => {
  const userId = c.get("userId");
  const data = await telegramService.getSettings(userId);
  return c.json({ success: true, data });
});

const updateTelegramSettingsSchema = z.object({
  isEnabled: z.boolean().optional(),
  notifySessionReminders: z.boolean().optional(),
  notifyDueDates: z.boolean().optional(),
  notifyDailyBriefing: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
});

integrationsRouter.put(
  "/telegram/settings",
  zValidator("json", updateTelegramSettingsSchema),
  async (c) => {
    const userId = c.get("userId");
    const updates = c.req.valid("json");
    const data = await telegramService.updateSettings(userId, updates);
    return c.json({ success: true, data });
  }
);

integrationsRouter.post("/telegram/disconnect", async (c) => {
  const userId = c.get("userId");
  await telegramService.disconnect(userId);
  return c.json({ success: true, message: "Telegram account unlinked" });
});

// ------------------------------------------
// Hermes Agent Bridge
// ------------------------------------------
integrationsRouter.get("/agent/status", async (c) => {
  const userId = c.get("userId");
  const data = await hermesService.getStatus(userId);
  return c.json({ success: true, data });
});

integrationsRouter.post("/agent/token", async (c) => {
  const userId = c.get("userId");
  const data = await hermesService.generateAgentToken(userId);
  return c.json({ success: true, data });
});

integrationsRouter.delete("/agent/token", async (c) => {
  const userId = c.get("userId");
  await hermesService.revokeConnection(userId);
  return c.json({ success: true, message: "Agent token revoked" });
});

const dispatchWorkflowSchema = z.object({
  workflowType: z.enum([
    "academic_workload_summary",
    "daily_briefing",
    "revision_plan_proposal",
    "resource_finder",
    "study_plan_suggestion",
  ]),
  params: z.record(z.unknown()).optional(),
});

integrationsRouter.post(
  "/agent/dispatch",
  zValidator("json", dispatchWorkflowSchema),
  async (c) => {
    const userId = c.get("userId");
    const { workflowType, params } = c.req.valid("json");

    try {
      const data = await hermesService.executeWorkflow(userId, workflowType, params);
      return c.json({ success: true, data });
    } catch (err) {
      return c.json(
        {
          success: false,
          error: err instanceof Error ? err.message : "Workflow execution failed",
        },
        400
      );
    }
  }
);

integrationsRouter.get("/agent/proposals", async (c) => {
  const userId = c.get("userId");
  const data = await hermesService.listPendingProposals(userId);
  return c.json({ success: true, data });
});

integrationsRouter.post("/agent/proposals/:id/confirm", async (c) => {
  const userId = c.get("userId");
  const proposalId = c.req.param("id");

  try {
    const data = await hermesService.confirmProposal(userId, proposalId);
    return c.json({ success: true, data });
  } catch (err) {
    return c.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Could not confirm proposal",
      },
      400
    );
  }
});

integrationsRouter.post("/agent/proposals/:id/reject", async (c) => {
  const userId = c.get("userId");
  const proposalId = c.req.param("id");

  await hermesService.rejectProposal(userId, proposalId);
  return c.json({ success: true, message: "Proposal rejected" });
});

// ------------------------------------------
// Automations
// ------------------------------------------
integrationsRouter.get("/automations", async (c) => {
  const userId = c.get("userId");
  const data = await automationsService.listAutomations(userId);
  return c.json({ success: true, data });
});

const createAutomationSchema = z.object({
  title: z.string().min(1).max(255),
  workflowType: z.enum([
    "daily_briefing",
    "assignment_due_reminder",
    "session_reminder",
    "weekly_progress_summary",
    "revision_suggestions",
    "incomplete_assignment_alert",
  ]),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().optional(),
  channels: z.array(z.enum(["in_app", "telegram", "email"])).min(1),
  isActive: z.boolean().optional(),
});

integrationsRouter.post(
  "/automations",
  zValidator("json", createAutomationSchema),
  async (c) => {
    const userId = c.get("userId");
    const input = c.req.valid("json");
    const data = await automationsService.createAutomation(userId, input);
    return c.json({ success: true, data }, 201);
  }
);

const updateAutomationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().optional(),
  channels: z.array(z.enum(["in_app", "telegram", "email"])).optional(),
  isActive: z.boolean().optional(),
});

integrationsRouter.put(
  "/automations/:id",
  zValidator("json", updateAutomationSchema),
  async (c) => {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const input = c.req.valid("json");
    const data = await automationsService.updateAutomation(userId, id, input);
    return c.json({ success: true, data });
  }
);

integrationsRouter.delete("/automations/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  await automationsService.deleteAutomation(userId, id);
  return c.json({ success: true, message: "Automation deleted" });
});

integrationsRouter.post("/automations/tick", async (c) => {
  const data = await automationsService.processScheduledAutomations();
  return c.json({ success: true, count: data.length, data });
});

integrationsRouter.post("/automations/:id/run", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await automationsService.runAutomation(userId, id);
  return c.json({ success: true, data });
});

integrationsRouter.get("/automations/:id/history", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const data = await automationsService.getExecutionLogs(userId, id);
  return c.json({ success: true, data });
});

// ------------------------------------------
// Audit Logs
// ------------------------------------------
integrationsRouter.get("/audit-logs", async (c) => {
  const userId = c.get("userId");
  const db = getDb();
  const logs = await db
    .select()
    .from(integrationAuditLogs)
    .where(eq(integrationAuditLogs.userId, userId))
    .orderBy(desc(integrationAuditLogs.createdAt))
    .limit(50);

  return c.json({ success: true, data: logs });
});
