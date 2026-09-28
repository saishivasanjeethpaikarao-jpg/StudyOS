import { z } from "zod";

const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a six-digit hex value");

export const createSubjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().max(5000).optional().nullable(),
  icon: z.string().trim().min(1).max(64).optional().nullable(),
  color: colorSchema.optional().nullable(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const updateSubjectSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120).optional(),
    description: z.string().max(5000).optional().nullable(),
    icon: z.string().trim().min(1).max(64).optional().nullable(),
    color: colorSchema.optional().nullable(),
    sortOrder: z.number().int().nonnegative().optional(),
    archivedAt: z.string().datetime({ offset: true }).optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });

export const subjectFilterSchema = z.object({
  archived: z.enum(["true", "false"]).default("false"),
});
