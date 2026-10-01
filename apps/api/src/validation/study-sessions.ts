import { z } from "zod";
import { ValidationError, uuidSchema } from "@open-sunsama/utils";
import { STUDY_SESSION_STATUSES } from "@open-sunsama/database";

const instant = z.string().datetime({
  offset: true,
  message: "Use an ISO 8601 timestamp with a timezone offset",
});
const minutes = z.number().int().positive().max(1439);
const schedule = z
  .object({
    startAt: instant,
    endAt: instant,
    timezone: z.string().min(1).max(64),
    plannedMinutes: minutes,
  })
  .strict();

export const createStudySessionSchema = schedule.extend({
  assignmentId: uuidSchema,
});
export const updateStudySessionSchema = schedule
  .partial()
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one schedule field is required",
  });
export const rescheduleStudySessionSchema = schedule;
export const completeStudySessionSchema = z
  .object({
    actualMinutes: z.number().int().nonnegative().max(100000).optional(),
  })
  .strict();
export const studySessionFilterSchema = z
  .object({
    assignmentId: uuidSchema.optional(),
    status: z.enum(STUDY_SESSION_STATUSES).optional(),
    from: instant.optional(),
    to: instant.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .refine(({ from, to }) => !from || !to || new Date(from) < new Date(to), {
    message: "from must precede to",
    path: ["to"],
  });

/** Strong numeric ETags keep clients from overwriting a newer revision. */
export function expectedRevision(ifMatch: string | undefined): number {
  const match = /^"([1-9]\d*)"$/.exec(ifMatch ?? "");
  if (!match) {
    throw new ValidationError("A quoted numeric If-Match revision is required");
  }
  const revision = Number(match[1]);
  if (!Number.isSafeInteger(revision)) {
    throw new ValidationError("Invalid If-Match revision");
  }
  return revision;
}
