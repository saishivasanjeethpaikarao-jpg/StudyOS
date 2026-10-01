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
  lte,
  sql,
} from "@open-sunsama/database";
import { uuidSchema } from "@open-sunsama/utils";
import { auth, requireScopes, type AuthVariables } from "../middleware/auth.js";
import {
  assignmentFilterSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
} from "../validation/assignments.js";
import {
  requireOwnedAssignment,
  requireOwnedSubject,
} from "../services/academic-domain.js";
import { publishEvent } from "../lib/websocket/index.js";
import { getAssignmentStudyProgress } from "../services/study-sessions.js";

const assignmentsRouter = new Hono<{ Variables: AuthVariables }>();
assignmentsRouter.use("*", auth);

const READ = requireScopes("assignments:read");
const WRITE = requireScopes("assignments:write");

assignmentsRouter.get(
  "/",
  READ,
  zValidator("query", assignmentFilterSchema),
  async (c) => {
    const userId = c.get("userId");
    const filters = c.req.valid("query");
    const db = getDb();
    const conditions = [
      eq(assignments.userId, userId),
      isNull(assignments.deletedAt),
    ];

    if (filters.subjectId) {
      await requireOwnedSubject(db, userId, filters.subjectId);
      conditions.push(eq(assignments.subjectId, filters.subjectId));
    }
    if (filters.status) conditions.push(eq(assignments.status, filters.status));
    if (filters.dueFrom)
      conditions.push(gte(assignments.dueAt, new Date(filters.dueFrom)));
    if (filters.dueTo)
      conditions.push(lte(assignments.dueAt, new Date(filters.dueTo)));

    const offset = (filters.page - 1) * filters.limit;
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(assignments)
      .where(and(...conditions));
    const total = countResult?.count ?? 0;

    const data = await db
      .select()
      .from(assignments)
      .where(and(...conditions))
      .orderBy(asc(assignments.dueAt), asc(assignments.createdAt))
      .limit(filters.limit)
      .offset(offset);

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

assignmentsRouter.post(
  "/",
  WRITE,
  zValidator("json", createAssignmentSchema),
  async (c) => {
    const userId = c.get("userId");
    const input = c.req.valid("json");
    const db = getDb();

    if (input.subjectId) {
      await requireOwnedSubject(db, userId, input.subjectId);
    }

    const [assignment] = await db
      .insert(assignments)
      .values({
        userId,
        subjectId: input.subjectId ?? null,
        title: input.title,
        description: input.description ?? null,
        dueAt: new Date(input.dueAt),
        status: input.status ?? "not_started",
        priority: input.priority ?? "P2",
        estimatedMinutes: input.estimatedMinutes ?? null,
        completedMinutes: input.completedMinutes ?? 0,
      })
      .returning();

    if (!assignment) throw new Error("Failed to create assignment");
    publishEvent(userId, "assignment:created", {
      assignmentId: assignment.id,
    });
    return c.json({ success: true, data: assignment }, 201);
  }
);

assignmentsRouter.get(
  "/:id/study-progress",
  requireScopes("assignments:read", "study-sessions:read"),
  zValidator("param", z.object({ id: uuidSchema })),
  async (c) => {
    const progress = await getAssignmentStudyProgress(c.get("userId"), c.req.valid("param").id);
    return c.json({ success: true, data: progress });
  }
);

assignmentsRouter.get(
  "/:id",
  READ,
  zValidator("param", z.object({ id: uuidSchema })),
  async (c) => {
    const assignment = await requireOwnedAssignment(
      getDb(),
      c.get("userId"),
      c.req.valid("param").id
    );
    return c.json({ success: true, data: assignment });
  }
);

assignmentsRouter.patch(
  "/:id",
  WRITE,
  zValidator("param", z.object({ id: uuidSchema })),
  zValidator("json", updateAssignmentSchema),
  async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const input = c.req.valid("json");
    const db = getDb();
    await requireOwnedAssignment(db, userId, id);

    if (input.subjectId) {
      await requireOwnedSubject(db, userId, input.subjectId);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      revision: sql`${assignments.revision} + 1`,
    };
    if (input.subjectId !== undefined) updateData.subjectId = input.subjectId;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined)
      updateData.description = input.description;
    if (input.dueAt !== undefined) updateData.dueAt = new Date(input.dueAt);
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.estimatedMinutes !== undefined)
      updateData.estimatedMinutes = input.estimatedMinutes;
    if (input.completedMinutes !== undefined)
      updateData.completedMinutes = input.completedMinutes;

    const [assignment] = await db
      .update(assignments)
      .set(updateData)
      .where(
        and(
          eq(assignments.id, id),
          eq(assignments.userId, userId),
          isNull(assignments.deletedAt)
        )
      )
      .returning();

    publishEvent(userId, "assignment:updated", { assignmentId: id });
    return c.json({ success: true, data: assignment });
  }
);

assignmentsRouter.delete(
  "/:id",
  WRITE,
  zValidator("param", z.object({ id: uuidSchema })),
  async (c) => {
    const userId = c.get("userId");
    const { id } = c.req.valid("param");
    const db = getDb();
    await requireOwnedAssignment(db, userId, id);

    const now = new Date();
    await db
      .update(assignments)
      .set({
        deletedAt: now,
        updatedAt: now,
        revision: sql`${assignments.revision} + 1`,
      })
      .where(
        and(
          eq(assignments.id, id),
          eq(assignments.userId, userId),
          isNull(assignments.deletedAt)
        )
      );

    publishEvent(userId, "assignment:deleted", { assignmentId: id });
    return c.json({
      success: true,
      message: "Assignment deleted successfully",
    });
  }
);

export { assignmentsRouter };
