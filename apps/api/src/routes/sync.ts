import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  and,
  asc,
  eq,
  getDb,
  gt,
  inArray,
  isNull,
  lt,
  lte,
  sql,
  syncBootstrapSnapshots,
  syncChanges,
  userSyncStates,
  accountDevices,
} from "@open-sunsama/database";
import { auth, type AuthVariables } from "../middleware/auth.js";
import {
  ValidationError,
  NotFoundError,
  uuidSchema,
} from "@open-sunsama/utils";
import { z } from "zod";
import { createHash } from "node:crypto";
import {
  tasks,
  subtasks,
  assignments,
  subjects,
  studyNotes,
  studySessions,
  timeBlocks,
  syncMutationReceipts,
  resources,
  resourceLinks,
  studyReminders,
  focusSessions,
  quizzes,
  quizQuestions,
  quizOptions,
} from "@open-sunsama/database";
import { ConflictError } from "@open-sunsama/utils";
import {
  createAssignmentSchema,
  updateAssignmentSchema,
} from "../validation/assignments.js";
import { createTaskSchema, updateTaskSchema } from "../validation/tasks.js";
import {
  createSubtaskSchema,
  updateSubtaskSchema,
} from "../validation/subtasks.js";
import {
  createSubjectSchema,
  updateSubjectSchema,
} from "../validation/subjects.js";
import { lockStudyPlanningUser } from "../services/study-sessions.js";
import {
  createPlannedSessionInTransaction,
  insertProjection,
  updateProjection,
  removeProjection,
  projectSchedule,
} from "../services/study-sessions.js";
import {
  normalizeResourceUrl,
  validateLearningLinks,
} from "../services/learning.js";
import {
  questionInputSchema,
  validateQuestions,
} from "../services/quiz-scoring.js";
import { publishEvent } from "../lib/websocket/index.js";
import type { WebSocketEventType } from "../lib/websocket/events.js";

const router = new Hono<{ Variables: AuthVariables }>();
router.use("*", auth);
const SYNC_RETENTION_LIMIT = 10_000;
const bootstrapRequest = z
  .object({
    deviceId: uuidSchema.optional(),
    pageToken: z.string().max(256).optional(),
    pageSize: z.coerce.number().int().min(1).max(500).default(200),
  })
  .strict();
const pullQuery = z.object({
  cursor: z.string().regex(/^\d{1,16}$/),
  limit: z.coerce.number().int().min(1).max(500).default(200),
  deviceId: uuidSchema.optional(),
});
const mutationSchema = z
  .object({
    clientMutationId: uuidSchema,
    entityType: z.enum([
      "subject",
      "assignment",
      "study-note",
      "study-session",
      "resource",
      "study-reminder",
      "focus-session",
      "quiz",
      "task",
      "subtask",
    ]),
    operation: z.enum(["create", "update", "delete"]),
    entityId: uuidSchema,
    expectedRevision: z.number().int().positive().optional(),
    payload: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
const sessionSchedulePayload = z.object({
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(64),
  plannedMinutes: z.number().int().positive().max(1439),
});
const sessionMutationPayload = sessionSchedulePayload
  .partial()
  .extend({
    action: z
      .enum(["reschedule", "complete", "skip", "cancel"])
      .default("reschedule"),
    actualMinutes: z.number().int().nonnegative().max(100000).optional(),
  })
  .strict();
const resourceMutationPayload = z
  .object({
    type: z.enum(["youtube", "web"]).optional(),
    title: z.string().trim().min(1).max(500).optional(),
    url: z.string().max(2048).optional(),
    link: z
      .object({
        subjectId: uuidSchema.optional(),
        assignmentId: uuidSchema.optional(),
        studySessionId: uuidSchema.optional(),
      })
      .strict()
      .optional(),
    completed: z.boolean().optional(),
  })
  .strict();
const reminderMutationPayload = z
  .object({
    title: z.string().trim().min(1).max(300).optional(),
    remindAt: z.string().datetime({ offset: true }).optional(),
    subjectId: uuidSchema.nullable().optional(),
    assignmentId: uuidSchema.nullable().optional(),
    studySessionId: uuidSchema.nullable().optional(),
    quizId: uuidSchema.nullable().optional(),
    state: z.enum(["pending", "dismissed", "cancelled"]).optional(),
  })
  .strict();
const focusMutationPayload = z
  .object({
    subjectId: uuidSchema.optional(),
    assignmentId: uuidSchema.optional(),
    studySessionId: uuidSchema.optional(),
    action: z.enum(["finish", "cancel"]).optional(),
  })
  .strict();
const quizMutationPayload = z
  .object({
    title: z.string().trim().min(1).max(300),
    description: z.string().max(10000).nullable().optional(),
    subjectId: uuidSchema.nullable().optional(),
    assignmentId: uuidSchema.nullable().optional(),
    resourceId: uuidSchema.nullable().optional(),
    status: z.enum(["draft", "published"]).default("draft"),
    questions: z.array(questionInputSchema).max(100).default([]),
  })
  .strict();

function requireSessionPrincipal(c: {
  get: (key: "authMethod") => "jwt" | "api-key" | "oauth" | "cookie";
}) {
  if (c.get("authMethod") !== "jwt" && c.get("authMethod") !== "cookie") {
    throw new ValidationError(
      "Synchronization requires a StudyOS sign-in session"
    );
  }
}

const SNAPSHOT_TABLES = [
  "tasks",
  "subtasks",
  "time_blocks",
  "task_series",
  "ideas",
  "idea_boards",
  "idea_columns",
  "idea_subtasks",
  "subjects",
  "assignments",
  "study_sessions",
  "resources",
  "resource_links",
  "study_notes",
  "study_reminders",
  "focus_sessions",
  "quizzes",
  "quiz_attempts",
  "attachments",
] as const;

async function collectBootstrapEntries(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  userId: string
) {
  const entries: Array<{
    entityType: string;
    entityId: string;
    data: unknown;
  }> = [];
  for (const tableName of SNAPSHOT_TABLES) {
    const ownerExpression =
      tableName === "subtasks"
        ? sql`(SELECT parent.user_id FROM tasks AS parent WHERE parent.id = row.task_id)`
        : tableName === "idea_subtasks"
          ? sql`(SELECT parent.user_id FROM ideas AS parent WHERE parent.id = row.idea_id)`
          : sql`row.user_id`;
    const dataExpression =
      tableName === "quiz_attempts"
        ? sql`to_jsonb(row) - 'snapshot'`
        : tableName === "resources"
          ? sql`to_jsonb(row) - 'storage_key'`
          : tableName === "attachments"
            ? sql`to_jsonb(row) - 's3_key'`
            : sql`to_jsonb(row)`;
    const result = await tx.execute(sql`
      SELECT COALESCE(jsonb_agg(${dataExpression} ORDER BY row.id), '[]'::jsonb) AS rows
      FROM ${sql.raw(`public.${tableName}`)} AS row
      WHERE ${ownerExpression} = ${userId}::uuid
    `);
    const rows =
      (result as unknown as Array<{ rows: Array<Record<string, unknown>> }>)[0]
        ?.rows ?? [];
    for (const row of rows)
      entries.push({
        entityType: tableName.replaceAll("_", "-"),
        entityId: typeof row.id === "string" ? row.id : "",
        data: row,
      });
  }
  const childQueries = [
    sql`SELECT 'quiz-question' AS kind, q.id::text AS entity_id, to_jsonb(q) AS row_data FROM quiz_questions q JOIN quizzes z ON z.id = q.quiz_id WHERE z.user_id = ${userId}::uuid`,
    sql`SELECT 'quiz-option' AS kind, o.id::text AS entity_id, (to_jsonb(o) - 'is_correct') AS row_data FROM quiz_options o JOIN quiz_questions q ON q.id = o.question_id JOIN quizzes z ON z.id = q.quiz_id WHERE z.user_id = ${userId}::uuid`,
    sql`SELECT 'quiz-answer' AS kind, a.attempt_id::text || ':' || a.question_id::text AS entity_id, to_jsonb(a) AS row_data FROM quiz_answers a JOIN quiz_attempts t ON t.id = a.attempt_id WHERE t.user_id = ${userId}::uuid`,
  ];
  for (const query of childQueries) {
    const rows = await tx.execute(query);
    for (const row of rows as unknown as Array<{
      kind: string;
      entity_id: string;
      row_data: unknown;
    }>) {
      entries.push({
        entityType: row.kind,
        entityId: row.entity_id,
        data: row.row_data,
      });
    }
  }
  const userResult = await tx.execute(sql`
    SELECT jsonb_build_object('id', id, 'email', email, 'name', name, 'avatarUrl', avatar_url, 'timezone', timezone,
      'preferences', preferences, 'createdAt', created_at, 'updatedAt', updated_at) AS profile
    FROM public.users WHERE id = ${userId}::uuid
  `);
  const profile = (
    userResult as unknown as Array<{ profile: Record<string, unknown> }>
  )[0]?.profile;
  if (profile)
    entries.push({ entityType: "profile", entityId: userId, data: profile });
  entries.sort(
    (a, b) =>
      a.entityType.localeCompare(b.entityType) ||
      a.entityId.localeCompare(b.entityId)
  );
  if (entries.length > 50_000)
    throw new ValidationError(
      "Account data is too large for a single initial sync snapshot"
    );
  return entries;
}

function encodePageToken(snapshotId: string, offset: number) {
  return Buffer.from(`${snapshotId}:${offset}`).toString("base64url");
}
function decodePageToken(
  value: string
): { snapshotId: string; offset: number } | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const [snapshotId, rawOffset] = decoded.split(":");
    const offset = Number(rawOffset);
    if (
      !snapshotId ||
      !/^[0-9a-f-]{36}$/i.test(snapshotId) ||
      !Number.isSafeInteger(offset) ||
      offset < 0
    )
      return null;
    return { snapshotId, offset };
  } catch {
    return null;
  }
}

/** Keep a bounded per-account journal while advancing the cursor floor safely. */
async function compactUserJournal(userId: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [state] = await tx
      .select()
      .from(userSyncStates)
      .where(eq(userSyncStates.userId, userId))
      .limit(1)
      .for("update");
    if (!state || state.sequence <= SYNC_RETENTION_LIMIT) return;
    const floor = state.sequence - SYNC_RETENTION_LIMIT;
    await tx
      .delete(syncChanges)
      .where(
        and(eq(syncChanges.userId, userId), lte(syncChanges.sequence, floor))
      );
    await tx
      .update(userSyncStates)
      .set({ retentionFloor: floor, updatedAt: new Date() })
      .where(eq(userSyncStates.userId, userId));
  });
}

router.post("/bootstrap", zValidator("json", bootstrapRequest), async (c) => {
  requireSessionPrincipal(c);
  const userId = c.get("userId"),
    input = c.req.valid("json"),
    db = getDb();
  let snapshotId: string,
    offset: number,
    snapshotSequence: number,
    entries: Array<{ entityType: string; entityId: string; data: unknown }>;
  if (input.pageToken) {
    const page = decodePageToken(input.pageToken);
    if (!page) throw new ValidationError("Invalid bootstrap page token");
    const [snapshot] = await db
      .select()
      .from(syncBootstrapSnapshots)
      .where(
        and(
          eq(syncBootstrapSnapshots.id, page.snapshotId),
          eq(syncBootstrapSnapshots.userId, userId),
          gt(syncBootstrapSnapshots.expiresAt, new Date())
        )
      )
      .limit(1);
    if (!snapshot)
      throw new NotFoundError("Bootstrap snapshot expired; start a new sync");
    if (input.deviceId && snapshot.deviceId !== input.deviceId)
      throw new NotFoundError("Bootstrap snapshot not found");
    snapshotId = snapshot.id;
    offset = page.offset;
    snapshotSequence = snapshot.snapshotSequence;
    entries = snapshot.entries;
  } else {
    if (input.deviceId) {
      const [device] = await db
        .select({ id: accountDevices.id })
        .from(accountDevices)
        .where(
          and(
            eq(accountDevices.id, input.deviceId),
            eq(accountDevices.userId, userId),
            isNull(accountDevices.revokedAt)
          )
        )
        .limit(1);
      if (!device) throw new NotFoundError("Device not found");
    }
    const snapshot = await db.transaction(async (tx) => {
      await tx.execute(
        sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`
      );
      const [state] = await tx
        .select({ sequence: userSyncStates.sequence })
        .from(userSyncStates)
        .where(eq(userSyncStates.userId, userId))
        .limit(1);
      return {
        sequence: state?.sequence ?? 0,
        entries: await collectBootstrapEntries(tx, userId),
      };
    });
    snapshotSequence = snapshot.sequence;
    entries = snapshot.entries;
    const [saved] = await db
      .insert(syncBootstrapSnapshots)
      .values({
        userId,
        deviceId: input.deviceId ?? null,
        snapshotSequence,
        entries,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      })
      .returning({ id: syncBootstrapSnapshots.id });
    if (!saved) throw new Error("Failed to preserve sync snapshot");
    snapshotId = saved.id;
    offset = 0;
    await db
      .delete(syncBootstrapSnapshots)
      .where(lt(syncBootstrapSnapshots.expiresAt, new Date()));
  }
  if (offset > entries.length)
    throw new ValidationError("Invalid bootstrap page offset");
  const page = entries.slice(offset, offset + input.pageSize);
  const nextOffset = offset + page.length;
  const complete = nextOffset >= entries.length;
  const nextPageToken = complete
    ? null
    : encodePageToken(snapshotId, nextOffset);
  return c.json({
    success: true,
    data: {
      snapshotId,
      snapshotSequence: String(snapshotSequence),
      entries: page,
      complete,
      nextPageToken,
      nextCursor: complete ? String(snapshotSequence) : null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  });
});

router.get("/changes", zValidator("query", pullQuery), async (c) => {
  requireSessionPrincipal(c);
  const userId = c.get("userId"),
    input = c.req.valid("query"),
    cursor = Number(input.cursor),
    db = getDb();
  if (!Number.isSafeInteger(cursor))
    throw new ValidationError("Invalid sync cursor");
  await compactUserJournal(userId);
  if (input.deviceId) {
    const [device] = await db
      .select({ id: accountDevices.id })
      .from(accountDevices)
      .where(
        and(
          eq(accountDevices.id, input.deviceId),
          eq(accountDevices.userId, userId),
          isNull(accountDevices.revokedAt)
        )
      )
      .limit(1);
    if (!device) throw new NotFoundError("Device not found");
  }
  const [state] = await db
    .select()
    .from(userSyncStates)
    .where(eq(userSyncStates.userId, userId))
    .limit(1);
  const currentSequence = state?.sequence ?? 0;
  if (cursor < (state?.retentionFloor ?? 0)) {
    return c.json(
      {
        success: false,
        error: {
          code: "BOOTSTRAP_REQUIRED",
          message: "This sync cursor is no longer retained",
        },
        data: { minimumCursor: String(state?.retentionFloor ?? 0) },
      },
      410
    );
  }
  const changes = await db
    .select({
      sequence: syncChanges.sequence,
      entityType: syncChanges.entityType,
      entityId: syncChanges.entityId,
      revision: syncChanges.revision,
      operation: syncChanges.operation,
      payload: syncChanges.payload,
      changedAt: syncChanges.changedAt,
    })
    .from(syncChanges)
    .where(
      and(eq(syncChanges.userId, userId), gt(syncChanges.sequence, cursor))
    )
    .orderBy(asc(syncChanges.sequence))
    .limit(input.limit);
  const nextCursor = changes.length
    ? String(changes[changes.length - 1]!.sequence)
    : String(currentSequence);
  if (input.deviceId && (!changes.length || changes.length < input.limit)) {
    await db
      .update(accountDevices)
      .set({
        lastActiveAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        lastSyncSequence: Number(nextCursor),
      })
      .where(
        and(
          eq(accountDevices.id, input.deviceId),
          eq(accountDevices.userId, userId),
          isNull(accountDevices.revokedAt)
        )
      );
  }
  return c.json({
    success: true,
    data: {
      changes,
      nextCursor,
      hasMore: changes.length === input.limit,
      currentSequence: String(currentSequence),
    },
  });
});

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

router.post("/mutations", zValidator("json", mutationSchema), async (c) => {
  requireSessionPrincipal(c);
  const userId = c.get("userId"),
    input = c.req.valid("json"),
    db = getDb();
  const requestHash = createHash("sha256")
    .update(stableJson(input))
    .digest("hex");
  const outcome = await db.transaction(async (tx) => {
    const [reservation] = await tx
      .insert(syncMutationReceipts)
      .values({
        userId,
        clientMutationId: input.clientMutationId,
        requestHash,
        response: null,
      })
      .onConflictDoNothing()
      .returning({ id: syncMutationReceipts.id });
    if (!reservation) {
      const [existing] = await tx
        .select()
        .from(syncMutationReceipts)
        .where(
          and(
            eq(syncMutationReceipts.userId, userId),
            eq(syncMutationReceipts.clientMutationId, input.clientMutationId)
          )
        )
        .limit(1)
        .for("update");
      if (!existing) throw new Error("Mutation receipt could not be read");
      if (existing.requestHash !== requestHash)
        throw new ConflictError(
          "This saved change ID was already used for different content."
        );
      if (!existing.response)
        throw new ConflictError(
          "This saved change is still being processed; retry shortly."
        );
      return {
        replayed: true,
        response: existing.response as Record<string, unknown>,
        events: [] as Array<{ type: WebSocketEventType; payload: unknown }>,
      };
    }

    let data: Record<string, unknown> = {};
    const events: Array<{ type: WebSocketEventType; payload: unknown }> = [];
    const now = new Date();
    if (input.entityType === "task") {
      if (input.operation === "create") {
        const values = createTaskSchema.parse(input.payload);
        let position = values.position;
        if (position === undefined) {
          const [maxPosition] = await tx
            .select({ max: sql<number>`COALESCE(MAX(${tasks.position}), -1)` })
            .from(tasks)
            .where(
              and(
                eq(tasks.userId, userId),
                values.scheduledDate === null ||
                  values.scheduledDate === undefined
                  ? isNull(tasks.scheduledDate)
                  : eq(tasks.scheduledDate, values.scheduledDate)
              )
            );
          position = (maxPosition?.max ?? -1) + 1;
        }
        const [row] = await tx
          .insert(tasks)
          .values({
            id: input.entityId,
            userId,
            title: values.title,
            notes: values.notes ?? null,
            scheduledDate: values.scheduledDate ?? null,
            estimatedMins: values.estimatedMins ?? null,
            priority: values.priority ?? "P2",
            position,
          })
          .returning();
        if (!row) throw new Error("Task creation failed");
        data = row;
        events.push({ type: "task:created", payload: { taskId: row.id } });
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError("An expected task revision is required");
        const [current] = await tx
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, input.entityId), eq(tasks.userId, userId)))
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Task");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "task", current },
            events: [],
          };
        }
        if (input.operation === "delete") {
          const [deleted] = await tx
            .delete(tasks)
            .where(
              and(
                eq(tasks.id, input.entityId),
                eq(tasks.userId, userId),
                eq(tasks.revision, expectedRevision)
              )
            )
            .returning();
          if (!deleted)
            throw new ConflictError("Task changed. Refresh and retry.");
          data = deleted;
          events.push({
            type: "task:deleted",
            payload: {
              taskId: input.entityId,
              scheduledDate: current.scheduledDate,
            },
          });
        } else {
          const values = updateTaskSchema.parse(input.payload);
          const [row] = await tx
            .update(tasks)
            .set({
              ...(values.title === undefined ? {} : { title: values.title }),
              ...(values.notes === undefined ? {} : { notes: values.notes }),
              ...(values.scheduledDate === undefined
                ? {}
                : { scheduledDate: values.scheduledDate }),
              ...(values.estimatedMins === undefined
                ? {}
                : { estimatedMins: values.estimatedMins }),
              ...(values.actualMins === undefined
                ? {}
                : { actualMins: values.actualMins }),
              ...(values.priority === undefined
                ? {}
                : { priority: values.priority }),
              ...(values.completedAt === undefined
                ? {}
                : {
                    completedAt: values.completedAt
                      ? new Date(values.completedAt)
                      : null,
                  }),
              ...(values.position === undefined
                ? {}
                : { position: values.position }),
              ...(values.subtasksHidden === undefined
                ? {}
                : { subtasksHidden: values.subtasksHidden }),
              revision: current.revision + 1,
              updatedAt: now,
            })
            .where(
              and(
                eq(tasks.id, input.entityId),
                eq(tasks.userId, userId),
                eq(tasks.revision, expectedRevision)
              )
            )
            .returning();
          if (!row) throw new ConflictError("Task changed. Refresh and retry.");
          data = row;
          events.push({
            type: values.completedAt ? "task:completed" : "task:updated",
            payload: { taskId: row.id, scheduledDate: row.scheduledDate },
          });
        }
      }
    } else if (input.entityType === "subtask") {
      if (input.operation === "create") {
        const taskId =
          typeof input.payload.taskId === "string"
            ? input.payload.taskId
            : undefined;
        if (!taskId) throw new ValidationError("A parent task is required");
        const { taskId: _parentTaskId, ...subtaskPayload } = input.payload;
        const values = createSubtaskSchema.parse(subtaskPayload);
        const [parent] = await tx
          .select({ id: tasks.id })
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
          .limit(1);
        if (!parent) throw new NotFoundError("Task");
        let position = values.position;
        if (position === undefined) {
          const [maxPosition] = await tx
            .select({
              max: sql<number>`COALESCE(MAX(${subtasks.position}), -1)`,
            })
            .from(subtasks)
            .where(eq(subtasks.taskId, taskId));
          position = (maxPosition?.max ?? -1) + 1;
        }
        const [row] = await tx
          .insert(subtasks)
          .values({ id: input.entityId, taskId, title: values.title, position })
          .returning();
        if (!row) throw new Error("Subtask creation failed");
        data = row;
        events.push({ type: "task:updated", payload: { taskId } });
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError("An expected subtask revision is required");
        const [current] = await tx
          .select({ subtask: subtasks, task: tasks })
          .from(subtasks)
          .innerJoin(tasks, eq(subtasks.taskId, tasks.id))
          .where(and(eq(subtasks.id, input.entityId), eq(tasks.userId, userId)))
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Subtask");
        if (current.subtask.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "subtask", current: current.subtask },
            events: [],
          };
        }
        if (input.operation === "delete") {
          const [deleted] = await tx
            .delete(subtasks)
            .where(
              and(
                eq(subtasks.id, input.entityId),
                eq(subtasks.revision, expectedRevision)
              )
            )
            .returning();
          if (!deleted)
            throw new ConflictError("Subtask changed. Refresh and retry.");
          data = deleted;
          events.push({
            type: "task:updated",
            payload: { taskId: current.subtask.taskId },
          });
        } else {
          const values = updateSubtaskSchema.parse(input.payload);
          const [row] = await tx
            .update(subtasks)
            .set({
              ...(values.title === undefined ? {} : { title: values.title }),
              ...(values.completed === undefined
                ? {}
                : { completed: values.completed }),
              ...(values.position === undefined
                ? {}
                : { position: values.position }),
              revision: current.subtask.revision + 1,
              updatedAt: now,
            })
            .where(
              and(
                eq(subtasks.id, input.entityId),
                eq(subtasks.revision, expectedRevision)
              )
            )
            .returning();
          if (!row)
            throw new ConflictError("Subtask changed. Refresh and retry.");
          data = row;
          events.push({
            type: "task:updated",
            payload: { taskId: row.taskId },
          });
        }
      }
    } else if (input.entityType === "subject") {
      if (input.operation === "create") {
        const values = createSubjectSchema.parse(input.payload);
        const [row] = await tx
          .insert(subjects)
          .values({
            id: input.entityId,
            userId,
            name: values.name,
            description: values.description ?? null,
            icon: values.icon ?? null,
            color: values.color ?? null,
            sortOrder: values.sortOrder ?? 0,
          })
          .returning();
        if (!row) throw new Error("Subject creation failed");
        data = row;
        events.push({
          type: "subject:created",
          payload: { subjectId: row.id },
        });
      } else if (input.operation === "update") {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError("An expected subject revision is required");
        const values = updateSubjectSchema.parse(input.payload);
        const [current] = await tx
          .select()
          .from(subjects)
          .where(
            and(eq(subjects.id, input.entityId), eq(subjects.userId, userId))
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Subject");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "subject", current },
            events: [],
          };
        }
        const [row] = await tx
          .update(subjects)
          .set({
            ...values,
            archivedAt:
              values.archivedAt === undefined
                ? current.archivedAt
                : values.archivedAt
                  ? new Date(values.archivedAt)
                  : null,
            revision: current.revision + 1,
            updatedAt: now,
          })
          .where(
            and(
              eq(subjects.id, input.entityId),
              eq(subjects.userId, userId),
              eq(subjects.revision, expectedRevision)
            )
          )
          .returning();
        if (!row)
          throw new ConflictError(
            "Subject changed. Review the latest version and retry."
          );
        data = row;
        events.push({
          type: "subject:updated",
          payload: { subjectId: row.id },
        });
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError("An expected subject revision is required");
        const [current] = await tx
          .select()
          .from(subjects)
          .where(
            and(eq(subjects.id, input.entityId), eq(subjects.userId, userId))
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Subject");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "subject", current },
            events: [],
          };
        }
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
              eq(assignments.subjectId, input.entityId),
              isNull(assignments.deletedAt)
            )
          )
          .returning({ id: assignments.id });
        await tx
          .delete(subjects)
          .where(
            and(eq(subjects.id, input.entityId), eq(subjects.userId, userId))
          );
        data = { ...current, deletedAt: now };
        events.push({
          type: "subject:deleted",
          payload: { subjectId: input.entityId },
        });
        for (const assignment of unlinkedAssignments)
          events.push({
            type: "assignment:updated",
            payload: { assignmentId: assignment.id },
          });
      }
    } else if (input.entityType === "assignment") {
      await lockStudyPlanningUser(tx, userId);
      if (input.operation === "create") {
        const values = createAssignmentSchema.parse(input.payload);
        if (values.subjectId) {
          const [ownedSubject] = await tx
            .select({ id: subjects.id })
            .from(subjects)
            .where(
              and(
                eq(subjects.id, values.subjectId),
                eq(subjects.userId, userId)
              )
            )
            .limit(1);
          if (!ownedSubject) throw new NotFoundError("Subject");
        }
        const [row] = await tx
          .insert(assignments)
          .values({
            id: input.entityId,
            userId,
            subjectId: values.subjectId ?? null,
            title: values.title,
            description: values.description ?? null,
            dueAt: new Date(values.dueAt),
            status: values.status ?? "not_started",
            priority: values.priority ?? "P2",
            estimatedMinutes: values.estimatedMinutes ?? null,
            completedMinutes: values.completedMinutes ?? 0,
          })
          .returning();
        if (!row) throw new Error("Assignment creation failed");
        data = row;
        events.push({
          type: "assignment:created",
          payload: { assignmentId: row.id },
        });
      } else if (input.operation === "update") {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError(
            "An expected assignment revision is required"
          );
        const values = updateAssignmentSchema.parse(input.payload);
        if (values.subjectId) {
          const [ownedSubject] = await tx
            .select({ id: subjects.id })
            .from(subjects)
            .where(
              and(
                eq(subjects.id, values.subjectId),
                eq(subjects.userId, userId)
              )
            )
            .limit(1);
          if (!ownedSubject) throw new NotFoundError("Subject");
        }
        const [current] = await tx
          .select()
          .from(assignments)
          .where(
            and(
              eq(assignments.id, input.entityId),
              eq(assignments.userId, userId),
              isNull(assignments.deletedAt)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Assignment");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "assignment", current },
            events: [],
          };
        }
        const [row] = await tx
          .update(assignments)
          .set({
            ...values,
            dueAt:
              values.dueAt === undefined
                ? current.dueAt
                : new Date(values.dueAt),
            revision: current.revision + 1,
            updatedAt: now,
          })
          .where(
            and(
              eq(assignments.id, input.entityId),
              eq(assignments.userId, userId),
              eq(assignments.revision, expectedRevision),
              isNull(assignments.deletedAt)
            )
          )
          .returning();
        if (!row)
          throw new ConflictError(
            "Assignment changed. Review the latest version and retry."
          );
        const updatedBlocks =
          values.title === undefined
            ? []
            : await tx
                .update(timeBlocks)
                .set({
                  title: `Study: ${values.title}`.slice(0, 255),
                  updatedAt: now,
                })
                .where(
                  and(
                    eq(timeBlocks.userId, userId),
                    inArray(
                      timeBlocks.studySessionId,
                      tx
                        .select({ id: studySessions.id })
                        .from(studySessions)
                        .where(
                          and(
                            eq(studySessions.userId, userId),
                            eq(studySessions.assignmentId, row.id),
                            eq(studySessions.status, "planned"),
                            isNull(studySessions.deletedAt)
                          )
                        )
                    )
                  )
                )
                .returning({ id: timeBlocks.id, date: timeBlocks.date });
        data = row;
        events.push({
          type: "assignment:updated",
          payload: { assignmentId: row.id },
        });
        for (const block of updatedBlocks)
          events.push({
            type: "timeblock:updated",
            payload: { timeBlockId: block.id, date: block.date },
          });
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError(
            "An expected assignment revision is required"
          );
        const [current] = await tx
          .select()
          .from(assignments)
          .where(
            and(
              eq(assignments.id, input.entityId),
              eq(assignments.userId, userId),
              isNull(assignments.deletedAt)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Assignment");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "assignment", current },
            events: [],
          };
        }
        const activeSessions = await tx
          .select({ id: studySessions.id })
          .from(studySessions)
          .where(
            and(
              eq(studySessions.userId, userId),
              eq(studySessions.assignmentId, input.entityId),
              eq(studySessions.status, "planned"),
              isNull(studySessions.deletedAt)
            )
          )
          .for("update");
        for (const session of activeSessions) {
          const block = await removeProjection(tx, userId, session.id, true);
          await tx
            .update(studySessions)
            .set({
              status: "cancelled",
              actualMinutes: null,
              completedAt: null,
              revision: sql`${studySessions.revision} + 1`,
              updatedAt: now,
            })
            .where(
              and(
                eq(studySessions.id, session.id),
                eq(studySessions.userId, userId),
                isNull(studySessions.deletedAt)
              )
            );
          events.push({
            type: "study-session:updated",
            payload: { sessionId: session.id, assignmentId: input.entityId },
          });
          if (block)
            events.push({
              type: "timeblock:deleted",
              payload: { timeBlockId: block.id, date: block.date },
            });
        }
        const [row] = await tx
          .update(assignments)
          .set({
            deletedAt: now,
            updatedAt: now,
            revision: current.revision + 1,
          })
          .where(
            and(
              eq(assignments.id, input.entityId),
              eq(assignments.userId, userId),
              eq(assignments.revision, expectedRevision),
              isNull(assignments.deletedAt)
            )
          )
          .returning();
        if (!row)
          throw new ConflictError(
            "Assignment changed. Review the latest version and retry."
          );
        data = row;
        events.push({
          type: "assignment:deleted",
          payload: { assignmentId: row.id },
        });
      }
    } else if (input.entityType === "study-note") {
      if (input.operation === "create") {
        const fields = z
          .object({
            title: z.string().trim().min(1).max(300),
            body: z.string().max(100_000),
            subjectId: uuidSchema.nullable().optional(),
            assignmentId: uuidSchema.nullable().optional(),
            studySessionId: uuidSchema.nullable().optional(),
          })
          .strict()
          .parse(input.payload);
        if (fields.subjectId) {
          const [owned] = await tx
            .select({ id: subjects.id })
            .from(subjects)
            .where(
              and(
                eq(subjects.id, fields.subjectId),
                eq(subjects.userId, userId)
              )
            )
            .limit(1);
          if (!owned) throw new NotFoundError("Subject");
        }
        if (fields.assignmentId) {
          const [owned] = await tx
            .select({ id: assignments.id })
            .from(assignments)
            .where(
              and(
                eq(assignments.id, fields.assignmentId),
                eq(assignments.userId, userId),
                isNull(assignments.deletedAt)
              )
            )
            .limit(1);
          if (!owned) throw new NotFoundError("Assignment");
        }
        if (fields.studySessionId) {
          const [owned] = await tx
            .select({ id: studySessions.id })
            .from(studySessions)
            .where(
              and(
                eq(studySessions.id, fields.studySessionId),
                eq(studySessions.userId, userId),
                isNull(studySessions.deletedAt)
              )
            )
            .limit(1);
          if (!owned) throw new NotFoundError("Study Session");
        }
        const [row] = await tx
          .insert(studyNotes)
          .values({ id: input.entityId, userId, ...fields })
          .returning();
        if (!row) throw new Error("Note creation failed");
        data = row;
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError("An expected note revision is required");
        const [current] = await tx
          .select()
          .from(studyNotes)
          .where(
            and(
              eq(studyNotes.id, input.entityId),
              eq(studyNotes.userId, userId),
              isNull(studyNotes.deletedAt)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Note");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "study-note", current },
            events: [],
          };
        }
        if (input.operation === "delete") {
          const [row] = await tx
            .update(studyNotes)
            .set({
              deletedAt: now,
              updatedAt: now,
              revision: current.revision + 1,
            })
            .where(
              and(
                eq(studyNotes.id, input.entityId),
                eq(studyNotes.userId, userId),
                eq(studyNotes.revision, expectedRevision)
              )
            )
            .returning();
          if (!row)
            throw new ConflictError(
              "Note changed. Review the latest version and retry."
            );
          data = row;
        } else {
          const fields = z
            .object({
              title: z.string().trim().min(1).max(300).optional(),
              body: z.string().max(100_000).optional(),
              subjectId: uuidSchema.nullable().optional(),
              assignmentId: uuidSchema.nullable().optional(),
              studySessionId: uuidSchema.nullable().optional(),
            })
            .strict()
            .refine((value) => Object.keys(value).length > 0)
            .parse(input.payload);
          if (fields.subjectId) {
            const [owned] = await tx
              .select({ id: subjects.id })
              .from(subjects)
              .where(
                and(
                  eq(subjects.id, fields.subjectId),
                  eq(subjects.userId, userId)
                )
              )
              .limit(1);
            if (!owned) throw new NotFoundError("Subject");
          }
          if (fields.assignmentId) {
            const [owned] = await tx
              .select({ id: assignments.id })
              .from(assignments)
              .where(
                and(
                  eq(assignments.id, fields.assignmentId),
                  eq(assignments.userId, userId),
                  isNull(assignments.deletedAt)
                )
              )
              .limit(1);
            if (!owned) throw new NotFoundError("Assignment");
          }
          if (fields.studySessionId) {
            const [owned] = await tx
              .select({ id: studySessions.id })
              .from(studySessions)
              .where(
                and(
                  eq(studySessions.id, fields.studySessionId),
                  eq(studySessions.userId, userId),
                  isNull(studySessions.deletedAt)
                )
              )
              .limit(1);
            if (!owned) throw new NotFoundError("Study Session");
          }
          const [row] = await tx
            .update(studyNotes)
            .set({ ...fields, revision: current.revision + 1, updatedAt: now })
            .where(
              and(
                eq(studyNotes.id, input.entityId),
                eq(studyNotes.userId, userId),
                eq(studyNotes.revision, expectedRevision)
              )
            )
            .returning();
          if (!row)
            throw new ConflictError(
              "Note changed. Review the latest version and retry."
            );
          data = row;
        }
      }
      events.push({ type: "learning:changed", payload: { kind: "notes" } });
    } else if (input.entityType === "study-session") {
      await lockStudyPlanningUser(tx, userId);
      if (input.operation === "create") {
        const values = sessionSchedulePayload
          .extend({ assignmentId: uuidSchema })
          .parse(input.payload);
        const [assignment] = await tx
          .select({
            id: assignments.id,
            userId: assignments.userId,
            title: assignments.title,
            status: assignments.status,
          })
          .from(assignments)
          .where(
            and(
              eq(assignments.id, values.assignmentId),
              eq(assignments.userId, userId),
              isNull(assignments.deletedAt)
            )
          )
          .limit(1)
          .for("update");
        if (!assignment) throw new NotFoundError("Assignment");
        if (
          assignment.status === "completed" ||
          assignment.status === "cancelled"
        )
          throw new ConflictError(
            "Cannot schedule new study for this Assignment"
          );
        const created = await createPlannedSessionInTransaction(
          tx,
          userId,
          assignment,
          values,
          undefined,
          input.entityId
        );
        data = created.session;
        events.push({
          type: "study-session:created",
          payload: {
            sessionId: created.session.id,
            assignmentId: created.session.assignmentId,
          },
        });
        events.push({
          type: "timeblock:created",
          payload: { timeBlockId: created.block.id, date: created.block.date },
        });
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError(
            "An expected Study Session revision is required"
          );
        const [current] = await tx
          .select()
          .from(studySessions)
          .where(
            and(
              eq(studySessions.id, input.entityId),
              eq(studySessions.userId, userId),
              isNull(studySessions.deletedAt)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Study Session");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "study-session", current },
            events: [],
          };
        }
        if (input.operation === "delete") {
          const [row] = await tx
            .update(studySessions)
            .set({
              deletedAt: now,
              updatedAt: now,
              revision: current.revision + 1,
            })
            .where(
              and(
                eq(studySessions.id, input.entityId),
                eq(studySessions.userId, userId),
                eq(studySessions.revision, expectedRevision),
                isNull(studySessions.deletedAt)
              )
            )
            .returning();
          if (!row)
            throw new ConflictError(
              "Study Session changed. Refresh and retry."
            );
          const block =
            current.status === "planned"
              ? await removeProjection(tx, userId, current.id, true)
              : null;
          data = row;
          events.push({
            type: "study-session:deleted",
            payload: { sessionId: row.id, assignmentId: row.assignmentId },
          });
          if (block)
            events.push({
              type: "timeblock:deleted",
              payload: { timeBlockId: block.id, date: block.date },
            });
        } else {
          const values = sessionMutationPayload.parse(input.payload);
          const action = values.action;
          if (
            action === "complete" ||
            action === "skip" ||
            action === "cancel"
          ) {
            if (action === "complete" && current.status !== "planned")
              throw new ConflictError(
                "Only planned Study Sessions can be completed"
              );
            if (action === "skip" && current.status !== "planned")
              throw new ConflictError(
                "Only planned Study Sessions can be skipped"
              );
            if (
              action === "cancel" &&
              current.status !== "planned" &&
              current.status !== "skipped"
            )
              throw new ConflictError(
                "Only planned or skipped Study Sessions can be cancelled"
              );
            const [row] = await tx
              .update(studySessions)
              .set({
                status:
                  action === "complete"
                    ? "completed"
                    : action === "skip"
                      ? "skipped"
                      : "cancelled",
                actualMinutes:
                  action === "complete"
                    ? (values.actualMinutes ?? current.plannedMinutes)
                    : null,
                completedAt: action === "complete" ? now : null,
                revision: current.revision + 1,
                updatedAt: now,
              })
              .where(
                and(
                  eq(studySessions.id, input.entityId),
                  eq(studySessions.userId, userId),
                  eq(studySessions.revision, expectedRevision),
                  isNull(studySessions.deletedAt)
                )
              )
              .returning();
            if (!row)
              throw new ConflictError(
                "Study Session changed. Refresh and retry."
              );
            const block =
              current.status === "planned"
                ? await removeProjection(tx, userId, current.id, true)
                : null;
            data = row;
            events.push({
              type: "study-session:updated",
              payload: { sessionId: row.id, assignmentId: row.assignmentId },
            });
            if (block)
              events.push({
                type: "timeblock:deleted",
                payload: { timeBlockId: block.id, date: block.date },
              });
          } else {
            if (current.status !== "planned" && current.status !== "skipped")
              throw new ConflictError(
                "This Study Session cannot be rescheduled in its current state"
              );
            const [assignment] = await tx
              .select({
                id: assignments.id,
                userId: assignments.userId,
                title: assignments.title,
                status: assignments.status,
              })
              .from(assignments)
              .where(
                and(
                  eq(assignments.id, current.assignmentId),
                  eq(assignments.userId, userId),
                  isNull(assignments.deletedAt)
                )
              )
              .limit(1)
              .for("update");
            if (!assignment) throw new NotFoundError("Assignment");
            if (
              assignment.status === "completed" ||
              assignment.status === "cancelled"
            )
              throw new ConflictError(
                "Cannot reschedule study for this Assignment"
              );
            const schedule = {
              startAt: values.startAt ?? current.startAt.toISOString(),
              endAt: values.endAt ?? current.endAt.toISOString(),
              timezone: values.timezone ?? current.timezone,
              plannedMinutes: values.plannedMinutes ?? current.plannedMinutes,
            };
            const projection = projectSchedule(schedule);
            const [row] = await tx
              .update(studySessions)
              .set({
                ...schedule,
                startAt: new Date(schedule.startAt),
                endAt: new Date(schedule.endAt),
                status: "planned",
                actualMinutes: null,
                completedAt: null,
                revision: current.revision + 1,
                updatedAt: now,
              })
              .where(
                and(
                  eq(studySessions.id, input.entityId),
                  eq(studySessions.userId, userId),
                  eq(studySessions.revision, expectedRevision),
                  isNull(studySessions.deletedAt)
                )
              )
              .returning();
            if (!row)
              throw new ConflictError(
                "Study Session changed. Refresh and retry."
              );
            const block =
              current.status === "skipped"
                ? await insertProjection(
                    tx,
                    userId,
                    row.id,
                    assignment.title,
                    projection
                  )
                : await updateProjection(
                    tx,
                    userId,
                    row.id,
                    assignment.title,
                    projection
                  );
            data = row;
            events.push({
              type: "study-session:updated",
              payload: { sessionId: row.id, assignmentId: row.assignmentId },
            });
            events.push({
              type: `timeblock:${block.type}`,
              payload: { timeBlockId: block.id, date: block.date },
            });
          }
        }
      }
    } else if (input.entityType === "resource") {
      if (input.operation === "create") {
        const values = resourceMutationPayload
          .required({ type: true, title: true, url: true })
          .parse(input.payload);
        if (!values.link)
          throw new ValidationError(
            "A resource must be linked to a StudyOS item"
          );
        await validateLearningLinks(tx, userId, values.link);
        const normalized = normalizeResourceUrl(values.url, values.type);
        const [row] = await tx
          .insert(resources)
          .values({
            id: input.entityId,
            userId,
            type: values.type,
            title: values.title,
            ...normalized,
          })
          .returning();
        if (!row) throw new Error("Resource creation failed");
        await tx
          .insert(resourceLinks)
          .values({ userId, resourceId: row.id, ...values.link });
        data = row;
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError(
            "An expected Resource revision is required"
          );
        const [current] = await tx
          .select()
          .from(resources)
          .where(
            and(
              eq(resources.id, input.entityId),
              eq(resources.userId, userId),
              isNull(resources.deletedAt)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Resource");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "resource", current },
            events: [],
          };
        }
        const values = resourceMutationPayload.parse(input.payload);
        const [row] = await tx
          .update(resources)
          .set({
            ...(values.title === undefined ? {} : { title: values.title }),
            ...(values.completed === undefined
              ? {}
              : { completedAt: values.completed ? now : null }),
            deletedAt: input.operation === "delete" ? now : current.deletedAt,
            revision: current.revision + 1,
            updatedAt: now,
          })
          .where(
            and(
              eq(resources.id, input.entityId),
              eq(resources.userId, userId),
              eq(resources.revision, expectedRevision),
              isNull(resources.deletedAt)
            )
          )
          .returning();
        if (!row)
          throw new ConflictError("Resource changed. Refresh and retry.");
        data = row;
      }
      events.push({ type: "learning:changed", payload: { kind: "resources" } });
    } else if (input.entityType === "study-reminder") {
      const values = reminderMutationPayload.parse(input.payload);
      if (input.operation === "create") {
        if (!values.title || !values.remindAt)
          throw new ValidationError("Reminder title and time are required");
        await validateLearningLinks(tx, userId, values);
        const [row] = await tx
          .insert(studyReminders)
          .values({
            id: input.entityId,
            userId,
            title: values.title,
            remindAt: new Date(values.remindAt),
            subjectId: values.subjectId ?? null,
            assignmentId: values.assignmentId ?? null,
            studySessionId: values.studySessionId ?? null,
            quizId: values.quizId ?? null,
          })
          .returning();
        if (!row) throw new Error("Reminder creation failed");
        data = row;
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError(
            "An expected Reminder revision is required"
          );
        const [current] = await tx
          .select()
          .from(studyReminders)
          .where(
            and(
              eq(studyReminders.id, input.entityId),
              eq(studyReminders.userId, userId)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Reminder");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "study-reminder", current },
            events: [],
          };
        }
        await validateLearningLinks(tx, userId, values);
        const [row] = await tx
          .update(studyReminders)
          .set({
            ...(values.title === undefined ? {} : { title: values.title }),
            ...(values.remindAt === undefined
              ? {}
              : { remindAt: new Date(values.remindAt) }),
            ...(values.subjectId === undefined
              ? {}
              : { subjectId: values.subjectId }),
            ...(values.assignmentId === undefined
              ? {}
              : { assignmentId: values.assignmentId }),
            ...(values.studySessionId === undefined
              ? {}
              : { studySessionId: values.studySessionId }),
            ...(values.quizId === undefined ? {} : { quizId: values.quizId }),
            ...(input.operation === "delete"
              ? { state: "cancelled" }
              : values.state === undefined
                ? {}
                : { state: values.state }),
            revision: current.revision + 1,
            updatedAt: now,
          })
          .where(
            and(
              eq(studyReminders.id, input.entityId),
              eq(studyReminders.userId, userId),
              eq(studyReminders.revision, expectedRevision)
            )
          )
          .returning();
        if (!row)
          throw new ConflictError("Reminder changed. Refresh and retry.");
        data = row;
      }
      events.push({ type: "learning:changed", payload: { kind: "reminders" } });
    } else if (input.entityType === "focus-session") {
      const values = focusMutationPayload.parse(input.payload);
      if (input.operation === "create") {
        const links = {
          subjectId: values.subjectId,
          assignmentId: values.assignmentId,
          studySessionId: values.studySessionId,
        };
        await validateLearningLinks(tx, userId, links);
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 17))`
        );
        const [active] = await tx
          .select()
          .from(focusSessions)
          .where(
            and(
              eq(focusSessions.userId, userId),
              eq(focusSessions.state, "active")
            )
          )
          .limit(1);
        if (active)
          throw new ConflictError(
            "Finish or cancel your current focus session first"
          );
        const [row] = await tx
          .insert(focusSessions)
          .values({ id: input.entityId, userId, ...links })
          .returning();
        if (!row) throw new Error("Focus session creation failed");
        data = row;
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError(
            "An expected Focus Session revision is required"
          );
        const [current] = await tx
          .select()
          .from(focusSessions)
          .where(
            and(
              eq(focusSessions.id, input.entityId),
              eq(focusSessions.userId, userId)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Focus session");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "focus-session", current },
            events: [],
          };
        }
        if (current.state !== "active")
          throw new ConflictError("This focus session is already closed");
        const endedAt = now;
        const [row] = await tx
          .update(focusSessions)
          .set({
            state:
              values.action === "cancel" || input.operation === "delete"
                ? "cancelled"
                : "completed",
            endedAt,
            durationSeconds: Math.max(
              0,
              Math.floor(
                (endedAt.getTime() - current.startedAt.getTime()) / 1000
              )
            ),
            revision: current.revision + 1,
            updatedAt: now,
          })
          .where(
            and(
              eq(focusSessions.id, input.entityId),
              eq(focusSessions.userId, userId),
              eq(focusSessions.revision, expectedRevision)
            )
          )
          .returning();
        if (!row)
          throw new ConflictError("Focus session changed. Refresh and retry.");
        data = row;
      }
      events.push({ type: "learning:changed", payload: { kind: "focus" } });
    } else if (input.entityType === "quiz") {
      const values =
        input.operation === "delete"
          ? {
              title: "",
              description: null,
              subjectId: null,
              assignmentId: null,
              resourceId: null,
              status: "draft" as const,
              questions: [],
            }
          : quizMutationPayload.parse(input.payload);
      await validateLearningLinks(tx, userId, {
        subjectId: values.subjectId,
        assignmentId: values.assignmentId,
        resourceId: values.resourceId,
      });
      validateQuestions(values.questions);
      for (const question of values.questions)
        if (question.sourceResourceId)
          await validateLearningLinks(tx, userId, {
            resourceId: question.sourceResourceId,
          });
      if (input.operation === "create") {
        const [row] = await tx
          .insert(quizzes)
          .values({
            id: input.entityId,
            userId,
            title: values.title,
            description: values.description ?? null,
            subjectId: values.subjectId ?? null,
            assignmentId: values.assignmentId ?? null,
            resourceId: values.resourceId ?? null,
            status: values.status,
          })
          .returning();
        if (!row) throw new Error("Quiz creation failed");
        for (const [position, question] of values.questions.entries()) {
          const [createdQuestion] = await tx
            .insert(quizQuestions)
            .values({
              quizId: row.id,
              position,
              type: question.type,
              prompt: question.prompt,
              explanation: question.explanation ?? null,
              sourceResourceId: question.sourceResourceId ?? null,
              sourceReference: question.sourceReference ?? null,
              provenance: { source: "manual" },
            })
            .returning();
          if (!createdQuestion)
            throw new Error("Quiz question creation failed");
          await tx.insert(quizOptions).values(
            question.options.map((option, optionPosition) => ({
              questionId: createdQuestion.id,
              position: optionPosition,
              text: option.text,
              isCorrect: option.isCorrect,
            }))
          );
        }
        data = row;
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision)
          throw new ValidationError("An expected Quiz revision is required");
        const [current] = await tx
          .select()
          .from(quizzes)
          .where(
            and(
              eq(quizzes.id, input.entityId),
              eq(quizzes.userId, userId),
              isNull(quizzes.deletedAt)
            )
          )
          .limit(1)
          .for("update");
        if (!current) throw new NotFoundError("Quiz");
        if (current.revision !== expectedRevision) {
          await tx
            .delete(syncMutationReceipts)
            .where(eq(syncMutationReceipts.id, reservation.id));
          return {
            replayed: false,
            conflict: { entityType: "quiz", current },
            events: [],
          };
        }
        const [row] = await tx
          .update(quizzes)
          .set({
            ...(input.operation === "delete"
              ? {}
              : {
                  title: values.title,
                  description: values.description ?? null,
                  subjectId: values.subjectId ?? null,
                  assignmentId: values.assignmentId ?? null,
                  resourceId: values.resourceId ?? null,
                  status: values.status,
                }),
            revision: current.revision + 1,
            updatedAt: now,
            ...(input.operation === "delete" ? { deletedAt: now } : {}),
          })
          .where(
            and(
              eq(quizzes.id, input.entityId),
              eq(quizzes.userId, userId),
              eq(quizzes.revision, expectedRevision),
              isNull(quizzes.deletedAt)
            )
          )
          .returning();
        if (!row) throw new ConflictError("Quiz changed. Refresh and retry.");
        if (input.operation !== "delete") {
          await tx
            .delete(quizQuestions)
            .where(eq(quizQuestions.quizId, row.id));
          for (const [position, question] of values.questions.entries()) {
            const [createdQuestion] = await tx
              .insert(quizQuestions)
              .values({
                quizId: row.id,
                position,
                type: question.type,
                prompt: question.prompt,
                explanation: question.explanation ?? null,
                sourceResourceId: question.sourceResourceId ?? null,
                sourceReference: question.sourceReference ?? null,
                provenance: { source: "manual" },
              })
              .returning();
            if (!createdQuestion)
              throw new Error("Quiz question creation failed");
            await tx.insert(quizOptions).values(
              question.options.map((option, optionPosition) => ({
                questionId: createdQuestion.id,
                position: optionPosition,
                text: option.text,
                isCorrect: option.isCorrect,
              }))
            );
          }
        }
        data = row;
      }
      events.push({ type: "learning:changed", payload: { kind: "quizzes" } });
    }
    const response = {
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      data,
    };
    await tx
      .update(syncMutationReceipts)
      .set({ response, completedAt: now })
      .where(eq(syncMutationReceipts.id, reservation.id));
    return { replayed: false, response, events };
  });
  if ("conflict" in outcome && outcome.conflict) {
    return c.json(
      {
        success: false,
        error: {
          code: "SYNC_CONFLICT",
          message: "This item changed on another device.",
        },
        data: outcome.conflict,
      },
      409
    );
  }
  if (!outcome.replayed)
    for (const event of outcome.events)
      void publishEvent(userId, event.type, event.payload);
  return c.json({
    success: true,
    data: { ...outcome.response, replayed: outcome.replayed },
  });
});

export { router as syncRouter };
