import {
  and,
  assignments,
  eq,
  getDb,
  isNull,
  sql,
  studySessions,
  timeBlocks,
  type DbClient,
  type StudySession,
} from "@open-sunsama/database";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@open-sunsama/utils";
import { publishEvent } from "../lib/websocket/index.js";

type DbTransaction = Parameters<Parameters<DbClient["transaction"]>[0]>[0];

export interface SessionScheduleInput {
  startAt: string;
  endAt: string;
  timezone: string;
  plannedMinutes: number;
}

type SchedulePatch = Partial<SessionScheduleInput>;
type Projection = {
  date: string;
  startTime: string;
  endTime: string;
  durationMins: number;
};
type BlockEvent = {
  type: "created" | "updated" | "deleted";
  id: string;
  date: string;
  previousDate?: string;
};

function localParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (name: string) =>
    parts.find((entry) => entry.type === name)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

/** Reject windows the inherited same-day HH:mm Time Block cannot represent. */
export function projectSchedule(input: SessionScheduleInput): Projection {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  if (
    !/^[A-Za-z]/.test(input.timezone) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    !Number.isInteger(input.plannedMinutes) ||
    input.plannedMinutes < 1 ||
    input.plannedMinutes > 1439 ||
    end.getTime() - start.getTime() !== input.plannedMinutes * 60_000 ||
    start.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0 ||
    end.getUTCSeconds() !== 0 ||
    end.getUTCMilliseconds() !== 0
  ) {
    throw new ValidationError(
      "Schedule must be a positive, minute-aligned window matching plannedMinutes"
    );
  }
  let localStart: ReturnType<typeof localParts>;
  let localEnd: ReturnType<typeof localParts>;
  try {
    localStart = localParts(start, input.timezone);
    localEnd = localParts(end, input.timezone);
  } catch {
    throw new ValidationError("A valid IANA timezone is required");
  }
  const [startHour, startMinute] = localStart.time.split(":").map(Number);
  const [endHour, endMinute] = localEnd.time.split(":").map(Number);
  const wallMinutes =
    (endHour ?? 0) * 60 +
    (endMinute ?? 0) -
    (startHour ?? 0) * 60 -
    (startMinute ?? 0);
  if (
    localStart.date !== localEnd.date ||
    wallMinutes !== input.plannedMinutes
  ) {
    throw new ValidationError(
      "Study Sessions must fit one local calendar day without a timezone-offset transition"
    );
  }
  return {
    date: localStart.date,
    startTime: localStart.time,
    endTime: localEnd.time,
    durationMins: input.plannedMinutes,
  };
}

function blockTitle(assignmentTitle: string) {
  return `Study: ${assignmentTitle}`.slice(0, 255);
}

async function insertProjection(
  tx: DbTransaction,
  userId: string,
  sessionId: string,
  assignmentTitle: string,
  projection: Projection
): Promise<BlockEvent> {
  const [position] = await tx
    .select({
      next: sql<number>`COALESCE(MAX(${timeBlocks.position}), -1)::int + 1`,
    })
    .from(timeBlocks)
    .where(
      and(eq(timeBlocks.userId, userId), eq(timeBlocks.date, projection.date))
    );
  const [block] = await tx
    .insert(timeBlocks)
    .values({
      userId,
      studySessionId: sessionId,
      taskId: null,
      title: blockTitle(assignmentTitle),
      ...projection,
      position: position?.next ?? 0,
    })
    .returning({ id: timeBlocks.id, date: timeBlocks.date });
  if (!block) throw new Error("Failed to create Study Session projection");
  return { type: "created", id: block.id, date: block.date };
}

async function updateProjection(
  tx: DbTransaction,
  userId: string,
  sessionId: string,
  assignmentTitle: string,
  projection: Projection
): Promise<BlockEvent> {
  const [previous] = await tx
    .select({ id: timeBlocks.id, date: timeBlocks.date })
    .from(timeBlocks)
    .where(
      and(
        eq(timeBlocks.studySessionId, sessionId),
        eq(timeBlocks.userId, userId)
      )
    )
    .limit(1)
    .for("update");
  if (!previous)
    throw new ConflictError("Study Session calendar projection is missing");
  let position: number | undefined;
  if (previous.date !== projection.date) {
    const [next] = await tx
      .select({
        next: sql<number>`COALESCE(MAX(${timeBlocks.position}), -1)::int + 1`,
      })
      .from(timeBlocks)
      .where(
        and(eq(timeBlocks.userId, userId), eq(timeBlocks.date, projection.date))
      );
    position = next?.next ?? 0;
  }
  const [block] = await tx
    .update(timeBlocks)
    .set({
      ...projection,
      ...(position === undefined ? {} : { position }),
      title: blockTitle(assignmentTitle),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(timeBlocks.studySessionId, sessionId),
        eq(timeBlocks.userId, userId)
      )
    )
    .returning({ id: timeBlocks.id, date: timeBlocks.date });
  if (!block)
    throw new ConflictError("Study Session calendar projection is missing");
  return {
    type: "updated",
    id: block.id,
    date: block.date,
    previousDate: previous.date,
  };
}

async function removeProjection(
  tx: DbTransaction,
  userId: string,
  sessionId: string,
  required: boolean
): Promise<BlockEvent | null> {
  const [block] = await tx
    .delete(timeBlocks)
    .where(
      and(
        eq(timeBlocks.studySessionId, sessionId),
        eq(timeBlocks.userId, userId)
      )
    )
    .returning({ id: timeBlocks.id, date: timeBlocks.date });
  if (!block && required)
    throw new ConflictError("Study Session calendar projection is missing");
  return block ? { type: "deleted", id: block.id, date: block.date } : null;
}

function notify(
  userId: string,
  session: StudySession,
  action: "created" | "updated" | "deleted",
  block: BlockEvent | null
) {
  void publishEvent(userId, `study-session:${action}`, {
    sessionId: session.id,
    assignmentId: session.assignmentId,
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    revision: session.revision,
    affectedDates: block
      ? [...new Set([block.previousDate, block.date].filter(Boolean))]
      : [],
  });
  if (block) {
    if (block.previousDate && block.previousDate !== block.date) {
      void publishEvent(userId, "timeblock:updated", {
        timeBlockId: block.id,
        date: block.previousDate,
      });
    }
    void publishEvent(userId, `timeblock:${block.type}`, {
      timeBlockId: block.id,
      date: block.date,
    });
  }
}

export async function requireOwnedStudySession(
  db: DbClient,
  userId: string,
  id: string
) {
  const [session] = await db
    .select()
    .from(studySessions)
    .where(
      and(
        eq(studySessions.id, id),
        eq(studySessions.userId, userId),
        isNull(studySessions.deletedAt)
      )
    )
    .limit(1);
  if (!session) throw new NotFoundError("Study Session", id);
  return session;
}

export async function createStudySession(
  userId: string,
  assignmentId: string,
  schedule: SessionScheduleInput
) {
  const projection = projectSchedule(schedule);
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [assignment] = await tx
      .select()
      .from(assignments)
      .where(
        and(
          eq(assignments.id, assignmentId),
          eq(assignments.userId, userId),
          isNull(assignments.deletedAt)
        )
      )
      .limit(1)
      .for("update");
    if (!assignment) throw new NotFoundError("Assignment", assignmentId);
    if (
      assignment.status === "completed" ||
      assignment.status === "cancelled"
    ) {
      throw new ConflictError(
        "Cannot schedule new study for a completed or cancelled Assignment"
      );
    }
    const [session] = await tx
      .insert(studySessions)
      .values({
        userId,
        assignmentId,
        startAt: new Date(schedule.startAt),
        endAt: new Date(schedule.endAt),
        timezone: schedule.timezone,
        plannedMinutes: schedule.plannedMinutes,
      })
      .returning();
    if (!session) throw new Error("Failed to create Study Session");
    const block = await insertProjection(
      tx,
      userId,
      session.id,
      assignment.title,
      projection
    );
    return { session, block };
  });
  notify(userId, result.session, "created", result.block);
  return result.session;
}

type Mutation =
  | { kind: "update"; schedule: SchedulePatch }
  | { kind: "reschedule"; schedule: SessionScheduleInput }
  | { kind: "complete"; actualMinutes?: number }
  | { kind: "skip" }
  | { kind: "cancel" }
  | { kind: "delete" };

export async function mutateStudySession(
  userId: string,
  id: string,
  expectedRevision: number,
  mutation: Mutation
) {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.id, id),
          eq(studySessions.userId, userId),
          isNull(studySessions.deletedAt)
        )
      )
      .limit(1)
      .for("update");
    if (!existing) throw new NotFoundError("Study Session", id);
    if (existing.revision !== expectedRevision) {
      throw new ConflictError(
        "Study Session has changed; refresh and retry",
        "revision"
      );
    }

    const now = new Date();
    let changes: Partial<typeof studySessions.$inferInsert> = {
      updatedAt: now,
      revision: existing.revision + 1,
    };
    let projection: Projection | null = null;
    let assignmentTitle: string | null = null;

    if (mutation.kind === "update" || mutation.kind === "reschedule") {
      if (
        existing.status !== "planned" &&
        !(mutation.kind === "reschedule" && existing.status === "skipped")
      ) {
        throw new ConflictError(
          "This Study Session cannot be rescheduled in its current state"
        );
      }
      const [assignment] = await tx
        .select()
        .from(assignments)
        .where(
          and(
            eq(assignments.id, existing.assignmentId),
            eq(assignments.userId, userId),
            isNull(assignments.deletedAt)
          )
        )
        .limit(1)
        .for("update");
      if (!assignment)
        throw new NotFoundError("Assignment", existing.assignmentId);
      if (
        assignment.status === "completed" ||
        assignment.status === "cancelled"
      ) {
        throw new ConflictError(
          "Cannot reschedule study for a completed or cancelled Assignment"
        );
      }
      const schedule = {
        startAt: mutation.schedule.startAt ?? existing.startAt.toISOString(),
        endAt: mutation.schedule.endAt ?? existing.endAt.toISOString(),
        timezone: mutation.schedule.timezone ?? existing.timezone,
        plannedMinutes:
          mutation.schedule.plannedMinutes ?? existing.plannedMinutes,
      };
      projection = projectSchedule(schedule);
      assignmentTitle = assignment.title;
      changes = {
        ...changes,
        startAt: new Date(schedule.startAt),
        endAt: new Date(schedule.endAt),
        timezone: schedule.timezone,
        plannedMinutes: schedule.plannedMinutes,
        status: "planned",
        actualMinutes: null,
        completedAt: null,
      };
    } else if (mutation.kind === "complete") {
      if (existing.status !== "planned")
        throw new ConflictError("Only planned Study Sessions can be completed");
      changes = {
        ...changes,
        status: "completed",
        actualMinutes: mutation.actualMinutes ?? existing.plannedMinutes,
        completedAt: now,
      };
    } else if (mutation.kind === "skip") {
      if (existing.status !== "planned")
        throw new ConflictError("Only planned Study Sessions can be skipped");
      changes = {
        ...changes,
        status: "skipped",
        actualMinutes: null,
        completedAt: null,
      };
    } else if (mutation.kind === "cancel") {
      if (existing.status !== "planned" && existing.status !== "skipped") {
        throw new ConflictError(
          "Only planned or skipped Study Sessions can be cancelled"
        );
      }
      changes = {
        ...changes,
        status: "cancelled",
        actualMinutes: null,
        completedAt: null,
      };
    } else {
      changes = { ...changes, deletedAt: now };
    }

    const [session] = await tx
      .update(studySessions)
      .set(changes)
      .where(
        and(
          eq(studySessions.id, id),
          eq(studySessions.userId, userId),
          eq(studySessions.revision, expectedRevision),
          isNull(studySessions.deletedAt)
        )
      )
      .returning();
    if (!session)
      throw new ConflictError(
        "Study Session has changed; refresh and retry",
        "revision"
      );

    let block: BlockEvent | null = null;
    if (projection && assignmentTitle) {
      block =
        existing.status === "skipped"
          ? await insertProjection(tx, userId, id, assignmentTitle, projection)
          : await updateProjection(tx, userId, id, assignmentTitle, projection);
    } else if (existing.status === "planned") {
      block = await removeProjection(tx, userId, id, true);
    }
    return { session, block };
  });
  notify(
    userId,
    result.session,
    mutation.kind === "delete" ? "deleted" : "updated",
    result.block
  );
  return result.session;
}

/** `remainingMinutes` excludes planned reservations: they are not yet studied. */
export async function getAssignmentStudyProgress(
  userId: string,
  assignmentId: string
) {
  const db = getDb();
  const [assignment] = await db
    .select()
    .from(assignments)
    .where(
      and(
        eq(assignments.id, assignmentId),
        eq(assignments.userId, userId),
        isNull(assignments.deletedAt)
      )
    )
    .limit(1);
  if (!assignment) throw new NotFoundError("Assignment", assignmentId);
  const [totals] = await db
    .select({
      completedSessionMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${studySessions.status} = 'completed' THEN ${studySessions.actualMinutes} ELSE 0 END), 0)::int`,
      activePlannedMinutes: sql<number>`COALESCE(SUM(CASE WHEN ${studySessions.status} = 'planned' THEN ${studySessions.plannedMinutes} ELSE 0 END), 0)::int`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.assignmentId, assignmentId),
        isNull(studySessions.deletedAt)
      )
    );
  const completedSessionMinutes = totals?.completedSessionMinutes ?? 0;
  const activePlannedMinutes = totals?.activePlannedMinutes ?? 0;
  const studiedMinutes = assignment.completedMinutes + completedSessionMinutes;
  return {
    assignmentId,
    estimatedMinutes: assignment.estimatedMinutes,
    unattributedCompletedMinutes: assignment.completedMinutes,
    completedSessionMinutes,
    studiedMinutes,
    activePlannedMinutes,
    remainingMinutes:
      assignment.estimatedMinutes === null
        ? null
        : Math.max(0, assignment.estimatedMinutes - studiedMinutes),
  };
}
