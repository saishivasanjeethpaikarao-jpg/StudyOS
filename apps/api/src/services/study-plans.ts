import { createHash } from "node:crypto";
import { formatInTimeZone } from "date-fns-tz";
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
  studyPlanApplications,
  studySessions,
  timeBlocks,
  users,
  type Assignment,
  type DbClient,
} from "@open-sunsama/database";
import type {
  ConfirmStudyPlanInput,
  ConfirmStudyPlanResult,
  NormalizedStudyPlanInput,
  StudyPlanInput,
  StudyPlanPreview,
  StudySessionStatus,
} from "@open-sunsama/types";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@open-sunsama/utils";
import { addDaysToDate } from "../lib/calendar-day-window.js";
import {
  createPlannedSessionInTransaction,
  lockStudyPlanningUser,
  publishCreatedPlannedSession,
  type CreatedPlannedSession,
  type DbTransaction,
} from "./study-sessions.js";
import { isIanaTimezone, planStudySlots } from "./study-plan-planner.js";

type PlanDb = DbClient | DbTransaction;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normalizeInput(
  assignment: Assignment,
  input: StudyPlanInput,
  preferences: { workStartHour?: number; workEndHour?: number } | null,
  now: Date
): NormalizedStudyPlanInput {
  if (!isIanaTimezone(input.timezone)) {
    throw new ValidationError("A valid IANA timezone is required");
  }
  const targetMinutes = input.targetMinutes ?? assignment.estimatedMinutes;
  if (targetMinutes === null || targetMinutes === undefined) {
    throw new ValidationError("Enter total study effort for this Assignment");
  }
  const localToday = formatInTimeZone(now, input.timezone, "yyyy-MM-dd");
  const dueDate = formatInTimeZone(
    assignment.dueAt,
    input.timezone,
    "yyyy-MM-dd"
  );
  const startDate = input.startDate ?? localToday;
  const endDate = input.endDate ?? addDaysToDate(dueDate, -1);
  if (input.endDate && endDate < startDate) {
    throw new ValidationError("endDate must not precede startDate");
  }
  const rangeDays =
    (Date.parse(`${endDate}T00:00:00Z`) -
      Date.parse(`${startDate}T00:00:00Z`)) /
    86_400_000;
  if (rangeDays > 365) {
    throw new ValidationError("Planning range cannot exceed 366 days");
  }
  const preferredStart = preferences?.workStartHour ?? 9;
  const preferredEnd = preferences?.workEndHour ?? 18;
  const validHours =
    Number.isInteger(preferredStart) &&
    Number.isInteger(preferredEnd) &&
    preferredStart >= 0 &&
    preferredEnd <= 23 &&
    preferredStart < preferredEnd;
  return {
    targetMinutes,
    startDate,
    endDate,
    preferredSessionMinutes: input.preferredSessionMinutes,
    timezone: input.timezone,
    workStartHour: validHours ? preferredStart : 9,
    workEndHour: validHours ? preferredEnd : 18,
  };
}

async function buildPreview(
  db: PlanDb,
  userId: string,
  assignment: Assignment,
  input: StudyPlanInput,
  now: Date
): Promise<StudyPlanPreview> {
  if (assignment.status === "completed" || assignment.status === "cancelled") {
    throw new ConflictError("This Assignment cannot receive a new study plan");
  }
  const [user] = await db
    .select({ preferences: users.preferences })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const normalizedInput = normalizeInput(
    assignment,
    input,
    user?.preferences ?? null,
    now
  );
  const sessions = await db
    .select({
      id: studySessions.id,
      status: studySessions.status,
      plannedMinutes: studySessions.plannedMinutes,
      actualMinutes: studySessions.actualMinutes,
      revision: studySessions.revision,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        eq(studySessions.assignmentId, assignment.id),
        isNull(studySessions.deletedAt)
      )
    )
    .orderBy(asc(studySessions.id));
  const completedMinutes =
    assignment.completedMinutes +
    sessions.reduce(
      (sum, session) =>
        sum +
        (session.status === "completed" ? (session.actualMinutes ?? 0) : 0),
      0
    );
  const alreadyPlannedMinutes = sessions.reduce(
    (sum, session) =>
      sum + (session.status === "planned" ? session.plannedMinutes : 0),
    0
  );
  const remainingToPlanMinutes = Math.max(
    normalizedInput.targetMinutes - completedMinutes - alreadyPlannedMinutes,
    0
  );
  const blocks =
    normalizedInput.startDate <= normalizedInput.endDate
      ? await db
          .select({
            id: timeBlocks.id,
            date: timeBlocks.date,
            startTime: timeBlocks.startTime,
            endTime: timeBlocks.endTime,
            studySessionId: timeBlocks.studySessionId,
            updatedAt: timeBlocks.updatedAt,
          })
          .from(timeBlocks)
          .where(
            and(
              eq(timeBlocks.userId, userId),
              gte(timeBlocks.date, normalizedInput.startDate),
              lte(timeBlocks.date, normalizedInput.endDate)
            )
          )
          .orderBy(asc(timeBlocks.date), asc(timeBlocks.id))
      : [];
  const availabilityFingerprint = hash({
    assignment: {
      id: assignment.id,
      revision: assignment.revision,
      dueAt: assignment.dueAt.toISOString(),
      status: assignment.status,
      estimatedMinutes: assignment.estimatedMinutes,
      completedMinutes: assignment.completedMinutes,
    },
    normalizedInput,
    sessions,
    blocks,
  });
  const placed = planStudySlots(
    normalizedInput,
    remainingToPlanMinutes,
    blocks,
    assignment.dueAt,
    now
  );
  return {
    assignmentId: assignment.id,
    assignmentRevision: assignment.revision,
    availabilityFingerprint,
    normalizedInput,
    proposedSlots: placed.proposedSlots,
    completedMinutes,
    alreadyPlannedMinutes,
    remainingToPlanMinutes,
    plannedMinutes: placed.plannedMinutes,
    unscheduledMinutes: placed.unscheduledMinutes,
    confirmable:
      placed.proposedSlots.length > 0 && placed.unscheduledMinutes === 0,
  };
}

export async function previewStudyPlan(
  userId: string,
  assignmentId: string,
  input: StudyPlanInput
): Promise<StudyPlanPreview> {
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
  return buildPreview(db, userId, assignment, input, new Date());
}

export async function confirmStudyPlan(
  userId: string,
  assignmentId: string,
  input: ConfirmStudyPlanInput
): Promise<ConfirmStudyPlanResult> {
  const requestHash = hash({
    assignmentId,
    assignmentRevision: input.assignmentRevision,
    availabilityFingerprint: input.availabilityFingerprint,
    normalizedInput: input.normalizedInput,
    proposedSlots: input.proposedSlots,
  });
  const result = await getDb().transaction(async (tx) => {
    await lockStudyPlanningUser(tx, userId);
    const [previous] = await tx
      .select()
      .from(studyPlanApplications)
      .where(
        and(
          eq(studyPlanApplications.userId, userId),
          eq(studyPlanApplications.clientMutationId, input.clientMutationId)
        )
      )
      .limit(1);
    if (previous) {
      if (
        previous.assignmentId !== assignmentId ||
        previous.requestHash !== requestHash
      ) {
        throw new ConflictError(
          "This clientMutationId was used for another plan"
        );
      }
      const sessions = await tx
        .select()
        .from(studySessions)
        .where(
          and(
            eq(studySessions.userId, userId),
            eq(studySessions.planApplicationId, previous.id)
          )
        )
        .orderBy(asc(studySessions.startAt), asc(studySessions.id));
      return {
        response: {
          planApplicationId: previous.id,
          sessions,
          replayed: true,
        },
        created: [] as CreatedPlannedSession[],
      };
    }

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
    if (assignment.revision !== input.assignmentRevision) {
      throw new ConflictError(
        "Assignment changed; request a fresh study-plan preview"
      );
    }
    if (
      assignment.status === "completed" ||
      assignment.status === "cancelled"
    ) {
      throw new ConflictError(
        "This Assignment cannot receive a new study plan"
      );
    }

    // A short, self-conflicting table lock serializes availability reads with
    // every Time Block writer, including inherited generic scheduling routes.
    // Study Session writers also take the user advisory lock above.
    await tx.execute(sql`LOCK TABLE time_blocks IN SHARE ROW EXCLUSIVE MODE`);
    const preview = await buildPreview(
      tx,
      userId,
      assignment,
      {
        targetMinutes: input.normalizedInput.targetMinutes,
        startDate: input.normalizedInput.startDate,
        endDate: input.normalizedInput.endDate,
        preferredSessionMinutes: input.normalizedInput.preferredSessionMinutes,
        timezone: input.normalizedInput.timezone,
      },
      new Date()
    );
    if (
      !preview.confirmable ||
      preview.availabilityFingerprint !== input.availabilityFingerprint ||
      JSON.stringify(preview.normalizedInput) !==
        JSON.stringify(input.normalizedInput) ||
      JSON.stringify(preview.proposedSlots) !==
        JSON.stringify(input.proposedSlots)
    ) {
      throw new ConflictError("Study plan changed; request a fresh preview");
    }

    const [application] = await tx
      .insert(studyPlanApplications)
      .values({
        userId,
        assignmentId,
        clientMutationId: input.clientMutationId,
        requestHash,
      })
      .returning({ id: studyPlanApplications.id });
    if (!application)
      throw new Error("Failed to record Study Plan application");
    const created: CreatedPlannedSession[] = [];
    for (const slot of preview.proposedSlots) {
      created.push(
        await createPlannedSessionInTransaction(
          tx,
          userId,
          assignment,
          slot,
          application.id
        )
      );
    }
    return {
      response: {
        planApplicationId: application.id,
        sessions: created.map((entry) => entry.session),
        replayed: false,
      },
      created,
    };
  });
  for (const created of result.created) {
    publishCreatedPlannedSession(userId, created);
  }
  return {
    ...result.response,
    // PostgreSQL CHECK constrains this varchar to the shared status union.
    sessions: result.response.sessions.map((session) => ({
      ...session,
      status: session.status as StudySessionStatus,
    })),
  };
}
