import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, getDb, gt, inArray, isNull, lt, sql, syncBootstrapSnapshots, syncChanges, userSyncStates, accountDevices } from "@open-sunsama/database";
import { auth, type AuthVariables } from "../middleware/auth.js";
import { ValidationError, NotFoundError, uuidSchema } from "@open-sunsama/utils";
import { z } from "zod";
import { createHash } from "node:crypto";
import { assignments, subjects, studyNotes, studySessions, timeBlocks, syncMutationReceipts } from "@open-sunsama/database";
import { ConflictError } from "@open-sunsama/utils";
import { createAssignmentSchema, updateAssignmentSchema } from "../validation/assignments.js";
import { createSubjectSchema, updateSubjectSchema } from "../validation/subjects.js";
import { lockStudyPlanningUser } from "../services/study-sessions.js";
import { publishEvent } from "../lib/websocket/index.js";
import type { WebSocketEventType } from "../lib/websocket/events.js";

const router = new Hono<{ Variables: AuthVariables }>();
router.use("*", auth);
const bootstrapRequest = z.object({
  deviceId: uuidSchema.optional(),
  pageToken: z.string().max(256).optional(),
  pageSize: z.coerce.number().int().min(1).max(500).default(200),
}).strict();
const pullQuery = z.object({ cursor: z.string().regex(/^\d{1,16}$/), limit: z.coerce.number().int().min(1).max(500).default(200), deviceId: uuidSchema.optional() });
const mutationSchema = z.object({
  clientMutationId: uuidSchema,
  entityType: z.enum(["subject", "assignment", "study-note"]),
  operation: z.enum(["create", "update", "delete"]),
  entityId: uuidSchema,
  expectedRevision: z.number().int().positive().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
}).strict();

function requireSessionPrincipal(c: { get: (key: "authMethod") => "jwt" | "api-key" | "oauth" | "cookie" }) {
  if (c.get("authMethod") !== "jwt" && c.get("authMethod") !== "cookie") {
    throw new ValidationError("Synchronization requires a StudyOS sign-in session");
  }
}

const SNAPSHOT_TABLES = [
  "tasks", "subtasks", "time_blocks", "task_series", "ideas", "idea_boards", "idea_columns", "idea_subtasks",
  "subjects", "assignments", "study_sessions", "resources", "resource_links", "study_notes", "study_reminders",
  "focus_sessions", "quizzes", "quiz_attempts", "attachments",
] as const;

async function collectBootstrapEntries(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], userId: string) {
  const entries: Array<{ entityType: string; entityId: string; data: unknown }> = [];
  for (const tableName of SNAPSHOT_TABLES) {
    const ownerExpression = tableName === "subtasks"
      ? sql`(SELECT parent.user_id FROM tasks AS parent WHERE parent.id = row.task_id)`
      : tableName === "idea_subtasks"
        ? sql`(SELECT parent.user_id FROM ideas AS parent WHERE parent.id = row.idea_id)`
      : sql`row.user_id`;
    const dataExpression = tableName === "quiz_attempts"
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
    const rows = (result as unknown as Array<{ rows: Array<Record<string, unknown>> }>)[0]?.rows ?? [];
    for (const row of rows) entries.push({
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
    for (const row of rows as unknown as Array<{ kind: string; entity_id: string; row_data: unknown }>) {
      entries.push({ entityType: row.kind, entityId: row.entity_id, data: row.row_data });
    }
  }
  const userResult = await tx.execute(sql`
    SELECT jsonb_build_object('id', id, 'email', email, 'name', name, 'avatarUrl', avatar_url, 'timezone', timezone,
      'preferences', preferences, 'createdAt', created_at, 'updatedAt', updated_at) AS profile
    FROM public.users WHERE id = ${userId}::uuid
  `);
  const profile = (userResult as unknown as Array<{ profile: Record<string, unknown> }>)[0]?.profile;
  if (profile) entries.push({ entityType: "profile", entityId: userId, data: profile });
  entries.sort((a, b) => a.entityType.localeCompare(b.entityType) || a.entityId.localeCompare(b.entityId));
  if (entries.length > 50_000) throw new ValidationError("Account data is too large for a single initial sync snapshot");
  return entries;
}

function encodePageToken(snapshotId: string, offset: number) {
  return Buffer.from(`${snapshotId}:${offset}`).toString("base64url");
}
function decodePageToken(value: string): { snapshotId: string; offset: number } | null {
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const [snapshotId, rawOffset] = decoded.split(":");
    const offset = Number(rawOffset);
    if (!snapshotId || !/^[0-9a-f-]{36}$/i.test(snapshotId) || !Number.isSafeInteger(offset) || offset < 0) return null;
    return { snapshotId, offset };
  } catch { return null; }
}

router.post("/bootstrap", zValidator("json", bootstrapRequest), async (c) => {
  requireSessionPrincipal(c);
  const userId = c.get("userId"), input = c.req.valid("json"), db = getDb();
  let snapshotId: string, offset: number, snapshotSequence: number, entries: Array<{ entityType: string; entityId: string; data: unknown }>;
  if (input.pageToken) {
    const page = decodePageToken(input.pageToken);
    if (!page) throw new ValidationError("Invalid bootstrap page token");
    const [snapshot] = await db.select().from(syncBootstrapSnapshots).where(and(
      eq(syncBootstrapSnapshots.id, page.snapshotId), eq(syncBootstrapSnapshots.userId, userId), gt(syncBootstrapSnapshots.expiresAt, new Date()),
    )).limit(1);
    if (!snapshot) throw new NotFoundError("Bootstrap snapshot expired; start a new sync");
    if (input.deviceId && snapshot.deviceId !== input.deviceId) throw new NotFoundError("Bootstrap snapshot not found");
    snapshotId = snapshot.id; offset = page.offset; snapshotSequence = snapshot.snapshotSequence; entries = snapshot.entries;
  } else {
    if (input.deviceId) {
      const [device] = await db.select({ id: accountDevices.id }).from(accountDevices).where(and(
        eq(accountDevices.id, input.deviceId), eq(accountDevices.userId, userId), isNull(accountDevices.revokedAt),
      )).limit(1);
      if (!device) throw new NotFoundError("Device not found");
    }
    const snapshot = await db.transaction(async (tx) => {
      await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`);
      const [state] = await tx.select({ sequence: userSyncStates.sequence }).from(userSyncStates).where(eq(userSyncStates.userId, userId)).limit(1);
      return { sequence: state?.sequence ?? 0, entries: await collectBootstrapEntries(tx, userId) };
    });
    snapshotSequence = snapshot.sequence;
    entries = snapshot.entries;
    const [saved] = await db.insert(syncBootstrapSnapshots).values({
      userId, deviceId: input.deviceId ?? null, snapshotSequence,
      entries, expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    }).returning({ id: syncBootstrapSnapshots.id });
    if (!saved) throw new Error("Failed to preserve sync snapshot");
    snapshotId = saved.id; offset = 0;
    await db.delete(syncBootstrapSnapshots).where(lt(syncBootstrapSnapshots.expiresAt, new Date()));
  }
  if (offset > entries.length) throw new ValidationError("Invalid bootstrap page offset");
  const page = entries.slice(offset, offset + input.pageSize);
  const nextOffset = offset + page.length;
  const complete = nextOffset >= entries.length;
  const nextPageToken = complete ? null : encodePageToken(snapshotId, nextOffset);
  return c.json({ success: true, data: {
    snapshotId, snapshotSequence: String(snapshotSequence), entries: page,
    complete, nextPageToken, nextCursor: complete ? String(snapshotSequence) : null,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  } });
});

router.get("/changes", zValidator("query", pullQuery), async (c) => {
  requireSessionPrincipal(c);
  const userId = c.get("userId"), input = c.req.valid("query"), cursor = Number(input.cursor), db = getDb();
  if (!Number.isSafeInteger(cursor)) throw new ValidationError("Invalid sync cursor");
  if (input.deviceId) {
    const [device] = await db.select({ id: accountDevices.id }).from(accountDevices).where(and(
      eq(accountDevices.id, input.deviceId), eq(accountDevices.userId, userId), isNull(accountDevices.revokedAt),
    )).limit(1);
    if (!device) throw new NotFoundError("Device not found");
  }
  const [state] = await db.select().from(userSyncStates).where(eq(userSyncStates.userId, userId)).limit(1);
  const currentSequence = state?.sequence ?? 0;
  if (cursor < (state?.retentionFloor ?? 0)) {
    return c.json({ success: false, error: { code: "BOOTSTRAP_REQUIRED", message: "This sync cursor is no longer retained" }, data: { minimumCursor: String(state?.retentionFloor ?? 0) } }, 410);
  }
  const changes = await db.select({
    sequence: syncChanges.sequence, entityType: syncChanges.entityType, entityId: syncChanges.entityId,
    revision: syncChanges.revision, operation: syncChanges.operation, payload: syncChanges.payload, changedAt: syncChanges.changedAt,
  }).from(syncChanges).where(and(eq(syncChanges.userId, userId), gt(syncChanges.sequence, cursor))).orderBy(asc(syncChanges.sequence)).limit(input.limit);
  const nextCursor = changes.length ? String(changes[changes.length - 1]!.sequence) : String(currentSequence);
  if (input.deviceId && (!changes.length || changes.length < input.limit)) {
    await db.update(accountDevices).set({ lastActiveAt: new Date(), lastSuccessfulSyncAt: new Date(), lastSyncSequence: Number(nextCursor) }).where(and(
      eq(accountDevices.id, input.deviceId), eq(accountDevices.userId, userId), isNull(accountDevices.revokedAt),
    ));
  }
  return c.json({ success: true, data: { changes, nextCursor, hasMore: changes.length === input.limit, currentSequence: String(currentSequence) } });
});

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

router.post("/mutations", zValidator("json", mutationSchema), async (c) => {
  requireSessionPrincipal(c);
  const userId = c.get("userId"), input = c.req.valid("json"), db = getDb();
  const requestHash = createHash("sha256").update(stableJson(input)).digest("hex");
  const outcome = await db.transaction(async (tx) => {
    const [reservation] = await tx.insert(syncMutationReceipts).values({
      userId, clientMutationId: input.clientMutationId, requestHash, response: null,
    }).onConflictDoNothing().returning({ id: syncMutationReceipts.id });
    if (!reservation) {
      const [existing] = await tx.select().from(syncMutationReceipts).where(and(
        eq(syncMutationReceipts.userId, userId), eq(syncMutationReceipts.clientMutationId, input.clientMutationId),
      )).limit(1).for("update");
      if (!existing) throw new Error("Mutation receipt could not be read");
      if (existing.requestHash !== requestHash) throw new ConflictError("This saved change ID was already used for different content.");
      if (!existing.response) throw new ConflictError("This saved change is still being processed; retry shortly.");
      return { replayed: true, response: existing.response as Record<string, unknown>, events: [] as Array<{ type: WebSocketEventType; payload: unknown }> };
    }

    let data: Record<string, unknown>;
    const events: Array<{ type: WebSocketEventType; payload: unknown }> = [];
    const now = new Date();
    if (input.entityType === "subject") {
      if (input.operation === "create") {
        const values = createSubjectSchema.parse(input.payload);
        const [row] = await tx.insert(subjects).values({
          id: input.entityId, userId, name: values.name, description: values.description ?? null,
          icon: values.icon ?? null, color: values.color ?? null, sortOrder: values.sortOrder ?? 0,
        }).returning();
        if (!row) throw new Error("Subject creation failed");
        data = row;
        events.push({ type: "subject:created", payload: { subjectId: row.id } });
      } else if (input.operation === "update") {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision) throw new ValidationError("An expected subject revision is required");
        const values = updateSubjectSchema.parse(input.payload);
        const [current] = await tx.select().from(subjects).where(and(eq(subjects.id, input.entityId), eq(subjects.userId, userId))).limit(1).for("update");
        if (!current) throw new NotFoundError("Subject");
        if (current.revision !== expectedRevision) {
          await tx.delete(syncMutationReceipts).where(eq(syncMutationReceipts.id, reservation.id));
          return { replayed: false, conflict: { entityType: "subject", current }, events: [] };
        }
        const [row] = await tx.update(subjects).set({
          ...values,
          archivedAt: values.archivedAt === undefined ? current.archivedAt : values.archivedAt ? new Date(values.archivedAt) : null,
          revision: current.revision + 1,
          updatedAt: now,
        }).where(and(eq(subjects.id, input.entityId), eq(subjects.userId, userId), eq(subjects.revision, expectedRevision))).returning();
        if (!row) throw new ConflictError("Subject changed. Review the latest version and retry.");
        data = row;
        events.push({ type: "subject:updated", payload: { subjectId: row.id } });
      } else {
        throw new ValidationError("Subjects cannot be deleted through offline sync; archive the subject instead");
      }
    } else if (input.entityType === "assignment") {
      await lockStudyPlanningUser(tx, userId);
      if (input.operation === "create") {
        const values = createAssignmentSchema.parse(input.payload);
        if (values.subjectId) {
          const [ownedSubject] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, values.subjectId), eq(subjects.userId, userId))).limit(1);
          if (!ownedSubject) throw new NotFoundError("Subject");
        }
        const [row] = await tx.insert(assignments).values({
          id: input.entityId, userId, subjectId: values.subjectId ?? null, title: values.title,
          description: values.description ?? null, dueAt: new Date(values.dueAt), status: values.status ?? "not_started",
          priority: values.priority ?? "P2", estimatedMinutes: values.estimatedMinutes ?? null,
          completedMinutes: values.completedMinutes ?? 0,
        }).returning();
        if (!row) throw new Error("Assignment creation failed");
        data = row;
        events.push({ type: "assignment:created", payload: { assignmentId: row.id } });
      } else if (input.operation === "update") {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision) throw new ValidationError("An expected assignment revision is required");
        const values = updateAssignmentSchema.parse(input.payload);
        if (values.subjectId) {
          const [ownedSubject] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, values.subjectId), eq(subjects.userId, userId))).limit(1);
          if (!ownedSubject) throw new NotFoundError("Subject");
        }
        const [current] = await tx.select().from(assignments).where(and(eq(assignments.id, input.entityId), eq(assignments.userId, userId), isNull(assignments.deletedAt))).limit(1).for("update");
        if (!current) throw new NotFoundError("Assignment");
        if (current.revision !== expectedRevision) {
          await tx.delete(syncMutationReceipts).where(eq(syncMutationReceipts.id, reservation.id));
          return { replayed: false, conflict: { entityType: "assignment", current }, events: [] };
        }
        const [row] = await tx.update(assignments).set({
          ...values,
          dueAt: values.dueAt === undefined ? current.dueAt : new Date(values.dueAt),
          revision: current.revision + 1, updatedAt: now,
        }).where(and(eq(assignments.id, input.entityId), eq(assignments.userId, userId), eq(assignments.revision, expectedRevision), isNull(assignments.deletedAt))).returning();
        if (!row) throw new ConflictError("Assignment changed. Review the latest version and retry.");
        const updatedBlocks = values.title === undefined ? [] : await tx.update(timeBlocks).set({ title: `Study: ${values.title}`.slice(0, 255), updatedAt: now }).where(and(
          eq(timeBlocks.userId, userId), inArray(timeBlocks.studySessionId, tx.select({ id: studySessions.id }).from(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.assignmentId, row.id), eq(studySessions.status, "planned"), isNull(studySessions.deletedAt)))),
        )).returning({ id: timeBlocks.id, date: timeBlocks.date });
        data = row;
        events.push({ type: "assignment:updated", payload: { assignmentId: row.id } });
        for (const block of updatedBlocks) events.push({ type: "timeblock:updated", payload: { timeBlockId: block.id, date: block.date } });
      } else {
        throw new ValidationError("Assignments cannot be deleted through offline sync; use the assignment screen");
      }
    } else {
      if (input.operation === "create") {
        const fields = z.object({
          title: z.string().trim().min(1).max(300), body: z.string().max(100_000),
          subjectId: uuidSchema.nullable().optional(), assignmentId: uuidSchema.nullable().optional(), studySessionId: uuidSchema.nullable().optional(),
        }).strict().parse(input.payload);
        if (fields.subjectId) {
          const [owned] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, fields.subjectId), eq(subjects.userId, userId))).limit(1);
          if (!owned) throw new NotFoundError("Subject");
        }
        if (fields.assignmentId) {
          const [owned] = await tx.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.id, fields.assignmentId), eq(assignments.userId, userId), isNull(assignments.deletedAt))).limit(1);
          if (!owned) throw new NotFoundError("Assignment");
        }
        if (fields.studySessionId) {
          const [owned] = await tx.select({ id: studySessions.id }).from(studySessions).where(and(eq(studySessions.id, fields.studySessionId), eq(studySessions.userId, userId), isNull(studySessions.deletedAt))).limit(1);
          if (!owned) throw new NotFoundError("Study Session");
        }
        const [row] = await tx.insert(studyNotes).values({ id: input.entityId, userId, ...fields }).returning();
        if (!row) throw new Error("Note creation failed");
        data = row;
      } else {
        const expectedRevision = input.expectedRevision;
        if (!expectedRevision) throw new ValidationError("An expected note revision is required");
        const [current] = await tx.select().from(studyNotes).where(and(eq(studyNotes.id, input.entityId), eq(studyNotes.userId, userId), isNull(studyNotes.deletedAt))).limit(1).for("update");
        if (!current) throw new NotFoundError("Note");
        if (current.revision !== expectedRevision) {
          await tx.delete(syncMutationReceipts).where(eq(syncMutationReceipts.id, reservation.id));
          return { replayed: false, conflict: { entityType: "study-note", current }, events: [] };
        }
        if (input.operation === "delete") {
          const [row] = await tx.update(studyNotes).set({ deletedAt: now, updatedAt: now, revision: current.revision + 1 }).where(and(eq(studyNotes.id, input.entityId), eq(studyNotes.userId, userId), eq(studyNotes.revision, expectedRevision))).returning();
          if (!row) throw new ConflictError("Note changed. Review the latest version and retry.");
          data = row;
        } else {
          const fields = z.object({
            title: z.string().trim().min(1).max(300).optional(), body: z.string().max(100_000).optional(),
            subjectId: uuidSchema.nullable().optional(), assignmentId: uuidSchema.nullable().optional(), studySessionId: uuidSchema.nullable().optional(),
          }).strict().refine((value) => Object.keys(value).length > 0).parse(input.payload);
          if (fields.subjectId) {
            const [owned] = await tx.select({ id: subjects.id }).from(subjects).where(and(eq(subjects.id, fields.subjectId), eq(subjects.userId, userId))).limit(1);
            if (!owned) throw new NotFoundError("Subject");
          }
          if (fields.assignmentId) {
            const [owned] = await tx.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.id, fields.assignmentId), eq(assignments.userId, userId), isNull(assignments.deletedAt))).limit(1);
            if (!owned) throw new NotFoundError("Assignment");
          }
          if (fields.studySessionId) {
            const [owned] = await tx.select({ id: studySessions.id }).from(studySessions).where(and(eq(studySessions.id, fields.studySessionId), eq(studySessions.userId, userId), isNull(studySessions.deletedAt))).limit(1);
            if (!owned) throw new NotFoundError("Study Session");
          }
          const [row] = await tx.update(studyNotes).set({ ...fields, revision: current.revision + 1, updatedAt: now }).where(and(eq(studyNotes.id, input.entityId), eq(studyNotes.userId, userId), eq(studyNotes.revision, expectedRevision))).returning();
          if (!row) throw new ConflictError("Note changed. Review the latest version and retry.");
          data = row;
        }
        events.push({ type: "learning:changed", payload: { kind: "notes" } });
      }
    }
    const response = { entityType: input.entityType, entityId: input.entityId, operation: input.operation, data };
    await tx.update(syncMutationReceipts).set({ response, completedAt: now }).where(eq(syncMutationReceipts.id, reservation.id));
    return { replayed: false, response, events };
  });
  if ("conflict" in outcome && outcome.conflict) {
    return c.json({ success: false, error: { code: "SYNC_CONFLICT", message: "This item changed on another device." }, data: outcome.conflict }, 409);
  }
  if (!outcome.replayed) for (const event of outcome.events) void publishEvent(userId, event.type, event.payload);
  return c.json({ success: true, data: { ...outcome.response, replayed: outcome.replayed } });
});

export { router as syncRouter };
