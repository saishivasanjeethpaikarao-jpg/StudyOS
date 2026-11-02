import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const integrationConnections = pgTable(
  "integration_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(), // 'google_calendar' | 'google_drive' | 'telegram' | 'hermes'
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    encryptedCredentials: text("encrypted_credentials"), // AES-256-GCM encrypted
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    status: varchar("status", { length: 20 }).default("active").notNull(), // 'active' | 'disconnected' | 'error' | 'pending'
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("integration_connections_user_id_idx").on(table.userId),
    uniqueIndex("integration_connections_user_provider_account_idx").on(
      table.userId,
      table.provider,
      table.providerAccountId
    ),
  ]
);

export const telegramLinkRequests = pgTable(
  "telegram_link_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    linkCode: varchar("link_code", { length: 64 }).notNull(),
    telegramChatId: varchar("telegram_chat_id", { length: 64 }),
    telegramUsername: varchar("telegram_username", { length: 255 }),
    status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending' | 'consumed' | 'expired'
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("telegram_link_requests_code_idx").on(table.linkCode),
    index("telegram_link_requests_user_idx").on(table.userId),
  ]
);

export const telegramSettings = pgTable(
  "telegram_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: varchar("chat_id", { length: 64 }),
    username: varchar("username", { length: 255 }),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    notifySessionReminders: boolean("notify_session_reminders")
      .default(true)
      .notNull(),
    notifyDueDates: boolean("notify_due_dates").default(true).notNull(),
    notifyDailyBriefing: boolean("notify_daily_briefing")
      .default(false)
      .notNull(),
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // HH:MM
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }), // HH:MM
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("telegram_settings_user_idx").on(table.userId)]
);

export const agentConnections = pgTable(
  "agent_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).default("Hermes Agent").notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(), // SHA-256
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    capabilities: jsonb("capabilities").$type<string[]>().default([]).notNull(),
    allowedWorkflows: jsonb("allowed_workflows")
      .$type<string[]>()
      .default([])
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("agent_connections_user_idx").on(table.userId)]
);

export const agentProposals = pgTable(
  "agent_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workflowType: varchar("workflow_type", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    proposedAction: varchar("proposed_action", { length: 64 }).notNull(), // 'create_session' | 'create_reminder' | 'update_assignment' | 'create_note'
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: varchar("status", { length: 20 })
      .default("pending_approval")
      .notNull(), // 'pending_approval' | 'approved' | 'rejected'
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => [
    index("agent_proposals_user_status_idx").on(table.userId, table.status),
  ]
);

export const automationDefinitions = pgTable(
  "automation_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    workflowType: varchar("workflow_type", { length: 64 }).notNull(), // 'daily_briefing' | 'assignment_due_reminder' | 'session_reminder' | 'weekly_progress_summary' | 'revision_suggestions' | 'incomplete_assignment_alert'
    scheduleTime: varchar("schedule_time", { length: 5 }).notNull(), // HH:MM
    timezone: varchar("timezone", { length: 64 }).default("UTC").notNull(),
    channels: jsonb("channels").$type<string[]>().default(["in_app"]).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("automation_definitions_user_idx").on(table.userId),
    index("automation_definitions_active_idx").on(table.isActive),
  ]
);

export const automationExecutionLogs = pgTable(
  "automation_execution_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automationDefinitions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 20 }).notNull(), // 'success' | 'failed' | 'skipped'
    summary: text("summary").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    errorMessage: text("error_message"),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("automation_execution_logs_automation_idx").on(table.automationId),
    index("automation_execution_logs_user_idx").on(table.userId),
  ]
);

export const integrationAuditLogs = pgTable(
  "integration_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    integrationType: varchar("integration_type", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    status: varchar("status", { length: 20 }).notNull(), // 'success' | 'failure' | 'warning'
    details: jsonb("details").$type<Record<string, unknown>>().default({}),
    errorMessage: text("error_message"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("integration_audit_logs_user_idx").on(table.userId),
    index("integration_audit_logs_type_idx").on(table.integrationType),
  ]
);
