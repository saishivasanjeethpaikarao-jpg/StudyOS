import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  desc,
  eq,
  getDb,
  isNull,
  sql,
  studyNotes,
} from "@open-sunsama/database";
import { ConflictError, NotFoundError, uuidSchema } from "@open-sunsama/utils";
import { jwtAuth, type AuthVariables } from "../middleware/auth.js";
import { notifyLearning, validateLearningLinks } from "../services/learning.js";
import { expectedRevision } from "../validation/study-sessions.js";

const router = new Hono<{ Variables: AuthVariables }>();
router.use("*", jwtAuth);
const id = z.object({ id: uuidSchema });
const fields = z
  .object({
    title: z.string().trim().min(1).max(300),
    body: z.string().max(100_000),
    subjectId: uuidSchema.nullable().optional(),
    assignmentId: uuidSchema.nullable().optional(),
    studySessionId: uuidSchema.nullable().optional(),
  })
  .strict();
const filters = z.object({
  subjectId: uuidSchema.optional(),
  assignmentId: uuidSchema.optional(),
  studySessionId: uuidSchema.optional(),
});

router.get("/", zValidator("query", filters), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    f = c.req.valid("query");
  await validateLearningLinks(db, userId, f);
  const conditions = [
    eq(studyNotes.userId, userId),
    isNull(studyNotes.deletedAt),
  ];
  if (f.subjectId) conditions.push(eq(studyNotes.subjectId, f.subjectId));
  if (f.assignmentId)
    conditions.push(eq(studyNotes.assignmentId, f.assignmentId));
  if (f.studySessionId)
    conditions.push(eq(studyNotes.studySessionId, f.studySessionId));
  const data = await db
    .select()
    .from(studyNotes)
    .where(and(...conditions))
    .orderBy(desc(studyNotes.updatedAt))
    .limit(200);
  return c.json({ success: true, data });
});

router.post("/", zValidator("json", fields), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    input = c.req.valid("json");
  await validateLearningLinks(db, userId, input);
  const [row] = await db
    .insert(studyNotes)
    .values({ userId, ...input })
    .returning();
  notifyLearning(userId, "notes");
  return c.json({ success: true, data: row }, 201);
});

router.get("/:id", zValidator("param", id), async (c) => {
  const [row] = await getDb()
    .select()
    .from(studyNotes)
    .where(
      and(
        eq(studyNotes.id, c.req.valid("param").id),
        eq(studyNotes.userId, c.get("userId")),
        isNull(studyNotes.deletedAt)
      )
    )
    .limit(1);
  if (!row) throw new NotFoundError("Note");
  return c.json({ success: true, data: row });
});

router.patch(
  "/:id",
  zValidator("param", id),
  zValidator(
    "json",
    fields.partial().refine((v) => Object.keys(v).length > 0)
  ),
  async (c) => {
    const db = getDb(),
      userId = c.get("userId"),
      noteId = c.req.valid("param").id,
      input = c.req.valid("json");
    await validateLearningLinks(db, userId, input);
    const [existing] = await db
      .select({ id: studyNotes.id })
      .from(studyNotes)
      .where(
        and(
          eq(studyNotes.id, noteId),
          eq(studyNotes.userId, userId),
          isNull(studyNotes.deletedAt)
        )
      )
      .limit(1);
    if (!existing) throw new NotFoundError("Note");
    const revision = expectedRevision(c.req.header("If-Match"));
    const [row] = await db
      .update(studyNotes)
      .set({
        ...input,
        revision: sql`${studyNotes.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(studyNotes.id, noteId),
          eq(studyNotes.userId, userId),
          isNull(studyNotes.deletedAt),
          eq(studyNotes.revision, revision)
        )
      )
      .returning();
    if (!row) throw new ConflictError("Note changed. Refresh and try again.");
    notifyLearning(userId, "notes");
    return c.json({ success: true, data: row });
  }
);

router.delete("/:id", zValidator("param", id), async (c) => {
  const db = getDb(),
    userId = c.get("userId"),
    noteId = c.req.valid("param").id;
  const [existing] = await db
    .select({ id: studyNotes.id })
    .from(studyNotes)
    .where(
      and(
        eq(studyNotes.id, noteId),
        eq(studyNotes.userId, userId),
        isNull(studyNotes.deletedAt)
      )
    )
    .limit(1);
  if (!existing) throw new NotFoundError("Note");
  const revision = expectedRevision(c.req.header("If-Match"));
  const [row] = await db
    .update(studyNotes)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
      revision: sql`${studyNotes.revision} + 1`,
    })
    .where(
      and(
        eq(studyNotes.id, noteId),
        eq(studyNotes.userId, userId),
        isNull(studyNotes.deletedAt),
        eq(studyNotes.revision, revision)
      )
    )
    .returning();
  if (!row) throw new ConflictError("Note changed. Refresh and try again.");
  notifyLearning(userId, "notes");
  return c.json({ success: true, data: row });
});

export { router as studyNotesRouter };
