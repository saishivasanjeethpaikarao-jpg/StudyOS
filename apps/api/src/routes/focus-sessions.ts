import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  desc,
  eq,
  focusSessions,
  getDb,
  sql,
} from "@open-sunsama/database";
import { ConflictError, NotFoundError, uuidSchema } from "@open-sunsama/utils";
import { jwtAuth, type AuthVariables } from "../middleware/auth.js";
import { notifyLearning, validateLearningLinks } from "../services/learning.js";
import { expectedRevision } from "../validation/study-sessions.js";

const router = new Hono<{ Variables: AuthVariables }>();
router.use("*", jwtAuth);
const link = z
  .object({
    subjectId: uuidSchema.optional(),
    assignmentId: uuidSchema.optional(),
    studySessionId: uuidSchema.optional(),
  })
  .strict()
  .refine(
    (v) => Object.values(v).filter(Boolean).length === 1,
    "Choose one study item"
  );
const id = z.object({ id: uuidSchema });

router.get("/", async (c) => {
  const data = await getDb()
    .select()
    .from(focusSessions)
    .where(eq(focusSessions.userId, c.get("userId")))
    .orderBy(desc(focusSessions.startedAt))
    .limit(100);
  return c.json({ success: true, data });
});

router.post("/", zValidator("json", link), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    input = c.req.valid("json");
  await validateLearningLinks(db, userId, input);
  const row = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 17))`
    );
    const [active] = await tx
      .select()
      .from(focusSessions)
      .where(
        and(eq(focusSessions.userId, userId), eq(focusSessions.state, "active"))
      )
      .limit(1);
    if (active) {
      if (
        active.subjectId === (input.subjectId ?? null) &&
        active.assignmentId === (input.assignmentId ?? null) &&
        active.studySessionId === (input.studySessionId ?? null)
      )
        return active;
      throw new ConflictError(
        "Finish or cancel your current focus session first"
      );
    }
    const [created] = await tx
      .insert(focusSessions)
      .values({ userId, ...input })
      .returning();
    if (!created) throw new Error("Focus session creation failed");
    return created;
  });
  notifyLearning(userId, "focus");
  return c.json({ success: true, data: row }, 201);
});

for (const state of ["completed", "cancelled"] as const) {
  router.post(
    `/:id/${state === "completed" ? "finish" : "cancel"}`,
    zValidator("param", id),
    async (c) => {
      const db = getDb(),
        userId = c.get("userId"),
        focusId = c.req.valid("param").id;
      const [existing] = await db
        .select()
        .from(focusSessions)
        .where(
          and(eq(focusSessions.id, focusId), eq(focusSessions.userId, userId))
        )
        .limit(1);
      if (!existing) throw new NotFoundError("Focus session");
      const revision = expectedRevision(c.req.header("If-Match"));
      const now = new Date(),
        durationSeconds = Math.max(
          0,
          Math.floor((now.getTime() - existing.startedAt.getTime()) / 1000)
        );
      const [row] = await db
        .update(focusSessions)
        .set({
          state,
          endedAt: now,
          durationSeconds,
          revision: sql`${focusSessions.revision} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(focusSessions.id, focusId),
            eq(focusSessions.userId, userId),
            eq(focusSessions.state, "active"),
            eq(focusSessions.revision, revision)
          )
        )
        .returning();
      if (!row)
        throw new ConflictError(
          "Focus session changed. Refresh and try again."
        );
      notifyLearning(userId, "focus");
      return c.json({ success: true, data: row });
    }
  );
}

export { router as focusSessionsRouter };
