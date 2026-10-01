import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { Hono } from "hono";
import {
  assignments,
  eq,
  getDb,
  resetDbInstance,
  sql,
  studyPlanApplications,
  studySessions,
  timeBlocks,
  users,
  type DbClient,
} from "@open-sunsama/database";
import type {
  ConfirmStudyPlanInput,
  StudyPlanInput,
  StudyPlanPreview,
} from "@open-sunsama/types";
import { signToken } from "../lib/jwt.js";
import { errorHandler } from "../middleware/error.js";
import { createPlannedSessionInTransaction } from "../services/study-sessions.js";
import { assignmentsRouter } from "./assignments.js";
import { studySessionsRouter } from "./study-sessions.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const defaultInput: StudyPlanInput = {
  startDate: "2030-04-09",
  endDate: "2030-04-11",
  preferredSessionMinutes: 40,
  timezone: "UTC",
};

describe.skipIf(!testDatabaseUrl)("Study Plan preview and confirmation", () => {
  const app = new Hono();
  app.route("/assignments", assignmentsRouter);
  app.route("/study-sessions", studySessionsRouter);
  app.onError(errorHandler);

  let db: DbClient;
  let ownerId: string;
  let otherId: string;
  let ownerToken: string;
  let otherToken: string;

  function request(
    path: string,
    token: string,
    body: unknown,
    method = "POST",
    revision?: number
  ) {
    const headers = new Headers({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    });
    if (revision !== undefined) headers.set("If-Match", `"${revision}"`);
    return app.request(path, { method, headers, body: JSON.stringify(body) });
  }

  async function newAssignment(
    userId = ownerId,
    values: Partial<typeof assignments.$inferInsert> = {}
  ) {
    const [assignment] = await db
      .insert(assignments)
      .values({
        userId,
        title: `Plan test ${randomUUID()}`,
        dueAt: new Date("2030-04-12T18:00:00.000Z"),
        estimatedMinutes: 120,
        ...values,
      })
      .returning();
    return assignment!;
  }

  async function preview(
    assignmentId: string,
    input: StudyPlanInput = defaultInput,
    token = ownerToken
  ) {
    const response = await request(
      `/assignments/${assignmentId}/study-plan/preview`,
      token,
      input
    );
    return {
      response,
      data:
        response.status === 200
          ? ((await response.json()) as { data: StudyPlanPreview }).data
          : null,
    };
  }

  function confirmBody(
    approved: StudyPlanPreview,
    clientMutationId = randomUUID()
  ): ConfirmStudyPlanInput {
    return {
      clientMutationId,
      assignmentRevision: approved.assignmentRevision,
      availabilityFingerprint: approved.availabilityFingerprint,
      normalizedInput: approved.normalizedInput,
      proposedSlots: approved.proposedSlots,
    };
  }

  function confirm(
    assignmentId: string,
    body: ConfirmStudyPlanInput,
    token = ownerToken
  ) {
    return request(
      `/assignments/${assignmentId}/study-plan/confirm`,
      token,
      body
    );
  }

  async function counts(assignmentId: string) {
    const [sessions] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(studySessions)
      .where(eq(studySessions.assignmentId, assignmentId));
    const [applications] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(studyPlanApplications)
      .where(eq(studyPlanApplications.assignmentId, assignmentId));
    const [blocks] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(timeBlocks)
      .innerJoin(studySessions, eq(timeBlocks.studySessionId, studySessions.id))
      .where(eq(studySessions.assignmentId, assignmentId));
    return {
      sessions: sessions?.count ?? 0,
      applications: applications?.count ?? 0,
      blocks: blocks?.count ?? 0,
    };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    resetDbInstance();
    db = getDb();
  });

  beforeEach(async () => {
    const marker = randomUUID();
    const created = await db
      .insert(users)
      .values([
        { email: `study-plan-owner-${marker}@example.com`, passwordHash: "x" },
        { email: `study-plan-other-${marker}@example.com`, passwordHash: "x" },
      ])
      .returning({ id: users.id });
    ownerId = created[0]!.id;
    otherId = created[1]!.id;
    ownerToken = signToken(ownerId);
    otherToken = signToken(otherId);
  });

  afterEach(async () => {
    if (db && ownerId) await db.delete(users).where(eq(users.id, ownerId));
    if (db && otherId) await db.delete(users).where(eq(users.id, otherId));
  });

  afterAll(async () => {
    if (db) await db.$client.end();
    resetDbInstance();
  });

  it("previews without writes, confirms atomically, and replays one mutation exactly once", async () => {
    const assignment = await newAssignment();
    const before = await counts(assignment.id);
    const { response, data } = await preview(assignment.id);
    expect(response.status).toBe(200);
    expect(data?.confirmable).toBe(true);
    expect(
      data?.proposedSlots.map((slot) => [slot.localDate, slot.plannedMinutes])
    ).toEqual([
      ["2030-04-09", 40],
      ["2030-04-10", 40],
      ["2030-04-11", 40],
    ]);
    expect(data?.unscheduledMinutes).toBe(0);
    expect(data?.availabilityFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(await counts(assignment.id)).toEqual(before);

    const body = confirmBody(data!);
    const first = await confirm(assignment.id, body);
    expect(first.status).toBe(200);
    const firstResult = (await first.json()) as {
      data: {
        planApplicationId: string;
        replayed: boolean;
        sessions: { id: string; planApplicationId: string }[];
      };
    };
    expect(firstResult.data.replayed).toBe(false);
    expect(firstResult.data.sessions).toHaveLength(3);
    expect(
      firstResult.data.sessions.every(
        (session) =>
          session.planApplicationId === firstResult.data.planApplicationId
      )
    ).toBe(true);
    expect(await counts(assignment.id)).toEqual({
      sessions: 3,
      applications: 1,
      blocks: 3,
    });

    const retry = await confirm(assignment.id, body);
    expect(retry.status).toBe(200);
    expect(
      ((await retry.json()) as { data: { replayed: boolean } }).data.replayed
    ).toBe(true);
    expect(await counts(assignment.id)).toEqual({
      sessions: 3,
      applications: 1,
      blocks: 3,
    });
    expect(
      (
        await confirm(assignment.id, {
          ...body,
          proposedSlots: body.proposedSlots.slice(1),
        })
      ).status
    ).toBe(409);
    expect(
      (
        await confirm(assignment.id, {
          ...body,
          clientMutationId: randomUUID(),
        })
      ).status
    ).toBe(409);
    const after = await preview(assignment.id);
    expect(after.data?.remainingToPlanMinutes).toBe(0);
    expect(after.data?.confirmable).toBe(false);
    expect(after.data?.proposedSlots).toEqual([]);
  });

  it("accounts for completed and already-planned effort without double-counting", async () => {
    const assignment = await newAssignment(ownerId, { completedMinutes: 20 });
    const created = await request("/study-sessions", ownerToken, {
      assignmentId: assignment.id,
      startAt: "2030-04-09T09:00:00.000Z",
      endAt: "2030-04-09T09:40:00.000Z",
      timezone: "UTC",
      plannedMinutes: 40,
    });
    expect(created.status).toBe(201);
    const session = ((await created.json()) as { data: { id: string } }).data;
    const completed = await request(
      `/study-sessions/${session.id}/complete`,
      ownerToken,
      { actualMinutes: 30 },
      "POST",
      1
    );
    expect(completed.status).toBe(200);
    const planned = await request("/study-sessions", ownerToken, {
      assignmentId: assignment.id,
      startAt: "2030-04-10T09:00:00.000Z",
      endAt: "2030-04-10T09:40:00.000Z",
      timezone: "UTC",
      plannedMinutes: 40,
    });
    expect(planned.status).toBe(201);
    const result = await preview(assignment.id);
    expect(result.data).toMatchObject({
      completedMinutes: 50,
      alreadyPlannedMinutes: 40,
      remainingToPlanMinutes: 30,
      plannedMinutes: 30,
      unscheduledMinutes: 0,
    });
    expect(result.data?.proposedSlots[0]?.localDate).toBe("2030-04-09");
    const [unchanged] = await db
      .select({ minutes: assignments.completedMinutes })
      .from(assignments)
      .where(eq(assignments.id, assignment.id));
    expect(unchanged?.minutes).toBe(20);
  });

  it("treats an active Study Session projection as busy and defaults before the due day", async () => {
    const assignment = await newAssignment(ownerId, {
      estimatedMinutes: 80,
      dueAt: new Date("2030-04-11T12:00:00.000Z"),
    });
    const created = await request("/study-sessions", ownerToken, {
      assignmentId: assignment.id,
      startAt: "2030-04-09T09:00:00.000Z",
      endAt: "2030-04-09T09:40:00.000Z",
      timezone: "UTC",
      plannedMinutes: 40,
    });
    expect(created.status).toBe(201);
    const result = await preview(assignment.id, {
      startDate: "2030-04-09",
      preferredSessionMinutes: 40,
      timezone: "UTC",
    });
    expect(result.data?.normalizedInput.endDate).toBe("2030-04-10");
    expect(result.data?.alreadyPlannedMinutes).toBe(40);
    expect(result.data?.proposedSlots[0]?.startAt).toBe(
      "2030-04-09T09:45:00.000Z"
    );
  });

  it("uses busy Time Blocks, current work preferences, and returns incomplete capacity honestly", async () => {
    const assignment = await newAssignment();
    await db
      .update(users)
      .set({
        preferences: {
          themeMode: "dark",
          colorTheme: "default",
          fontFamily: "system",
          workStartHour: 10,
          workEndHour: 11,
        },
      })
      .where(eq(users.id, ownerId));
    await db.insert(timeBlocks).values({
      userId: ownerId,
      title: "Existing work",
      date: "2030-04-09",
      startTime: "10:00",
      endTime: "10:40",
      durationMins: 40,
    });
    const result = await preview(assignment.id);
    expect(result.data?.normalizedInput).toMatchObject({
      workStartHour: 10,
      workEndHour: 11,
    });
    expect(result.data?.proposedSlots[0]?.localDate).toBe("2030-04-10");
    expect(result.data?.plannedMinutes).toBe(80);
    expect(result.data?.unscheduledMinutes).toBe(40);
    expect(result.data?.confirmable).toBe(false);
    expect(
      (await confirm(assignment.id, confirmBody(result.data!))).status
    ).toBe(409);
    expect(await counts(assignment.id)).toEqual({
      sessions: 0,
      applications: 0,
      blocks: 0,
    });
    await db
      .update(users)
      .set({ preferences: null })
      .where(eq(users.id, ownerId));
  });

  it("rejects stale Assignment and changed availability before any write", async () => {
    const staleAssignment = await newAssignment();
    const old = (await preview(staleAssignment.id)).data!;
    await db
      .update(assignments)
      .set({
        dueAt: new Date("2030-04-11T17:00:00.000Z"),
        revision: sql`${assignments.revision} + 1`,
      })
      .where(eq(assignments.id, staleAssignment.id));
    expect((await confirm(staleAssignment.id, confirmBody(old))).status).toBe(
      409
    );
    expect(await counts(staleAssignment.id)).toEqual({
      sessions: 0,
      applications: 0,
      blocks: 0,
    });

    const changed = await newAssignment();
    const approved = (await preview(changed.id)).data!;
    await db.insert(timeBlocks).values({
      userId: ownerId,
      title: "New busy block",
      date: approved.proposedSlots[0]!.localDate,
      startTime: "09:00",
      endTime: "09:40",
      durationMins: 40,
    });
    expect((await confirm(changed.id, confirmBody(approved))).status).toBe(409);
    expect(await counts(changed.id)).toEqual({
      sessions: 0,
      applications: 0,
      blocks: 0,
    });

    const deleted = await newAssignment();
    const beforeDelete = (await preview(deleted.id)).data!;
    await db
      .update(assignments)
      .set({ deletedAt: new Date() })
      .where(eq(assignments.id, deleted.id));
    expect((await confirm(deleted.id, confirmBody(beforeDelete))).status).toBe(
      404
    );
  });

  it("allows explicit deadline-day planning only before the due time", async () => {
    const assignment = await newAssignment(ownerId, {
      estimatedMinutes: 40,
      dueAt: new Date("2030-04-11T10:00:00.000Z"),
    });
    const acceptable = await preview(assignment.id, {
      ...defaultInput,
      startDate: "2030-04-11",
      endDate: "2030-04-11",
    });
    expect(acceptable.data?.proposedSlots[0]?.endAt).toBe(
      "2030-04-11T09:40:00.000Z"
    );
    await db
      .update(assignments)
      .set({
        dueAt: new Date("2030-04-11T09:40:00.000Z"),
        revision: sql`${assignments.revision} + 1`,
      })
      .where(eq(assignments.id, assignment.id));
    const insufficient = await preview(assignment.id, {
      ...defaultInput,
      startDate: "2030-04-11",
      endDate: "2030-04-11",
    });
    expect(insufficient.data?.proposedSlots).toEqual([]);
    expect(insufficient.data?.unscheduledMinutes).toBe(40);
    expect(insufficient.data?.confirmable).toBe(false);
  });

  it("serializes competing confirmations so only one can consume available effort", async () => {
    const assignment = await newAssignment();
    const approved = (await preview(assignment.id)).data!;
    const [first, second] = await Promise.all([
      confirm(assignment.id, confirmBody(approved)),
      confirm(assignment.id, confirmBody(approved)),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(await counts(assignment.id)).toEqual({
      sessions: 3,
      applications: 1,
      blocks: 3,
    });
  });

  it("keeps foreign, deleted, completed, and cancelled Assignments unavailable", async () => {
    const foreign = await newAssignment(otherId);
    const missing = randomUUID();
    expect((await preview(foreign.id)).response.status).toBe(404);
    expect((await preview(missing)).response.status).toBe(404);
    const own = await newAssignment();
    const body = confirmBody((await preview(own.id)).data!);
    expect((await confirm(foreign.id, body)).status).toBe(404);
    expect((await confirm(missing, body)).status).toBe(404);
    expect(
      (await preview(own.id, defaultInput, otherToken)).response.status
    ).toBe(404);
    expect((await confirm(own.id, body, otherToken)).status).toBe(404);
    expect(
      (
        await confirm(own.id, {
          ...body,
          userId: otherId,
        } as ConfirmStudyPlanInput)
      ).status
    ).toBe(400);

    const deleted = await newAssignment(ownerId, { deletedAt: new Date() });
    const completed = await newAssignment(ownerId, { status: "completed" });
    const cancelled = await newAssignment(ownerId, { status: "cancelled" });
    expect((await preview(deleted.id)).response.status).toBe(404);
    expect((await preview(completed.id)).response.status).toBe(409);
    expect((await preview(cancelled.id)).response.status).toBe(409);
  });

  it("requires explicit effort without an estimate and validates timezone", async () => {
    const assignment = await newAssignment(ownerId, { estimatedMinutes: null });
    expect((await preview(assignment.id)).response.status).toBe(400);
    expect(
      (
        await preview(assignment.id, {
          ...defaultInput,
          timezone: "+05:30",
          targetMinutes: 40,
        })
      ).response.status
    ).toBe(400);
    const explicit = await preview(assignment.id, {
      ...defaultInput,
      targetMinutes: 40,
    });
    expect(explicit.response.status).toBe(200);
    expect(explicit.data?.remainingToPlanMinutes).toBe(40);
  });

  it("rolls back all writes when a later projected session fails", async () => {
    const assignment = await newAssignment();
    const before = await counts(assignment.id);
    await expect(
      db.transaction(async (tx) => {
        await createPlannedSessionInTransaction(tx, ownerId, assignment, {
          startAt: "2030-04-09T09:00:00.000Z",
          endAt: "2030-04-09T09:40:00.000Z",
          timezone: "UTC",
          plannedMinutes: 40,
        });
        await createPlannedSessionInTransaction(tx, ownerId, assignment, {
          startAt: "2030-04-10T09:00:00.000Z",
          endAt: "2030-04-10T09:10:00.000Z",
          timezone: "UTC",
          plannedMinutes: 40,
        });
      })
    ).rejects.toThrow();
    expect(await counts(assignment.id)).toEqual(before);
  });
});
