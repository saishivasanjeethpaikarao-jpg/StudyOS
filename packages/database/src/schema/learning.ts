import {
  boolean,
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
import { subjects } from "./subjects";
import { assignments } from "./assignments";
import { studySessions } from "./study-sessions";

const clock = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updated = () =>
  timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();

/** File bytes remain in the inherited S3-compatible store, never PostgreSQL. */
export const resources = pgTable(
  "resources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 16 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    url: text("url"),
    storageKey: text("storage_key"),
    mimeType: varchar("mime_type", { length: 120 }),
    filename: varchar("filename", { length: 255 }),
    sizeBytes: integer("size_bytes"),
    providerItemId: varchar("provider_item_id", { length: 128 }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    revision: integer("revision").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: clock(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("resources_id_user_idx").on(t.id, t.userId),
    index("resources_user_active_idx")
      .on(t.userId, t.createdAt)
      .where(sql`${t.deletedAt} IS NULL`),
    check("resources_type_check", sql`${t.type} IN ('file','youtube','web')`),
    check(
      "resources_source_check",
      sql`(${t.type} = 'file' AND ${t.storageKey} IS NOT NULL AND ${t.url} IS NULL) OR (${t.type} IN ('youtube','web') AND ${t.url} IS NOT NULL AND ${t.storageKey} IS NULL)`
    ),
    check(
      "resources_size_check",
      sql`${t.sizeBytes} IS NULL OR ${t.sizeBytes} > 0`
    ),
    check("resources_revision_check", sql`${t.revision} >= 1`),
  ]
);

/** One resource may be linked to several pieces of academic work. */
export const resourceLinks = pgTable(
  "resource_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id").notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "cascade",
    }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, {
      onDelete: "cascade",
    }),
    studySessionId: uuid("study_session_id").references(
      () => studySessions.id,
      { onDelete: "cascade" }
    ),
    createdAt: clock(),
  },
  (t) => [
    index("resource_links_owner_idx").on(t.userId, t.resourceId),
    index("resource_links_subject_idx").on(t.userId, t.subjectId),
    index("resource_links_assignment_idx").on(t.userId, t.assignmentId),
    index("resource_links_session_idx").on(t.userId, t.studySessionId),
    uniqueIndex("resource_links_unique_subject_idx")
      .on(t.resourceId, t.subjectId)
      .where(sql`${t.subjectId} IS NOT NULL`),
    uniqueIndex("resource_links_unique_assignment_idx")
      .on(t.resourceId, t.assignmentId)
      .where(sql`${t.assignmentId} IS NOT NULL`),
    uniqueIndex("resource_links_unique_session_idx")
      .on(t.resourceId, t.studySessionId)
      .where(sql`${t.studySessionId} IS NOT NULL`),
    foreignKey({
      name: "resource_links_resource_owner_fk",
      columns: [t.resourceId, t.userId],
      foreignColumns: [resources.id, resources.userId],
    }).onDelete("cascade"),
    check(
      "resource_links_one_target_check",
      sql`num_nonnulls(${t.subjectId}, ${t.assignmentId}, ${t.studySessionId}) = 1`
    ),
  ]
);

export const studyNotes = pgTable(
  "study_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    body: text("body").notNull().default(""),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, {
      onDelete: "set null",
    }),
    studySessionId: uuid("study_session_id").references(
      () => studySessions.id,
      { onDelete: "set null" }
    ),
    revision: integer("revision").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: clock(),
    updatedAt: updated(),
  },
  (t) => [
    index("study_notes_owner_idx")
      .on(t.userId, t.updatedAt)
      .where(sql`${t.deletedAt} IS NULL`),
    check("study_notes_revision_check", sql`${t.revision} >= 1`),
  ]
);

/** Phase 3 uses in-app delivery only; no Android Clock or push claim. */
export const studyReminders = pgTable(
  "study_reminders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, {
      onDelete: "set null",
    }),
    studySessionId: uuid("study_session_id").references(
      () => studySessions.id,
      { onDelete: "set null" }
    ),
    quizId: uuid("quiz_id").references(() => quizzes.id, {
      onDelete: "set null",
    }),
    state: varchar("state", { length: 16 }).notNull().default("pending"),
    revision: integer("revision").notNull().default(1),
    createdAt: clock(),
    updatedAt: updated(),
  },
  (t) => [
    index("study_reminders_due_idx").on(t.userId, t.state, t.remindAt),
    check(
      "study_reminders_state_check",
      sql`${t.state} IN ('pending','dismissed','cancelled')`
    ),
    check(
      "study_reminders_one_target_check",
      sql`num_nonnulls(${t.subjectId}, ${t.assignmentId}, ${t.studySessionId}, ${t.quizId}) <= 1`
    ),
  ]
);

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, {
      onDelete: "set null",
    }),
    studySessionId: uuid("study_session_id").references(
      () => studySessions.id,
      { onDelete: "set null" }
    ),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationSeconds: integer("duration_seconds"),
    state: varchar("state", { length: 16 }).notNull().default("active"),
    revision: integer("revision").notNull().default(1),
    createdAt: clock(),
    updatedAt: updated(),
  },
  (t) => [
    index("focus_sessions_owner_idx").on(t.userId, t.startedAt),
    uniqueIndex("focus_sessions_one_active_idx")
      .on(t.userId)
      .where(sql`${t.state} = 'active'`),
    check(
      "focus_sessions_state_check",
      sql`${t.state} IN ('active','completed','cancelled')`
    ),
    check(
      "focus_sessions_time_check",
      sql`${t.endedAt} IS NULL OR ${t.endedAt} >= ${t.startedAt}`
    ),
    check(
      "focus_sessions_duration_check",
      sql`${t.durationSeconds} IS NULL OR ${t.durationSeconds} >= 0`
    ),
  ]
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }).notNull(),
    description: text("description"),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    assignmentId: uuid("assignment_id").references(() => assignments.id, {
      onDelete: "set null",
    }),
    resourceId: uuid("resource_id").references(() => resources.id, {
      onDelete: "set null",
    }),
    status: varchar("status", { length: 16 }).notNull().default("draft"),
    revision: integer("revision").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: clock(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("quizzes_id_user_idx").on(t.id, t.userId),
    index("quizzes_owner_idx")
      .on(t.userId, t.updatedAt)
      .where(sql`${t.deletedAt} IS NULL`),
    check("quizzes_status_check", sql`${t.status} IN ('draft','published')`),
  ]
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 24 }).notNull(),
    prompt: text("prompt").notNull(),
    explanation: text("explanation"),
    position: integer("position").notNull(),
    sourceResourceId: uuid("source_resource_id").references(
      () => resources.id,
      { onDelete: "set null" }
    ),
    sourceReference: text("source_reference"),
    provenance: jsonb("provenance").$type<Record<string, unknown>>(),
    createdAt: clock(),
  },
  (t) => [
    index("quiz_questions_order_idx").on(t.quizId, t.position),
    check("quiz_questions_type_check", sql`${t.type} IN ('single','multiple')`),
  ]
);

export const quizOptions = pgTable(
  "quiz_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    position: integer("position").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (t) => [index("quiz_options_order_idx").on(t.questionId, t.position)]
);

/** Private snapshot freezes answer keys at start; taking responses never serialize it. */
export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id").notNull(),
    snapshot: jsonb("snapshot").$type<unknown>().notNull(),
    status: varchar("status", { length: 16 }).notNull().default("started"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    correctCount: integer("correct_count"),
    totalQuestions: integer("total_questions").notNull(),
    scorePercent: integer("score_percent"),
  },
  (t) => [
    index("quiz_attempts_owner_idx").on(t.userId, t.startedAt),
    index("quiz_attempts_quiz_idx").on(t.userId, t.quizId, t.startedAt),
    foreignKey({
      name: "quiz_attempts_quiz_owner_fk",
      columns: [t.quizId, t.userId],
      foreignColumns: [quizzes.id, quizzes.userId],
    }).onDelete("cascade"),
    check(
      "quiz_attempts_status_check",
      sql`${t.status} IN ('started','submitted')`
    ),
  ]
);

export const quizAnswers = pgTable(
  "quiz_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id").notNull(),
    selectedOptionIds: uuid("selected_option_ids").array().notNull(),
    isCorrect: boolean("is_correct").notNull(),
  },
  (t) => [
    uniqueIndex("quiz_answers_attempt_question_idx").on(
      t.attemptId,
      t.questionId
    ),
  ]
);
