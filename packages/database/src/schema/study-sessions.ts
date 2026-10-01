import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { assignments } from "./assignments";
import { studyPlanApplications } from "./study-plan-applications";

export const STUDY_SESSION_STATUSES = [
  "planned",
  "completed",
  "skipped",
  "cancelled",
] as const;
export type StudySessionStatus = (typeof STUDY_SESSION_STATUSES)[number];

/** Canonical academic study work; a linked time block is only its projection. */
export const studySessions = pgTable(
  "study_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull(),
    plannedMinutes: integer("planned_minutes").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("planned"),
    actualMinutes: integer("actual_minutes"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    planApplicationId: uuid("plan_application_id"),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("study_sessions_id_user_idx").on(table.id, table.userId),
    index("study_sessions_user_start_idx")
      .on(table.userId, table.startAt)
      .where(sql`${table.deletedAt} IS NULL`),
    index("study_sessions_user_assignment_start_idx")
      .on(table.userId, table.assignmentId, table.startAt)
      .where(sql`${table.deletedAt} IS NULL`),
    index("study_sessions_plan_application_idx").on(table.planApplicationId),
    foreignKey({
      name: "study_sessions_assignment_owner_fk",
      columns: [table.assignmentId, table.userId],
      foreignColumns: [assignments.id, assignments.userId],
    }).onDelete("cascade"),
    foreignKey({
      name: "study_sessions_plan_application_owner_fk",
      columns: [table.planApplicationId, table.userId, table.assignmentId],
      foreignColumns: [
        studyPlanApplications.id,
        studyPlanApplications.userId,
        studyPlanApplications.assignmentId,
      ],
    }),
    check(
      "study_sessions_time_order_check",
      sql`${table.endAt} > ${table.startAt}`
    ),
    check(
      "study_sessions_planned_minutes_check",
      sql`${table.plannedMinutes} > 0`
    ),
    check("study_sessions_revision_check", sql`${table.revision} >= 1`),
    check(
      "study_sessions_actual_minutes_check",
      sql`${table.actualMinutes} IS NULL OR ${table.actualMinutes} >= 0`
    ),
    check(
      "study_sessions_timezone_check",
      sql`length(trim(${table.timezone})) > 0`
    ),
    check(
      "study_sessions_status_check",
      sql`${table.status} IN ('planned', 'completed', 'skipped', 'cancelled')`
    ),
  ]
);

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id],
  }),
  assignment: one(assignments, {
    fields: [studySessions.assignmentId],
    references: [assignments.id],
  }),
  planApplication: one(studyPlanApplications, {
    fields: [studySessions.planApplicationId],
    references: [studyPlanApplications.id],
  }),
}));

export const insertStudySessionSchema = createInsertSchema(studySessions, {
  startAt: z.date(),
  endAt: z.date(),
  timezone: z.string().refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Invalid IANA timezone"),
  plannedMinutes: z.number().int().positive(),
  status: z.enum(STUDY_SESSION_STATUSES).optional(),
  actualMinutes: z.number().int().nonnegative().nullable().optional(),
  revision: z.number().int().positive().optional(),
});
export const selectStudySessionSchema = createSelectSchema(studySessions);

export type StudySession = typeof studySessions.$inferSelect;
export type NewStudySession = typeof studySessions.$inferInsert;
