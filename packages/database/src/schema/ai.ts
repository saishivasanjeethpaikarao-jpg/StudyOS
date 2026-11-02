import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

const clock = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/**
 * Provider-specific configurations and credentials per user.
 * Sensitive API keys are encrypted at rest with AES-256-GCM.
 */
export const aiProviderConfigs = pgTable(
  "ai_provider_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    encryptedApiKey: text("encrypted_api_key"),
    keyMask: varchar("key_mask", { length: 16 }),
    defaultModel: varchar("default_model", { length: 128 }),
    customEndpoint: varchar("custom_endpoint", { length: 512 }),
    isEnabled: boolean("is_enabled").notNull().default(true),
    status: varchar("status", { length: 24 }).notNull().default("unconfigured"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: clock(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("ai_provider_configs_user_provider_idx").on(t.userId, t.provider),
    index("ai_provider_configs_user_idx").on(t.userId),
    check(
      "ai_provider_configs_provider_check",
      sql`${t.provider} IN ('gemini', 'groq', 'nim')`
    ),
    check(
      "ai_provider_configs_status_check",
      sql`${t.status} IN ('unconfigured', 'configured', 'verified', 'error')`
    ),
  ]
);

/**
 * Global AI feature toggles and fallback preferences per user.
 */
export const aiUserSettings = pgTable(
  "ai_user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    aiEnabled: boolean("ai_enabled").notNull().default(true),
    defaultProvider: varchar("default_provider", { length: 32 })
      .notNull()
      .default("gemini"),
    fallbackProviders: text("fallback_providers")
      .array()
      .notNull()
      .default(sql`ARRAY['groq', 'nim']::text[]`),
    allowFallback: boolean("allow_fallback").notNull().default(true),
    createdAt: clock(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("ai_user_settings_user_idx").on(t.userId),
    check(
      "ai_user_settings_default_provider_check",
      sql`${t.defaultProvider} IN ('gemini', 'groq', 'nim')`
    ),
  ]
);

/**
 * Audit log of AI operations (token usage, task type, provider used, status).
 * Never stores raw API keys or unrestricted prompt secrets.
 */
export const aiTaskHistory = pgTable(
  "ai_task_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskType: varchar("task_type", { length: 32 }).notNull(),
    provider: varchar("provider", { length: 32 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    status: varchar("status", { length: 24 }).notNull(),
    fallbackFrom: varchar("fallback_from", { length: 32 }),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: clock(),
  },
  (t) => [
    index("ai_task_history_user_created_idx").on(t.userId, t.createdAt),
    check(
      "ai_task_history_status_check",
      sql`${t.status} IN ('completed', 'failed', 'fallback_used')`
    ),
  ]
);

export type AiProviderConfigRow = typeof aiProviderConfigs.$inferSelect;
export type NewAiProviderConfigRow = typeof aiProviderConfigs.$inferInsert;
export type AiUserSettingsRow = typeof aiUserSettings.$inferSelect;
export type NewAiUserSettingsRow = typeof aiUserSettings.$inferInsert;
export type AiTaskHistoryRow = typeof aiTaskHistory.$inferSelect;
export type NewAiTaskHistoryRow = typeof aiTaskHistory.$inferInsert;
