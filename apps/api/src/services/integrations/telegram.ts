import crypto from "node:crypto";
import {
  getDb,
  eq,
  and,
  gte,
  lte,
  ne,
  isNull,
  users,
  tasks,
  subjects,
  agentProposals,
  studySessions,
  assignments,
  timeBlocks,
  telegramLinkRequests,
  telegramSettings,
  integrationAuditLogs,
} from "@open-sunsama/database";
import { HermesBridgeService } from "./hermes-bridge.js";
import { LearningAssistantService } from "../ai/learning-assistant.js";
import type { TelegramLinkResponse, TelegramSettings } from "@open-sunsama/types";

const TELEGRAM_API = "https://api.telegram.org";

export class TelegramIntegrationService {
  private getBotToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || "";
  }

  private getBotUsername(): string {
    return process.env.TELEGRAM_BOT_USERNAME || "StudyOS_Bot";
  }

  /**
   * Generate a secure, short-lived (15 min) linking code.
   */
  async generateLinkCode(userId: string): Promise<TelegramLinkResponse> {
    const db = getDb();
    const linkCode = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.insert(telegramLinkRequests).values({
      userId,
      linkCode,
      status: "pending",
      expiresAt,
    });

    const botUsername = this.getBotUsername();
    const deepLink = `https://t.me/${botUsername}?start=${linkCode}`;

    return {
      linkCode,
      botUsername,
      deepLink,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Get user's Telegram settings.
   */
  async getSettings(userId: string): Promise<TelegramSettings> {
    const db = getDb();
    const [settings] = await db
      .select()
      .from(telegramSettings)
      .where(eq(telegramSettings.userId, userId))
      .limit(1);

    if (!settings) {
      return {
        isEnabled: false,
        chatId: null,
        username: null,
        notifySessionReminders: true,
        notifyDueDates: true,
        notifyDailyBriefing: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      };
    }

    return {
      isEnabled: settings.isEnabled,
      chatId: settings.chatId,
      username: settings.username,
      notifySessionReminders: settings.notifySessionReminders,
      notifyDueDates: settings.notifyDueDates,
      notifyDailyBriefing: settings.notifyDailyBriefing,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
    };
  }

  /**
   * Update user's Telegram settings.
   */
  async updateSettings(
    userId: string,
    updates: Partial<TelegramSettings>
  ): Promise<TelegramSettings> {
    const db = getDb();
    const existing = await this.getSettings(userId);

    const valuesToSet = {
      ...(updates.isEnabled !== undefined ? { isEnabled: updates.isEnabled } : {}),
      ...(updates.notifySessionReminders !== undefined
        ? { notifySessionReminders: updates.notifySessionReminders }
        : {}),
      ...(updates.notifyDueDates !== undefined
        ? { notifyDueDates: updates.notifyDueDates }
        : {}),
      ...(updates.notifyDailyBriefing !== undefined
        ? { notifyDailyBriefing: updates.notifyDailyBriefing }
        : {}),
      ...(updates.quietHoursStart !== undefined
        ? { quietHoursStart: updates.quietHoursStart }
        : {}),
      ...(updates.quietHoursEnd !== undefined
        ? { quietHoursEnd: updates.quietHoursEnd }
        : {}),
      updatedAt: new Date(),
    };

    const [row] = await db
      .insert(telegramSettings)
      .values({
        userId,
        ...valuesToSet,
      })
      .onConflictDoUpdate({
        target: telegramSettings.userId,
        set: valuesToSet,
      })
      .returning();

    if (!row) throw new Error("Failed to update Telegram settings");

    return {
      isEnabled: row.isEnabled,
      chatId: row.chatId,
      username: row.username,
      notifySessionReminders: row.notifySessionReminders,
      notifyDueDates: row.notifyDueDates,
      notifyDailyBriefing: row.notifyDailyBriefing,
      quietHoursStart: row.quietHoursStart,
      quietHoursEnd: row.quietHoursEnd,
    };
  }

  /**
   * Disconnect Telegram account.
   */
  async disconnect(userId: string): Promise<void> {
    const db = getDb();
    await db
      .update(telegramSettings)
      .set({
        isEnabled: false,
        chatId: null,
        username: null,
        updatedAt: new Date(),
      })
      .where(eq(telegramSettings.userId, userId));

    await db.insert(integrationAuditLogs).values({
      userId,
      integrationType: "telegram",
      action: "disconnect",
      status: "success",
    });
  }

  /**
   * Process incoming Telegram webhook updates.
   */
  async handleWebhook(
    update: Record<string, any>,
    secretToken?: string
  ): Promise<{ handled: boolean; action?: string }> {
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret && secretToken !== expectedSecret) {
      throw new Error("Invalid Telegram webhook secret token");
    }

    const message = update?.message;
    if (!message || !message.text) {
      return { handled: false };
    }

    const chatId = String(message.chat.id);
    const text = (message.text as string).trim();
    const fromUsername = message.from?.username || message.from?.first_name || "Student";

    // Handle /start [code]
    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const code = parts[1]?.trim();

      if (!code) {
        await this.sendMessageToChat(
          chatId,
          "👋 Welcome to StudyOS!\n\nTo link your account, open StudyOS Settings → Integrations → Connect Telegram and use your personalized link."
        );
        return { handled: true, action: "welcome" };
      }

      // Check code in database
      const db = getDb();
      const [linkReq] = await db
        .select()
        .from(telegramLinkRequests)
        .where(
          and(
            eq(telegramLinkRequests.linkCode, code),
            eq(telegramLinkRequests.status, "pending"),
            gte(telegramLinkRequests.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!linkReq) {
        await this.sendMessageToChat(
          chatId,
          "❌ This linking code is invalid or has expired. Please generate a new code from StudyOS Settings."
        );
        return { handled: true, action: "link_failed" };
      }

      // Disassociate any other user's telegram settings linked to this chatId
      await db
        .update(telegramSettings)
        .set({
          chatId: null,
          isEnabled: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(telegramSettings.chatId, chatId),
            ne(telegramSettings.userId, linkReq.userId)
          )
        );

      // Mark request as consumed and save chatId
      await db
        .update(telegramLinkRequests)
        .set({
          status: "consumed",
          telegramChatId: chatId,
          telegramUsername: fromUsername,
        })
        .where(eq(telegramLinkRequests.id, linkReq.id));

      await db
        .insert(telegramSettings)
        .values({
          userId: linkReq.userId,
          chatId,
          username: fromUsername,
          isEnabled: true,
          notifySessionReminders: true,
          notifyDueDates: true,
          notifyDailyBriefing: false,
        })
        .onConflictDoUpdate({
          target: telegramSettings.userId,
          set: {
            chatId,
            username: fromUsername,
            isEnabled: true,
            updatedAt: new Date(),
          },
        });

      await db.insert(integrationAuditLogs).values({
        userId: linkReq.userId,
        integrationType: "telegram",
        action: "link_account",
        status: "success",
        details: { chatId, username: fromUsername },
      });

      await this.sendMessageToChat(
        chatId,
        `✅ Success! Your Telegram account is now connected to StudyOS.\n\nYou will receive your study reminders and AI assistance here.\n\nCommands:\n• /today - Today's schedule & focus sessions\n• /assignments - Upcoming deadlines\n• /task <title> - Add task to your board\n• /briefing - Daily workload briefing\n• /subjects - Enrolled courses & grades\n• /focus [mins] - Log focus session\n• /ask <question> - Ask AI Tutor\n• /proposals - Hermes Agent suggestions\n• /help - Full commands guide`
      );

      return { handled: true, action: "link_success" };
    }

    // Commands for already-linked users
    const user = await this.findUserByChatId(chatId);
    if (!user) {
      if (text === "/help") {
        await this.sendMessageToChat(
          chatId,
          "📚 *StudyOS Telegram Bot*\n\nTo use this bot, please connect your StudyOS account first!\n\n1. Open StudyOS Settings → Integrations & Agent\n2. Click *Connect Telegram Bot* to link your account."
        );
        return { handled: true, action: "help_unlinked" };
      }
      await this.sendMessageToChat(
        chatId,
        "🔒 Account not linked.\n\nTo link your account, open StudyOS Settings → Integrations & Agent → Telegram Notifications and tap *Connect Telegram Bot*."
      );
      return { handled: true, action: "unlinked_command" };
    }

    if (text === "/today") {
      const summary = await this.buildTodaySummary(user.userId);
      await this.sendMessageToChat(chatId, summary);
      return { handled: true, action: "today_summary" };
    }

    if (text === "/assignments") {
      const summary = await this.buildAssignmentsSummary(user.userId);
      await this.sendMessageToChat(chatId, summary);
      return { handled: true, action: "assignments_summary" };
    }

    if (text.startsWith("/task ") || text.startsWith("/add ")) {
      const title = text.replace(/^\/(task|add)\s+/, "").trim();
      if (!title) {
        await this.sendMessageToChat(chatId, "⚠️ Please provide a task title, e.g. /task Complete Math Exercise 3.2");
        return { handled: true, action: "task_empty" };
      }
      const response = await this.createQuickTask(user.userId, title);
      await this.sendMessageToChat(chatId, response);
      return { handled: true, action: "task_created" };
    }

    if (text === "/briefing" || text === "/summary") {
      const briefing = await this.buildBriefingSummary(user.userId);
      await this.sendMessageToChat(chatId, briefing);
      return { handled: true, action: "briefing_summary" };
    }

    if (text === "/subjects") {
      const summary = await this.buildSubjectsSummary(user.userId);
      await this.sendMessageToChat(chatId, summary);
      return { handled: true, action: "subjects_summary" };
    }

    if (text.startsWith("/focus") || text.startsWith("/pomodoro")) {
      const parts = text.split(" ");
      const mins = parts[1] ? parseInt(parts[1], 10) : 25;
      const validMins = isNaN(mins) || mins <= 0 || mins > 240 ? 25 : mins;
      const response = await this.logFocusSession(user.userId, validMins);
      await this.sendMessageToChat(chatId, response);
      return { handled: true, action: "focus_session" };
    }

    if (text === "/proposals" || text === "/proposal") {
      const response = await this.buildProposalsSummary(user.userId);
      await this.sendMessageToChat(chatId, response);
      return { handled: true, action: "proposals_summary" };
    }

    if (text.startsWith("/accept ") || text.startsWith("/confirm ")) {
      const proposalId = text.split(" ")[1]?.trim();
      if (!proposalId) {
        await this.sendMessageToChat(chatId, "⚠️ Usage: /accept <proposal_id>. Use /proposals to see pending suggestions.");
        return { handled: true, action: "accept_empty" };
      }
      const response = await this.acceptProposal(user.userId, proposalId);
      await this.sendMessageToChat(chatId, response);
      return { handled: true, action: "accept_proposal" };
    }

    if (text === "/week" || text.startsWith("/week ")) {
      const summary = await this.buildWeekSummary(user.userId);
      await this.sendMessageToChat(chatId, summary);
      return { handled: true, action: "week_summary" };
    }

    if (text === "/month" || text.startsWith("/month ")) {
      const summary = await this.buildMonthSummary(user.userId);
      await this.sendMessageToChat(chatId, summary);
      return { handled: true, action: "month_summary" };
    }

    if (text === "/download" || text === "/export") {
      const summary = await this.buildDownloadSummary(user.userId);
      await this.sendMessageToChat(chatId, summary);
      return { handled: true, action: "export_summary" };
    }

    if (text.startsWith("/plan ") || text.startsWith("/schedule ")) {
      const instruction = text.replace(/^\/(plan|schedule)\s+/, "").trim();
      const response = await this.planAndSaveSchedule(user.userId, instruction);
      await this.sendMessageToChat(chatId, response);
      return { handled: true, action: "plan_saved" };
    }

    if (text.startsWith("/ask ")) {
      const question = text.replace(/^\/ask\s+/, "").trim();
      const response = await this.askAiTutor(user.userId, question);
      await this.sendMessageToChat(chatId, response);
      return { handled: true, action: "ai_question" };
    }

    if (text === "/help") {
      await this.sendMessageToChat(chatId, this.buildHelpMessage());
      return { handled: true, action: "help" };
    }

    // Check if message is a natural language planning or scheduling request
    const isPlanningIntent = /^(plan|schedule|set up my schedule|create a schedule|plan my (?:day|week|month|study|sessions?))\b/i.test(text.trim());
    if (isPlanningIntent) {
      const planResponse = await this.planAndSaveSchedule(user.userId, text);
      await this.sendMessageToChat(chatId, planResponse);
      return { handled: true, action: "plan_saved" };
    }

    // Default: conversational AI study tutor assistance
    const aiResponse = await this.askAiTutor(user.userId, text);
    await this.sendMessageToChat(chatId, aiResponse);
    return { handled: true, action: "ai_chat" };
  }

  /**
   * Send notification to user respecting preferences and quiet hours.
   */
  async sendNotification(
    userId: string,
    text: string,
    category: "session" | "due_date" | "briefing"
  ): Promise<boolean> {
    const settings = await this.getSettings(userId);
    if (!settings.isEnabled || !settings.chatId) return false;

    if (category === "session" && !settings.notifySessionReminders) return false;
    if (category === "due_date" && !settings.notifyDueDates) return false;
    if (category === "briefing" && !settings.notifyDailyBriefing) return false;

    const [user] = await getDb()
      .select({ timezone: users.timezone })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const userTimezone = user?.timezone || "UTC";

    // Check quiet hours against student's timezone
    if (this.isQuietHours(settings.quietHoursStart, settings.quietHoursEnd, userTimezone)) {
      return false;
    }

    const sent = await this.sendMessageToChat(settings.chatId, text);
    if (sent) {
      await getDb().insert(integrationAuditLogs).values({
        userId,
        integrationType: "telegram",
        action: `notify_${category}`,
        status: "success",
        details: { textSnippet: text.slice(0, 100) },
      });
    }
    return sent;
  }

  isQuietHours(
    start?: string | null,
    end?: string | null,
    userTimezone?: string | null,
    now = new Date()
  ): boolean {
    if (!start || !end) return false;
    let currentMins = now.getUTCHours() * 60 + now.getUTCMinutes();

    if (userTimezone) {
      try {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: userTimezone,
          hour: "numeric",
          minute: "numeric",
          hour12: false,
        }).formatToParts(now);
        const h = Number(parts.find((p) => p.type === "hour")?.value ?? now.getUTCHours());
        const m = Number(parts.find((p) => p.type === "minute")?.value ?? now.getUTCMinutes());
        currentMins = h * 60 + m;
      } catch {
        currentMins = now.getUTCHours() * 60 + now.getUTCMinutes();
      }
    }

    const sParts = start.split(":").map(Number);
    const eParts = end.split(":").map(Number);
    const sH = sParts[0] ?? 22;
    const sM = sParts[1] ?? 0;
    const eH = eParts[0] ?? 7;
    const eM = eParts[1] ?? 0;
    const startMins = sH * 60 + sM;
    const endMins = eH * 60 + eM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins <= endMins;
    }
    // Overnight quiet hours (e.g. 22:00 to 07:00)
    return currentMins >= startMins || currentMins <= endMins;
  }

  private async findUserByChatId(chatId: string): Promise<{ userId: string } | null> {
    const db = getDb();
    const [row] = await db
      .select({ userId: telegramSettings.userId })
      .from(telegramSettings)
      .where(and(eq(telegramSettings.chatId, chatId), eq(telegramSettings.isEnabled, true)))
      .limit(1);
    return row || null;
  }

  private async buildTodaySummary(userId: string): Promise<string> {
    const db = getDb();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const sessions = await db
      .select({
        id: studySessions.id,
        plannedMinutes: studySessions.plannedMinutes,
        status: studySessions.status,
        startAt: studySessions.startAt,
        assignmentTitle: assignments.title,
      })
      .from(studySessions)
      .innerJoin(assignments, eq(studySessions.assignmentId, assignments.id))
      .where(
        and(
          eq(studySessions.userId, userId),
          gte(studySessions.startAt, startOfDay)
        )
      )
      .limit(10);

    if (sessions.length === 0) {
      return "📅 *Today's Schedule*\n\nNo study sessions scheduled for today. Great time to plan ahead or take a well-deserved break!";
    }

    const lines = sessions.map((s) => {
      const timeStr = new Date(s.startAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const icon = s.status === "completed" ? "✅" : "⏳";
      return `${icon} \`${timeStr}\` — *${s.assignmentTitle}* (${s.plannedMinutes}m)`;
    });

    return `📅 *Today's Study Schedule*\n\n${lines.join("\n")}\n\nStay focused and make steady progress!`;
  }

  private async buildAssignmentsSummary(userId: string): Promise<string> {
    const db = getDb();
    const items = await db
      .select({
        title: assignments.title,
        dueAt: assignments.dueAt,
        status: assignments.status,
      })
      .from(assignments)
      .where(and(eq(assignments.userId, userId), eq(assignments.status, "in_progress")))
      .limit(10);

    if (items.length === 0) {
      return "📝 *Assignments*\n\nYou have no pending assignments right now. All caught up!";
    }

    const lines = items.map((a) => {
      const dateStr = new Date(a.dueAt).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
      return `• *${a.title}* — Due: \`${dateStr}\``;
    });

    return `📝 *Active Assignments*\n\n${lines.join("\n")}`;
  }

  private async createQuickTask(userId: string, title: string): Promise<string> {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    await db.insert(tasks).values({
      userId,
      title: title.slice(0, 500),
      scheduledDate: today,
      priority: "P2",
      revision: 1,
    });
    return [
      "✅ *Task Added to StudyOS!*",
      "",
      `📌 *Title:* ${title}`,
      "📅 *Scheduled:* Today",
      "🎯 *Priority:* Normal (P2)",
      "",
      "You can view and reorder it on your StudyOS Today board anytime.",
    ].join("\n");
  }

  private async buildBriefingSummary(userId: string): Promise<string> {
    const db = getDb();
    const now = new Date();
    const todayStr: string = now.toISOString().split("T")[0] || "";
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [todayTasks, pendingAssignments, todaySessions] = await Promise.all([
      db.select({ id: tasks.id, title: tasks.title, priority: tasks.priority })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.scheduledDate, todayStr), isNull(tasks.completedAt))),
      db.select({ id: assignments.id, title: assignments.title, dueAt: assignments.dueAt })
        .from(assignments)
        .where(and(eq(assignments.userId, userId), eq(assignments.status, "in_progress")))
        .limit(5),
      db.select({ id: studySessions.id, plannedMinutes: studySessions.plannedMinutes })
        .from(studySessions)
        .where(and(eq(studySessions.userId, userId), gte(studySessions.startAt, startOfDay))),
    ]);

    const totalMinutes = todaySessions.reduce((acc, s) => acc + s.plannedMinutes, 0);

    const taskLines = todayTasks.length > 0
      ? todayTasks.slice(0, 5).map((t) => `• [${t.priority}] ${t.title}`).join("\n")
      : "• No pending tasks for today";

    const assignmentLines = pendingAssignments.length > 0
      ? pendingAssignments.map((a) => {
          const d = new Date(a.dueAt).toLocaleDateString([], { month: "short", day: "numeric" });
          return `• *${a.title}* (Due: ${d})`;
        }).join("\n")
      : "• No urgent assignments";

    return [
      "🌅 *StudyOS Daily Briefing*",
      "",
      `⏱ *Planned Study:* ${totalMinutes} mins across ${todaySessions.length} session(s)`,
      "",
      `📋 *Today's Tasks (${todayTasks.length}):*`,
      taskLines,
      "",
      `📝 *Upcoming Deadlines (${pendingAssignments.length}):*`,
      assignmentLines,
      "",
      "_Tip: Use /task to add tasks or /focus to log study time._",
    ].join("\n");
  }

  private async buildSubjectsSummary(userId: string): Promise<string> {
    const db = getDb();
    const rows = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        color: subjects.color,
      })
      .from(subjects)
      .where(and(eq(subjects.userId, userId), isNull(subjects.archivedAt)))
      .limit(10);

    if (rows.length === 0) {
      return "📚 *Enrolled Subjects*\n\nYou haven't created any subjects yet. Open StudyOS → Subjects to add courses!";
    }

    const lines = rows.map((s) => `• *${s.name}*`);
    return `📚 *Your Enrolled Subjects (${rows.length})*\n\n${lines.join("\n")}`;
  }

  private async logFocusSession(userId: string, minutes: number): Promise<string> {
    const db = getDb();
    const now = new Date();
    const todayStr: string = now.toISOString().split("T")[0] || "";
    await db.insert(tasks).values({
      userId,
      title: `🎯 Focus Session (${minutes}m)`,
      scheduledDate: todayStr,
      estimatedMins: minutes,
      actualMins: minutes,
      completedAt: now,
      priority: "P1",
      revision: 1,
    });
    return [
      "🎯 *Focus Session Logged!*",
      "",
      `⏱ Logged *${minutes} minutes* of deep focus directly to your StudyOS board.`,
      "Keep up the great momentum! 🚀",
    ].join("\n");
  }

  private async buildProposalsSummary(userId: string): Promise<string> {
    const db = getDb();
    const rows = await db
      .select({
        id: agentProposals.id,
        title: agentProposals.title,
        summary: agentProposals.summary,
      })
      .from(agentProposals)
      .where(and(eq(agentProposals.userId, userId), eq(agentProposals.status, "pending_approval")))
      .limit(5);

    if (rows.length === 0) {
      return "🤖 *Hermes Agent Proposals*\n\nNo pending proposals right now. When Hermes generates study recommendations or revision plans, you can review and accept them here!";
    }

    const lines = rows.map((p) => `• *${p.title}*\n  ID: ${p.id}\n  ${p.summary || ""}\n  Approve: /accept ${p.id}`);
    return `🤖 *Pending Hermes Proposals (${rows.length})*\n\n${lines.join("\n\n")}`;
  }

  private async acceptProposal(userId: string, proposalId: string): Promise<string> {
    try {
      const hermes = new HermesBridgeService();
      const res = await hermes.confirmProposal(userId, proposalId);
      return `✅ *Hermes Proposal Confirmed!*\n\nAction executed: ${res.actionTaken}. Check your StudyOS timetable or notes.`;
    } catch (err) {
      return `❌ Could not accept proposal: ${err instanceof Error ? err.message : "Invalid or expired proposal"}`;
    }
  }

  private async askAiTutor(userId: string, question: string): Promise<string> {
    try {
      const res = await LearningAssistantService.processAssistantRequest(userId, {
        action: "chat",
        message: question,
      });
      if (res && res.content) {
        return `🤖 *StudyOS AI Tutor*\n\n${res.content}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("AI service unavailable") || msg.includes("Provider") || msg.includes("key")) {
        return [
          "🤖 *StudyOS AI Tutor*",
          "",
          "To enable AI answers directly in Telegram, please add your free Gemini API key in **StudyOS Settings → AI & Providers**!",
          "",
          "In the meantime, you can use:",
          "• /today - Daily plan",
          "• /assignments - Upcoming deadlines",
          "• /task <title> - Add a task",
          "• /briefing - Daily briefing",
          "• /subjects - Course list",
          "• /focus [mins] - Log focus session",
        ].join("\n");
      }
    }
    return `I received your message: "${question}".\n\nUse /today to check your schedule, /task <title> to add a task, /plan to schedule study sessions, or /help to view all available commands.`;
  }

  private async planAndSaveSchedule(userId: string, input: string): Promise<string> {
    const db = getDb();
    
    // 1. Determine target date
    let targetDate = new Date();
    const lower = input.toLowerCase();
    if (lower.includes("tomorrow")) {
      targetDate = new Date(Date.now() + 86400000);
    } else if (lower.includes("day after tomorrow")) {
      targetDate = new Date(Date.now() + 2 * 86400000);
    }
    const targetDateStr = targetDate.toISOString().split("T")[0]!;

    // 2. Parse sessions from input
    const cleanedInput = input
      .replace(/^(plan|schedule|set up my schedule|create a schedule|plan my (?:day|week|month|study|sessions?))\s*(?:for\s+)?(?:today|tomorrow)?[:\s]*/i, "")
      .trim();

    const chunks = cleanedInput
      .split(/[,;\n]|\s+and\s+/i)
      .map((c) => c.trim())
      .filter(Boolean);

    interface PlannedItem {
      title: string;
      durationMins: number;
      startTime: string;
      endTime: string;
    }

    const plannedItems: PlannedItem[] = [];
    let currentHour = 16; // default starting slot 4pm
    let currentMinute = 0;

    const sessionChunks = chunks.length > 0 ? chunks : [cleanedInput || "Study Session"];

    for (let chunk of sessionChunks) {
      if (!chunk) continue;
      
      // Extract duration (e.g., "2 hours", "2h", "45 mins", "1.5 hrs")
      let durationMins = 60;
      const durMatch = chunk.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
      const minMatch = chunk.match(/(\d+)\s*(?:minutes?|mins?|m)\b/i);
      if (durMatch && durMatch[1]) {
        durationMins = Math.round(parseFloat(durMatch[1]) * 60);
        chunk = chunk.replace(durMatch[0], "");
      } else if (minMatch && minMatch[1]) {
        durationMins = parseInt(minMatch[1], 10);
        chunk = chunk.replace(minMatch[0], "");
      }

      // Extract time (e.g., "at 4pm", "from 10am to 12pm", "at 16:30", "4:00 pm")
      let startH = currentHour;
      let startM = currentMinute;
      const timeMatch = chunk.match(/(?:at|from)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
      if (timeMatch && timeMatch[1]) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const meridian = timeMatch[3]?.toLowerCase();
        if (meridian === "pm" && h < 12) h += 12;
        if (meridian === "am" && h === 12) h = 0;
        if (h >= 0 && h <= 23) {
          startH = h;
          startM = m;
        }
        chunk = chunk.replace(timeMatch[0], "");
      }

      // Calculate end time
      const totalStartMins = startH * 60 + startM;
      const totalEndMins = totalStartMins + durationMins;
      const endH = Math.floor(totalEndMins / 60) % 24;
      const endM = totalEndMins % 60;

      const startTimeStr = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
      const endTimeStr = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      // Clean subject title
      const cleanTitle = chunk
        .replace(/\b(to|at|for|hours?|hrs?|mins?|minutes?|today|tomorrow|study|session|plan|review)\b/gi, "")
        .replace(/[:\-–—]/g, " ")
        .trim();

      const finalTitle = cleanTitle ? `Study: ${cleanTitle}` : "Focused Study Block";

      plannedItems.push({
        title: finalTitle,
        durationMins,
        startTime: startTimeStr,
        endTime: endTimeStr,
      });

      // Advance default time for subsequent items
      currentHour = (endH + (endM > 30 ? 1 : 0)) % 24;
      currentMinute = endM > 30 ? 0 : 30;
    }

    if (plannedItems.length === 0) {
      plannedItems.push({
        title: "Study: Focus Block",
        durationMins: 60,
        startTime: "16:00",
        endTime: "17:00",
      });
    }

    // Insert into database (both tasks and timeBlocks)
    for (const item of plannedItems) {
      const [insertedTask] = await db
        .insert(tasks)
        .values({
          userId,
          title: item.title,
          scheduledDate: targetDateStr,
          estimatedMins: item.durationMins,
          priority: "P1",
          revision: 1,
        })
        .returning({ id: tasks.id });

      await db.insert(timeBlocks).values({
        userId,
        taskId: insertedTask?.id,
        title: item.title,
        date: targetDateStr,
        startTime: item.startTime,
        endTime: item.endTime,
        durationMins: item.durationMins,
        color: "#6366F1",
      });
    }

    const formattedDate = targetDate.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const lines = plannedItems.map(
      (p) => `• ⏱ *${p.startTime} – ${p.endTime}* (${p.durationMins}m)\n  📖 *${p.title}*`
    );

    return [
      `📅 *Study Schedule Created & Saved!*`,
      `Scheduled for *${formattedDate}*`,
      "",
      ...lines,
      "",
      `⚡ *Total Sync Guaranteed:*`,
      `• Instantly visible on your Web & Windows Desktop Planner`,
      `• Synchronized to your Android APK Today & Plan tabs`,
      `• You will receive a reminder right here before each block begins!`,
    ].join("\n");
  }

  private async buildWeekSummary(userId: string): Promise<string> {
    const db = getDb();
    const today = new Date();
    const startStr = today.toISOString().split("T")[0]!;
    const end = new Date(Date.now() + 7 * 86400000);
    const endStr = end.toISOString().split("T")[0]!;

    const [blocks, pendingAssignments] = await Promise.all([
      db.select({
        id: timeBlocks.id,
        title: timeBlocks.title,
        date: timeBlocks.date,
        startTime: timeBlocks.startTime,
        endTime: timeBlocks.endTime,
        durationMins: timeBlocks.durationMins,
      })
      .from(timeBlocks)
      .where(and(eq(timeBlocks.userId, userId), gte(timeBlocks.date, startStr), lte(timeBlocks.date, endStr))),
      db.select({
        id: assignments.id,
        title: assignments.title,
        dueAt: assignments.dueAt,
      })
      .from(assignments)
      .where(and(eq(assignments.userId, userId), eq(assignments.status, "in_progress"), gte(assignments.dueAt, today), lte(assignments.dueAt, end))),
    ]);

    let totalMins = 0;
    const byDay: Record<string, typeof blocks> = {};
    for (const b of blocks) {
      totalMins += b.durationMins;
      const dayList = byDay[b.date] ?? [];
      dayList.push(b);
      byDay[b.date] = dayList;
    }

    const dates = Object.keys(byDay).sort();
    const lines: string[] = [];

    if (dates.length === 0) {
      lines.push("No scheduled study blocks for the next 7 days.");
      lines.push("💡 Tip: Use `/plan 2h Math at 4pm` to plan your week!");
    } else {
      for (const d of dates) {
        const dateObj = new Date(`${d}T00:00:00`);
        const dayLabel = dateObj.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        lines.push(`📅 *${dayLabel}*`);
        const dayItems = byDay[d] ?? [];
        for (const item of dayItems) {
          lines.push(`  • \`${item.startTime}-${item.endTime}\` ${item.title} (${item.durationMins}m)`);
        }
      }
    }

    if (pendingAssignments.length > 0) {
      lines.push("", "📝 *Deadlines This Week:*");
      for (const asgn of pendingAssignments) {
        const dStr = new Date(asgn.dueAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        lines.push(`  • *${asgn.title}* (Due: \`${dStr}\`)`);
      }
    }

    const totalHours = (totalMins / 60).toFixed(1);
    return [
      `🗓 *Your 7-Day Study Schedule*`,
      `Total planned: *${totalHours} hours* across ${blocks.length} sessions`,
      "",
      ...lines,
      "",
      `🔗 Open full timetable: https://studyos-web-8ruc.onrender.com/app/calendar`,
    ].join("\n");
  }

  private async buildMonthSummary(userId: string): Promise<string> {
    const db = getDb();
    const today = new Date();
    const startStr = today.toISOString().split("T")[0]!;
    const end = new Date(Date.now() + 30 * 86400000);
    const endStr = end.toISOString().split("T")[0]!;

    const [blocks, pendingAssignments] = await Promise.all([
      db.select({
        id: timeBlocks.id,
        title: timeBlocks.title,
        date: timeBlocks.date,
        durationMins: timeBlocks.durationMins,
      })
      .from(timeBlocks)
      .where(and(eq(timeBlocks.userId, userId), gte(timeBlocks.date, startStr), lte(timeBlocks.date, endStr))),
      db.select({
        id: assignments.id,
        title: assignments.title,
        dueAt: assignments.dueAt,
      })
      .from(assignments)
      .where(and(eq(assignments.userId, userId), eq(assignments.status, "in_progress"), gte(assignments.dueAt, today), lte(assignments.dueAt, end))),
    ]);

    let totalMins = 0;
    for (const b of blocks) totalMins += b.durationMins;
    const totalHours = (totalMins / 60).toFixed(1);

    const asgnLines = pendingAssignments.length === 0
      ? ["No pending assignment deadlines in the next 30 days."]
      : pendingAssignments.map((a) => {
          const dStr = new Date(a.dueAt).toLocaleDateString([], { month: "short", day: "numeric" });
          return `• *${a.title}* — Due: \`${dStr}\``;
        });

    return [
      `📆 *30-Day Monthly Schedule Overview*`,
      `• Total Study Sessions: *${blocks.length}* (${totalHours} hours planned)`,
      `• Pending Assignments: *${pendingAssignments.length}*`,
      "",
      `🎯 *Upcoming Milestones & Deadlines:*`,
      ...asgnLines,
      "",
      `💡 You can switch to *Month View* on the Web & Desktop planner anytime:`,
      `https://studyos-web-8ruc.onrender.com/app/calendar`,
    ].join("\n");
  }

  private async buildDownloadSummary(userId: string): Promise<string> {
    const weekSummary = await this.buildWeekSummary(userId);
    return [
      `📥 *Download & Export Your Schedule*`,
      "",
      weekSummary,
      "",
      `📱 *How to download to Google Calendar / Apple Calendar:*`,
      `1. Open StudyOS Web Planner: https://studyos-web-8ruc.onrender.com/app/calendar`,
      `2. Click *Export Schedule* → Select *Download .ics Calendar*`,
      `3. Open the downloaded file to sync directly with your phone's native calendar!`,
    ].join("\n");
  }

  private buildHelpMessage(): string {
    return [
      "📚 *StudyOS Telegram Bot Guide*",
      "",
      "🗓 *Schedules & Planning*",
      "• /plan <text> - Plan study schedule (e.g. /plan 2h Math at 4pm, 1h Physics at 7pm)",
      "• /today - View today's study schedule & sessions",
      "• /week - Complete 7-day weekly study schedule",
      "• /month - 30-day schedule & assignment milestones",
      "• /download - Export timetable for offline use or calendar import",
      "",
      "📋 *Tasks & Deadlines*",
      "• /assignments - View upcoming assignment deadlines",
      "• /task <title> - Quickly add a task (e.g. /task Revise Math Chapter 3)",
      "• /briefing - Daily workload briefing",
      "",
      "⏱ *Study & Focus*",
      "• /focus [mins] - Log focus session (e.g. /focus 30)",
      "• /subjects - View your enrolled academic courses",
      "",
      "🤖 *AI Tutor & Chat*",
      "• Just type naturally! Ask study questions or say 'plan my day' / 'schedule math tomorrow at 5pm'",
      "• /ask <question> - Ask the AI Study Tutor any question",
      "• /proposals - View pending Hermes Agent suggestions",
      "• /accept <id> - Approve a Hermes revision plan",
      "• /help - Show this guide",
      "",
      "⚙️ *Preferences*",
      "Manage notifications and quiet hours in StudyOS Settings → Integrations & Agent.",
    ].join("\n");
  }

  private async sendMessageToChat(chatId: string, text: string): Promise<boolean> {
    const token = this.getBotToken();
    if (!token) return false;

    try {
      const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[Telegram] sendMessage error (${res.status}): ${errText}`);
        if (errText.includes("can't parse entities")) {
          const fallbackRes = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, text }),
          });
          return fallbackRes.ok;
        }
      }
      return res.ok;
    } catch (err) {
      console.error("[Telegram] sendMessage network error:", err);
      return false;
    }
  }
}
