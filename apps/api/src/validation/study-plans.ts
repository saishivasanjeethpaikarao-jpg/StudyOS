import { z } from "zod";
import { uuidSchema } from "@open-sunsama/utils";

const localDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    "Invalid local date"
  );
const instant = z.string().datetime({ offset: true });
const targetMinutes = z.number().int().positive().max(100000);
const preferredSessionMinutes = z.number().int().min(15).max(480);

export const previewStudyPlanSchema = z
  .object({
    targetMinutes: targetMinutes.optional(),
    startDate: localDate.optional(),
    endDate: localDate.optional(),
    preferredSessionMinutes,
    timezone: z.string().min(1).max(64),
  })
  .strict()
  .refine(
    ({ startDate, endDate }) => !startDate || !endDate || startDate <= endDate,
    { message: "endDate must not precede startDate", path: ["endDate"] }
  );

export const normalizedStudyPlanSchema = z
  .object({
    targetMinutes,
    startDate: localDate,
    endDate: localDate,
    preferredSessionMinutes,
    timezone: z.string().min(1).max(64),
    workStartHour: z.number().int().min(0).max(23),
    workEndHour: z.number().int().min(1).max(23),
  })
  .strict();

export const studyPlanSlotSchema = z
  .object({
    localDate,
    startAt: instant,
    endAt: instant,
    timezone: z.string().min(1).max(64),
    plannedMinutes: z.number().int().positive().max(480),
  })
  .strict();

export const confirmStudyPlanSchema = z
  .object({
    clientMutationId: uuidSchema,
    assignmentRevision: z.number().int().positive(),
    availabilityFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    normalizedInput: normalizedStudyPlanSchema,
    proposedSlots: z.array(studyPlanSlotSchema).max(500),
  })
  .strict();
