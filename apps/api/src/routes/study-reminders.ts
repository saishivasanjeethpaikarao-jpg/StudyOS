import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  asc,
  eq,
  getDb,
  sql,
  studyReminders,
} from "@open-sunsama/database";
import { ConflictError, NotFoundError, uuidSchema } from "@open-sunsama/utils";
import { jwtAuth, type AuthVariables } from "../middleware/auth.js";
import { notifyLearning, validateLearningLinks } from "../services/learning.js";
import { expectedRevision } from "../validation/study-sessions.js";

const router = new Hono<{ Variables: AuthVariables }>();
router.use("*", jwtAuth);
const id = z.object({ id: uuidSchema });
const payloadFields = z
  .object({
    title: z.string().trim().min(1).max(300),
    remindAt: z.string().datetime({ offset: true }),
    subjectId: uuidSchema.nullable().optional(),
    assignmentId: uuidSchema.nullable().optional(),
    studySessionId: uuidSchema.nullable().optional(),
    quizId: uuidSchema.nullable().optional(),
  })
  .strict();
const oneTarget = (v: {
  subjectId?: string | null;
  assignmentId?: string | null;
  studySessionId?: string | null;
  quizId?: string | null;
}) =>
  [v.subjectId, v.assignmentId, v.studySessionId, v.quizId].filter(Boolean)
    .length <= 1;
const payload = payloadFields.refine(oneTarget, "Choose one related item");

router.get(
  "/",
  zValidator(
    "query",
    z.object({
      state: z.enum(["pending", "dismissed", "cancelled"]).optional(),
    })
  ),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      state = c.req.valid("query").state;
    const data = await db
      .select()
      .from(studyReminders)
      .where(
        and(
          eq(studyReminders.userId, userId),
          state ? eq(studyReminders.state, state) : undefined
        )
      )
      .orderBy(asc(studyReminders.remindAt))
      .limit(200);
    return c.json({ success: true, data });
  }
);

router.post("/", zValidator("json", payload), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    input = c.req.valid("json");
  await validateLearningLinks(db, userId, input);
  const [row] = await db
    .insert(studyReminders)
    .values({ ...input, userId, remindAt: new Date(input.remindAt) })
    .returning();
  notifyLearning(userId, "reminders");
  return c.json({ success: true, data: row }, 201);
});

router.patch(
  "/:id",
  zValidator("param", id),
  zValidator(
    "json",
    payloadFields.partial().refine(oneTarget, "Choose one related item")
  ),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      reminderId = c.req.valid("param").id,
      input = c.req.valid("json");
    await validateLearningLinks(db, userId, input);
    const [existing] = await db
      .select()
      .from(studyReminders)
      .where(
        and(
          eq(studyReminders.id, reminderId),
          eq(studyReminders.userId, userId)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundError("Reminder");
    if (existing.state !== "pending")
      throw new ConflictError("Only pending reminders can be changed");
    if (
      !oneTarget({
        subjectId:
          input.subjectId === undefined ? existing.subjectId : input.subjectId,
        assignmentId:
          input.assignmentId === undefined
            ? existing.assignmentId
            : input.assignmentId,
        studySessionId:
          input.studySessionId === undefined
            ? existing.studySessionId
            : input.studySessionId,
        quizId: input.quizId === undefined ? existing.quizId : input.quizId,
      })
    ) {
      throw new ConflictError("Choose one related item");
    }
    const revision = expectedRevision(c.req.header("If-Match"));
    const [row] = await db
      .update(studyReminders)
      .set({
        ...input,
        remindAt: input.remindAt ? new Date(input.remindAt) : undefined,
        updatedAt: new Date(),
        revision: sql`${studyReminders.revision} + 1`,
      })
      .where(
        and(
          eq(studyReminders.id, reminderId),
          eq(studyReminders.userId, userId),
          eq(studyReminders.state, "pending"),
          eq(studyReminders.revision, revision)
        )
      )
      .returning();
    if (!row)
      throw new ConflictError("Reminder changed. Refresh and try again.");
    notifyLearning(userId, "reminders");
    return c.json({ success: true, data: row });
  }
);

for (const state of ["dismissed", "cancelled"] as const) {
  router.post(
    `/:id/${state === "dismissed" ? "dismiss" : "cancel"}`,
    zValidator("param", id),
    async (c) => {
      const db = getDb(),
        userId = c.get("userId"),
        reminderId = c.req.valid("param").id;
      const [existing] = await db
        .select()
        .from(studyReminders)
        .where(
          and(
            eq(studyReminders.id, reminderId),
            eq(studyReminders.userId, userId)
          )
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Reminder");
      const revision = expectedRevision(c.req.header("If-Match"));
      const [row] = await db
        .update(studyReminders)
        .set({
          state,
          updatedAt: new Date(),
          revision: sql`${studyReminders.revision} + 1`,
        })
        .where(
          and(
            eq(studyReminders.id, reminderId),
            eq(studyReminders.userId, userId),
            eq(studyReminders.state, "pending"),
            eq(studyReminders.revision, revision)
          )
        )
        .returning();
      if (!row)
        throw new ConflictError("Reminder changed. Refresh and try again.");
      notifyLearning(userId, "reminders");
      return c.json({ success: true, data: row });
    }
  );
}

export { router as studyRemindersRouter };
