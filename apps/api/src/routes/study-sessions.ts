import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  assignments,
  asc,
  eq,
  getDb,
  gte,
  isNull,
  lt,
  sql,
  studySessions,
} from "@open-sunsama/database";
import { NotFoundError, uuidSchema } from "@open-sunsama/utils";
import { auth, requireScopes, type AuthVariables } from "../middleware/auth.js";
import {
  createStudySession,
  mutateStudySession,
  requireOwnedStudySession,
} from "../services/study-sessions.js";
import {
  completeStudySessionSchema,
  createStudySessionSchema,
  expectedRevision,
  rescheduleStudySessionSchema,
  studySessionFilterSchema,
  updateStudySessionSchema,
} from "../validation/study-sessions.js";

const studySessionsRouter = new Hono<{ Variables: AuthVariables }>();
studySessionsRouter.use("*", auth);
const READ = requireScopes("study-sessions:read");
const WRITE = requireScopes("study-sessions:write");
const idSchema = z.object({ id: uuidSchema });

studySessionsRouter.get(
  "/",
  READ,
  zValidator("query", studySessionFilterSchema),
  async (c) => {
    const userId = c.get("userId");
    const filters = c.req.valid("query");
    const db = getDb();
    if (filters.assignmentId) {
      // Owned soft-deleted Assignments remain filterable for session history.
      const [assignment] = await db
        .select({ id: assignments.id })
        .from(assignments)
        .where(
          and(
            eq(assignments.id, filters.assignmentId),
            eq(assignments.userId, userId)
          )
        )
        .limit(1);
      if (!assignment)
        throw new NotFoundError("Assignment", filters.assignmentId);
    }
    const conditions = [
      eq(studySessions.userId, userId),
      isNull(studySessions.deletedAt),
    ];
    if (filters.assignmentId)
      conditions.push(eq(studySessions.assignmentId, filters.assignmentId));
    if (filters.status)
      conditions.push(eq(studySessions.status, filters.status));
    if (filters.from)
      conditions.push(gte(studySessions.startAt, new Date(filters.from)));
    if (filters.to)
      conditions.push(lt(studySessions.startAt, new Date(filters.to)));
    const where = and(...conditions);
    const [count] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(studySessions)
      .where(where);
    const data = await db
      .select()
      .from(studySessions)
      .where(where)
      .orderBy(asc(studySessions.startAt), asc(studySessions.id))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
    const total = count?.count ?? 0;
    return c.json({
      success: true,
      data,
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  }
);

studySessionsRouter.post(
  "/",
  WRITE,
  zValidator("json", createStudySessionSchema),
  async (c) => {
    const { assignmentId, ...schedule } = c.req.valid("json");
    const session = await createStudySession(
      c.get("userId"),
      assignmentId,
      schedule
    );
    return c.json({ success: true, data: session }, 201);
  }
);

studySessionsRouter.get(
  "/:id",
  READ,
  zValidator("param", idSchema),
  async (c) => {
    const session = await requireOwnedStudySession(
      getDb(),
      c.get("userId"),
      c.req.valid("param").id
    );
    return c.json({ success: true, data: session });
  }
);

studySessionsRouter.patch(
  "/:id",
  WRITE,
  zValidator("param", idSchema),
  zValidator("json", updateStudySessionSchema),
  async (c) => {
    const session = await mutateStudySession(
      c.get("userId"),
      c.req.valid("param").id,
      expectedRevision(c.req.header("If-Match")),
      { kind: "update", schedule: c.req.valid("json") }
    );
    return c.json({ success: true, data: session });
  }
);

studySessionsRouter.post(
  "/:id/reschedule",
  WRITE,
  zValidator("param", idSchema),
  zValidator("json", rescheduleStudySessionSchema),
  async (c) => {
    const session = await mutateStudySession(
      c.get("userId"),
      c.req.valid("param").id,
      expectedRevision(c.req.header("If-Match")),
      { kind: "reschedule", schedule: c.req.valid("json") }
    );
    return c.json({ success: true, data: session });
  }
);

studySessionsRouter.post(
  "/:id/complete",
  WRITE,
  zValidator("param", idSchema),
  zValidator("json", completeStudySessionSchema),
  async (c) => {
    const session = await mutateStudySession(
      c.get("userId"),
      c.req.valid("param").id,
      expectedRevision(c.req.header("If-Match")),
      { kind: "complete", ...c.req.valid("json") }
    );
    return c.json({ success: true, data: session });
  }
);

studySessionsRouter.post(
  "/:id/skip",
  WRITE,
  zValidator("param", idSchema),
  async (c) => {
    const session = await mutateStudySession(
      c.get("userId"),
      c.req.valid("param").id,
      expectedRevision(c.req.header("If-Match")),
      { kind: "skip" }
    );
    return c.json({ success: true, data: session });
  }
);

studySessionsRouter.post(
  "/:id/cancel",
  WRITE,
  zValidator("param", idSchema),
  async (c) => {
    const session = await mutateStudySession(
      c.get("userId"),
      c.req.valid("param").id,
      expectedRevision(c.req.header("If-Match")),
      { kind: "cancel" }
    );
    return c.json({ success: true, data: session });
  }
);

studySessionsRouter.delete(
  "/:id",
  WRITE,
  zValidator("param", idSchema),
  async (c) => {
    await mutateStudySession(
      c.get("userId"),
      c.req.valid("param").id,
      expectedRevision(c.req.header("If-Match")),
      { kind: "delete" }
    );
    return c.json({
      success: true,
      message: "Study Session deleted successfully",
    });
  }
);

export { studySessionsRouter };
