import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  and,
  assignments,
  asc,
  eq,
  getDb,
  isNotNull,
  isNull,
  sql,
  subjects,
} from "@open-sunsama/database";
import { uuidSchema } from "@open-sunsama/utils";
import { auth, requireScopes, type AuthVariables } from "../middleware/auth.js";
import {
  createSubjectSchema,
  subjectFilterSchema,
  updateSubjectSchema,
} from "../validation/subjects.js";
import { requireOwnedSubject } from "../services/academic-domain.js";
import { publishEvent } from "../lib/websocket/index.js";

const subjectsRouter = new Hono<{ Variables: AuthVariables }>();
subjectsRouter.use("*", auth);

const READ = requireScopes("subjects:read");
const WRITE = requireScopes("subjects:write");

subjectsRouter.get(
  "/",
  READ,
  zValidator("query", subjectFilterSchema),
  async (c) => {
    const userId = c.get("userId");
    const { archived } = c.req.valid("query");
    const db = getDb();

    const data = await db
      .select()
      .from(subjects)
      .where(
        and(
          eq(subjects.userId, userId),
          archived === "true"
            ? isNotNull(subjects.archivedAt)
            : isNull(subjects.archivedAt)
        )
      )
      .orderBy(asc(subjects.sortOrder), asc(subjects.name));

    return c.json({ success: true, data });
  }
);

subjectsRouter.post(
  "/",
  WRITE,
  zValidator("json", createSubjectSchema),
  async (c) => {
    const userId = c.get("userId");
    const input = c.req.valid("json");
    const db = getDb();

    let sortOrder = input.sortOrder;
    if (sortOrder === undefined) {
      const [last] = await db
        .select({ max: sql<number>`COALESCE(MAX(${subjects.sortOrder}), -1)` })
        .from(subjects)
        .where(eq(subjects.userId, userId));
      sortOrder = (last?.max ?? -1) + 1;
    }

    const [subject] = await db
      .insert(subjects)
      .values({
        userId,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        color: input.color ?? null,
        sortOrder,
      })
      .returning();

    if (!subject) throw new Error("Failed to create subject");
    publishEvent(userId, "subject:created", { subjectId: subject.id });
    return c.json({ success: true, data: subject }, 201);
  }
);

subjectsRouter.get(
  "/:id",
  READ,
  zValidator("param", z.object({ id: uuidSchema })),
  async (c) => {
    const subject = await requireOwnedSubject(
      getDb(),
      c.get("userId"),
      c.req.valid("param").id
    );
    return c.json({ success: true, data: subject });
  }
);

subjectsRouter.patch(
  "/:id",
  WRITE,
  zValidator("param", z.object({ id: uuidSchema })),
  zValidator("json", updateSubjectSchema),
  async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const db = getDb();
    await requireOwnedSubject(db, userId, id);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      revision: sql`${subjects.revision} + 1`,
    };
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (input.archivedAt !== undefined)
      updateData.archivedAt = input.archivedAt
        ? new Date(input.archivedAt)
        : null;

    const [subject] = await db
      .update(subjects)
      .set(updateData)
      .where(and(eq(subjects.id, id), eq(subjects.userId, userId)))
      .returning();

    publishEvent(userId, "subject:updated", { subjectId: id });
    return c.json({ success: true, data: subject });
  }
);

subjectsRouter.delete(
  "/:id",
  WRITE,
  zValidator("param", z.object({ id: uuidSchema })),
  async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const db = getDb();
    await requireOwnedSubject(db, userId, id);

    const now = new Date();
    const updatedAssignments = await db.transaction(async (tx) => {
      const unlinkedAssignments = await tx
        .update(assignments)
        .set({
          subjectId: null,
          updatedAt: now,
          revision: sql`${assignments.revision} + 1`,
        })
        .where(
          and(
            eq(assignments.userId, userId),
            eq(assignments.subjectId, id),
            isNull(assignments.deletedAt)
          )
        )
        .returning({ id: assignments.id });

      await tx
        .delete(subjects)
        .where(and(eq(subjects.id, id), eq(subjects.userId, userId)));

      return unlinkedAssignments;
    });

    await Promise.all(
      updatedAssignments.map(({ id: assignmentId }) =>
        publishEvent(userId, "assignment:updated", { assignmentId })
      )
    );

    await publishEvent(userId, "subject:deleted", { subjectId: id });
    return c.json({ success: true, message: "Subject deleted successfully" });
  }
);

export { subjectsRouter };
