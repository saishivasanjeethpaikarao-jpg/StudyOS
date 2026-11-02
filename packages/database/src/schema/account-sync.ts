import {
  bigint,
  check,
  foreignKey,
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

/** Stable external identities are separate from email and password credentials. */
export const userIdentities = pgTable(
  "user_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 32 }).notNull(),
    providerSubject: varchar("provider_subject", { length: 255 }).notNull(),
    emailAtLink: varchar("email_at_link", { length: 255 }),
    emailVerifiedAtLink: timestamp("email_verified_at_link", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("user_identities_provider_subject_idx").on(
      t.provider,
      t.providerSubject
    ),
    index("user_identities_user_idx").on(t.userId),
  ]
);

export const accountDevices = pgTable(
  "account_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientDeviceId: varchar("client_device_id", { length: 128 }).notNull(),
    platform: varchar("platform", { length: 32 }).notNull(),
    displayName: varchar("display_name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at", {
      withTimezone: true,
    }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastSyncSequence: bigint("last_sync_sequence", { mode: "number" })
      .notNull()
      .default(0),
  },
  (t) => [
    uniqueIndex("account_devices_user_client_idx").on(
      t.userId,
      t.clientDeviceId
    ),
    index("account_devices_user_active_idx")
      .on(t.userId, t.lastActiveAt)
      .where(sql`${t.revokedAt} IS NULL`),
  ]
);

/** Opaque, hashed server sessions. Raw cookie values are never persisted. */
export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    csrfHash: varchar("csrf_hash", { length: 64 }).notNull(),
    deviceId: uuid("device_id").references(() => accountDevices.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("auth_sessions_user_active_idx")
      .on(t.userId, t.expiresAt)
      .where(sql`${t.revokedAt} IS NULL`),
  ]
);

/** Per-user locking row: allocated sequence values commit in order per account. */
export const userSyncStates = pgTable(
  "user_sync_states",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    sequence: bigint("sequence", { mode: "number" }).notNull().default(0),
    retentionFloor: bigint("retention_floor", { mode: "number" })
      .notNull()
      .default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "user_sync_states_sequence_check",
      sql`${t.sequence} >= ${t.retentionFloor} AND ${t.retentionFloor} >= 0`
    ),
  ]
);

/** Frozen, short-lived bootstrap pages keep all pages on the same DB snapshot. */
export const syncBootstrapSnapshots = pgTable(
  "sync_bootstrap_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").references(() => accountDevices.id, {
      onDelete: "cascade",
    }),
    snapshotSequence: bigint("snapshot_sequence", { mode: "number" }).notNull(),
    entries: jsonb("entries")
      .$type<Array<{ entityType: string; entityId: string; data: unknown }>>()
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("sync_bootstrap_snapshots_user_expiry_idx").on(t.userId, t.expiresAt),
  ]
);

/** Per-account ordered journal carries a safe row snapshot or an explicit tombstone. */
export const syncChanges = pgTable(
  "sync_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sequence: bigint("sequence", { mode: "number" }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityType: varchar("entity_type", { length: 64 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    revision: integer("revision"),
    operation: varchar("operation", { length: 16 }).notNull(),
    payload: jsonb("payload"),
    changedAt: timestamp("changed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("sync_changes_user_sequence_idx").on(t.userId, t.sequence),
    index("sync_changes_entity_idx").on(
      t.userId,
      t.entityType,
      t.entityId,
      t.sequence
    ),
    check(
      "sync_changes_operation_check",
      sql`${t.operation} IN ('upsert', 'delete')`
    ),
  ]
);

export const syncMutationReceipts = pgTable(
  "sync_mutation_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientMutationId: uuid("client_mutation_id").notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    response: jsonb("response"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("sync_mutation_receipts_owner_mutation_idx").on(
      t.userId,
      t.clientMutationId
    ),
    index("sync_mutation_receipts_created_idx").on(t.userId, t.createdAt),
  ]
);

/** Short-lived OAuth transaction state; the PKCE verifier remains in a protected browser cookie. */
export const googleOAuthTransactions = pgTable(
  "google_oauth_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stateHash: varchar("state_hash", { length: 64 }).notNull().unique(),
    nonceHash: varchar("nonce_hash", { length: 64 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    intent: varchar("intent", { length: 16 }).notNull().default("login"),
    mobileRedirectUri: varchar("mobile_redirect_uri", { length: 512 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("google_oauth_transactions_expires_idx").on(t.expiresAt),
    check(
      "google_oauth_transactions_intent_check",
      sql`${t.intent} IN ('login','link')`
    ),
  ]
);

/** One-time handoff codes used when a native client completes Google OIDC in a system browser. */
export const mobileAuthHandoffs = pgTable(
  "mobile_auth_handoffs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("mobile_auth_handoffs_expiry_idx").on(t.expiresAt),
    index("mobile_auth_handoffs_user_idx").on(t.userId),
  ]
);
