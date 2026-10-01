import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
  index,
  foreignKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./users";
import { assignments } from "./assignments";

/** Idempotency record for a future confirmed study-plan application. */
export const studyPlanApplications = pgTable(
  "study_plan_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignmentId: uuid("assignment_id").notNull(),
    clientMutationId: uuid("client_mutation_id").notNull(),
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("study_plan_applications_user_mutation_idx").on(
      table.userId,
      table.clientMutationId
    ),
    uniqueIndex("study_plan_applications_id_owner_assignment_idx").on(
      table.id,
      table.userId,
      table.assignmentId
    ),
    index("study_plan_applications_user_assignment_idx").on(
      table.userId,
      table.assignmentId
    ),
    foreignKey({
      name: "study_plan_applications_assignment_owner_fk",
      columns: [table.assignmentId, table.userId],
      foreignColumns: [assignments.id, assignments.userId],
    }).onDelete("cascade"),
  ]
);

export const studyPlanApplicationsRelations = relations(
  studyPlanApplications,
  ({ one }) => ({
    user: one(users, {
      fields: [studyPlanApplications.userId],
      references: [users.id],
    }),
    assignment: one(assignments, {
      fields: [studyPlanApplications.assignmentId],
      references: [assignments.id],
    }),
  })
);

export const insertStudyPlanApplicationSchema = createInsertSchema(
  studyPlanApplications,
  {
    clientMutationId: z.string().uuid(),
    requestHash: z.string().regex(/^[a-f0-9]{64}$/),
  }
);
export const selectStudyPlanApplicationSchema = createSelectSchema(
  studyPlanApplications
);

export type StudyPlanApplication = typeof studyPlanApplications.$inferSelect;
export type NewStudyPlanApplication = typeof studyPlanApplications.$inferInsert;
