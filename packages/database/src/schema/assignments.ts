import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { subjects } from "./subjects";
import { TASK_PRIORITIES } from "./task-priorities";

export const ASSIGNMENT_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * A first-class academic deadline. Assignments intentionally remain separate
 * from generic tasks so later study sessions and checklists can reference the
 * academic object without changing the existing planner behavior.
 */
export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("not_started"),
    priority: varchar("priority", { length: 2 }).notNull().default("P2"),
    estimatedMinutes: integer("estimated_minutes"),
    completedMinutes: integer("completed_minutes").notNull().default(0),
    revision: integer("revision").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("assignments_user_due_idx")
      .on(table.userId, table.dueAt)
      .where(sql`${table.deletedAt} IS NULL`),
    index("assignments_subject_idx").on(table.subjectId),
    index("assignments_user_status_idx")
      .on(table.userId, table.status)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("assignments_id_user_idx").on(table.id, table.userId),
  ]
);

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  user: one(users, {
    fields: [assignments.userId],
    references: [users.id],
  }),
  subject: one(subjects, {
    fields: [assignments.subjectId],
    references: [subjects.id],
  }),
}));

export const insertAssignmentSchema = createInsertSchema(assignments, {
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().max(10000).optional().nullable(),
  dueAt: z.date(),
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  estimatedMinutes: z
    .number()
    .int()
    .positive()
    .max(100000)
    .optional()
    .nullable(),
  completedMinutes: z.number().int().nonnegative().max(100000).optional(),
});

export const selectAssignmentSchema = createSelectSchema(assignments);
export const updateAssignmentSchema = insertAssignmentSchema.partial().omit({
  id: true,
  userId: true,
  revision: true,
  deletedAt: true,
  createdAt: true,
});

export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>;
