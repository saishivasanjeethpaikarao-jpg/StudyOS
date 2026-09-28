import { z } from "zod";
import { uuidSchema } from "@open-sunsama/utils";
import { ASSIGNMENT_STATUSES, TASK_PRIORITIES } from "@open-sunsama/database";

const dueAtSchema = z.string().datetime({
  offset: true,
  message: "Due date must be an ISO 8601 timestamp with a timezone",
});
const minutesSchema = z.number().int().nonnegative().max(100000);

export const createAssignmentSchema = z.object({
  subjectId: uuidSchema.optional().nullable(),
  title: z.string().trim().min(1, "Title is required").max(500),
  description: z.string().max(10000).optional().nullable(),
  dueAt: dueAtSchema,
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  estimatedMinutes: minutesSchema.positive().optional().nullable(),
  completedMinutes: minutesSchema.optional(),
});

export const updateAssignmentSchema = z
  .object({
    subjectId: uuidSchema.optional().nullable(),
    title: z.string().trim().min(1, "Title is required").max(500).optional(),
    description: z.string().max(10000).optional().nullable(),
    dueAt: dueAtSchema.optional(),
    status: z.enum(ASSIGNMENT_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    estimatedMinutes: minutesSchema.positive().optional().nullable(),
    completedMinutes: minutesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const assignmentFilterSchema = z
  .object({
    subjectId: uuidSchema.optional(),
    status: z.enum(ASSIGNMENT_STATUSES).optional(),
    dueFrom: dueAtSchema.optional(),
    dueTo: dueAtSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine(
    (value) =>
      !value.dueFrom ||
      !value.dueTo ||
      new Date(value.dueFrom) <= new Date(value.dueTo),
    { message: "dueFrom must be before or equal to dueTo", path: ["dueTo"] }
  );
