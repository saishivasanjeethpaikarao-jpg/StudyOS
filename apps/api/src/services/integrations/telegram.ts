import crypto from "node:crypto";
import {
  getDb,
  eq,
  and,
  gte,
  ne,
  users,
  studySessions,
  assignments,
  telegramLinkRequests,
  telegramSettings,
  integrationAuditLogs,
} from "@open-sunsama/database";
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
        `✅ Success! Your Telegram account is now connected to StudyOS.\n\nYou will receive your study reminders here.\n\nCommands:\n• /today - Today's schedule & sessions\n• /assignments - Upcoming assignments\n• /help - Usage guide`
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

    if (text === "/help") {
      await this.sendMessageToChat(
        chatId,
        `📚 *StudyOS Telegram Bot*\n\nAvailable commands:\n• /today - View today's study plan and focus sessions\n• /assignments - View your upcoming assignment deadlines\n• /help - Show this help message\n\nYou can customize your notification preferences anytime in StudyOS Settings → Integrations.`
      );
      return { handled: true, action: "help" };
    }

    // Default polite response
    await this.sendMessageToChat(
      chatId,
      "I received your message. Use /today to see your schedule or /help for commands."
    );
    return { handled: true, action: "echo" };
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
