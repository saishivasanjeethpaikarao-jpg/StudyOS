import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { assignments } from "./assignments";

/**
 * A student-owned academic subject, such as Mathematics or Chemistry.
 * Subjects organize academic work without replacing the existing task model.
 */
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 64 }),
    color: varchar("color", { length: 7 }),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("subjects_user_sort_idx").on(table.userId, table.sortOrder),
    index("subjects_user_archived_idx").on(table.userId, table.archivedAt),
  ]
);

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  user: one(users, {
    fields: [subjects.userId],
    references: [users.id],
  }),
  assignments: many(assignments),
}));

export const insertSubjectSchema = createInsertSchema(subjects, {
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(5000).optional().nullable(),
  icon: z.string().trim().min(1).max(64).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a six-digit hex value")
    .optional()
    .nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const selectSubjectSchema = createSelectSchema(subjects);
export const updateSubjectSchema = insertSubjectSchema
  .partial()
  .omit({ id: true, userId: true, revision: true, createdAt: true });

export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type UpdateSubject = z.infer<typeof updateSubjectSchema>;
