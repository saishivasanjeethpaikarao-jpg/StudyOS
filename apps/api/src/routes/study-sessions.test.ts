import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import {
  assignments,
  eq,
  getDb,
  resetDbInstance,
  studySessions,
  tasks,
  timeBlocks,
  users,
  type DbClient,
} from "@open-sunsama/database";
import { signToken } from "../lib/jwt.js";
import { errorHandler } from "../middleware/error.js";
import { studySessionsRouter } from "./study-sessions.js";
import { assignmentsRouter } from "./assignments.js";
import { timeBlocksRouter } from "./time-blocks.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
type SessionResult = {
  id: string;
  assignmentId: string;
  revision: number;
  status: string;
  startAt: string;
  endAt: string;
  actualMinutes: number | null;
  completedAt: string | null;
  deletedAt: string | null;
};

describe.skipIf(!testDatabaseUrl)(
  "Study Sessions API against PostgreSQL",
  () => {
    const app = new Hono();
    app.route("/study-sessions", studySessionsRouter);
    app.route("/assignments", assignmentsRouter);
    app.route("/time-blocks", timeBlocksRouter);
    app.onError(errorHandler);

    let db: DbClient;
    let ownerId: string;
    let otherId: string;
    let ownerToken: string;
    let otherToken: string;
    let assignmentId: string;
    let otherAssignmentId: string;

    const schedule = (
      startAt = "2030-04-09T09:00:00.000Z",
      plannedMinutes = 40
    ) => ({
      startAt,
      endAt: new Date(
        new Date(startAt).getTime() + plannedMinutes * 60_000
      ).toISOString(),
      timezone: "UTC",
      plannedMinutes,
    });

    function request(
      path: string,
      token = ownerToken,
      method = "GET",
      body?: unknown,
      revision?: number
    ) {
      const headers = new Headers({ Authorization: `Bearer ${token}` });
      if (body !== undefined) headers.set("Content-Type", "application/json");
      if (revision !== undefined) headers.set("If-Match", `"${revision}"`);
      return app.request(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }

    async function create(
      assignment = assignmentId,
      token = ownerToken,
      start = "2030-04-09T09:00:00.000Z"
    ) {
      const response = await request("/study-sessions", token, "POST", {
        assignmentId: assignment,
        ...schedule(start),
      });
      expect(response.status).toBe(201);
      return ((await response.json()) as { data: SessionResult }).data;
    }

    async function linkedBlocks(sessionId: string) {
      return db
        .select()
        .from(timeBlocks)
        .where(eq(timeBlocks.studySessionId, sessionId));
    }

    async function newAssignment(
      values: {
        estimatedMinutes?: number;
        completedMinutes?: number;
        status?: "not_started" | "completed" | "cancelled";
      } = {}
    ) {
      const [assignment] = await db
        .insert(assignments)
        .values({
          userId: ownerId,
          title: `Study API test ${randomUUID()}`,
          dueAt: new Date("2030-04-12T18:00:00.000Z"),
          ...values,
        })
        .returning({ id: assignments.id });
      return assignment!.id;
    }

    beforeAll(async () => {
      process.env.DATABASE_URL = testDatabaseUrl;
      resetDbInstance();
      db = getDb();
      const marker = randomUUID();
      const created = await db
        .insert(users)
        .values([
          { email: `study-api-owner-${marker}@example.com`, passwordHash: "x" },
          { email: `study-api-other-${marker}@example.com`, passwordHash: "x" },
        ])
        .returning({ id: users.id });
      ownerId = created[0]!.id;
      otherId = created[1]!.id;
      ownerToken = signToken(ownerId);
      otherToken = signToken(otherId);
      const rows = await db
        .insert(assignments)
        .values([
          {
            userId: ownerId,
            title: "Owner Assignment",
            dueAt: new Date("2030-04-12T18:00:00.000Z"),
          },
          {
            userId: otherId,
            title: "Other Assignment",
            dueAt: new Date("2030-04-12T18:00:00.000Z"),
          },
        ])
        .returning({ id: assignments.id, userId: assignments.userId });
      assignmentId = rows.find((row) => row.userId === ownerId)!.id;
      otherAssignmentId = rows.find((row) => row.userId === otherId)!.id;
    });

    afterAll(async () => {
      if (db && ownerId) await db.delete(users).where(eq(users.id, ownerId));
      if (db && otherId) await db.delete(users).where(eq(users.id, otherId));
      if (db) await db.$client.end();
      resetDbInstance();
    });

    it("creates, lists, retrieves, updates and soft-deletes with one projection and revisions", async () => {
      const session = await create();
      expect(session).toMatchObject({
        assignmentId,
        revision: 1,
        status: "planned",
      });
      const [block] = await linkedBlocks(session.id);
      expect(await linkedBlocks(session.id)).toHaveLength(1);
      expect(block).toMatchObject({
        taskId: null,
        date: "2030-04-09",
        startTime: "09:00",
        endTime: "09:40",
      });
      expect((await request(`/study-sessions/${session.id}`)).status).toBe(200);

      const listed = await request(
        `/study-sessions?assignmentId=${assignmentId}&from=2030-04-09T09%3A00%3A00.000Z&to=2030-04-09T09%3A01%3A00.000Z`
      );
      expect(listed.status).toBe(200);
      expect(
        ((await listed.json()) as { data: SessionResult[] }).data.some(
          (row) => row.id === session.id
        )
      ).toBe(true);
      const excluded = await request(
        "/study-sessions?to=2030-04-09T09%3A00%3A00.000Z"
      );
      expect(
        ((await excluded.json()) as { data: SessionResult[] }).data.some(
          (row) => row.id === session.id
        )
      ).toBe(false);

      const updatedResponse = await request(
        `/study-sessions/${session.id}`,
        ownerToken,
        "PATCH",
        {
          ...schedule("2030-04-10T10:00:00.000Z"),
        },
        1
      );
      expect(updatedResponse.status).toBe(200);
      const updated = (
        (await updatedResponse.json()) as { data: SessionResult }
      ).data;
      expect(updated.revision).toBe(2);
      expect((await linkedBlocks(session.id))[0]).toMatchObject({
        id: block!.id,
        date: "2030-04-10",
        startTime: "10:00",
      });
      expect(
        (
          await request(
            `/study-sessions/${session.id}`,
            ownerToken,
            "PATCH",
            { timezone: "UTC" },
            1
          )
        ).status
      ).toBe(409);
      expect(
        (
          await request(`/study-sessions/${session.id}`, ownerToken, "PATCH", {
            timezone: "UTC",
          })
        ).status
      ).toBe(400);

      expect(
        (
          await request(
            `/study-sessions/${session.id}`,
            ownerToken,
            "DELETE",
            undefined,
            2
          )
        ).status
      ).toBe(200);
      expect(await linkedBlocks(session.id)).toHaveLength(0);
      const [stored] = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, session.id));
      expect(stored!.revision).toBe(3);
      expect(stored!.deletedAt).not.toBeNull();
      expect((await request(`/study-sessions/${session.id}`)).status).toBe(404);
      const afterDelete = await request(
        `/study-sessions?assignmentId=${assignmentId}`
      );
      expect(
        ((await afterDelete.json()) as { data: SessionResult[] }).data.some(
          (row) => row.id === session.id
        )
      ).toBe(false);
    });

    it("hides foreign Assignment, Study Session and Time Block IDs", async () => {
      const foreign = await create(otherAssignmentId, otherToken);
      const [block] = await linkedBlocks(foreign.id);
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId: otherAssignmentId,
            ...schedule(),
          })
        ).status
      ).toBe(404);
      expect(
        (await request(`/study-sessions?assignmentId=${otherAssignmentId}`))
          .status
      ).toBe(404);
      expect(
        (await request(`/study-sessions?assignmentId=${randomUUID()}`)).status
      ).toBe(404);
      expect((await request(`/study-sessions/${foreign.id}`)).status).toBe(404);
      expect(
        (
          await request(
            `/study-sessions/${foreign.id}`,
            ownerToken,
            "PATCH",
            { timezone: "UTC" },
            1
          )
        ).status
      ).toBe(404);
      expect(
        (
          await request(
            `/study-sessions/${foreign.id}`,
            ownerToken,
            "DELETE",
            undefined,
            1
          )
        ).status
      ).toBe(404);
      expect((await request(`/time-blocks/${block!.id}`)).status).toBe(404);
      expect(
        (
          await request(`/time-blocks/${block!.id}`, ownerToken, "PATCH", {
            title: "No",
          })
        ).status
      ).toBe(404);
      expect(
        (await request(`/time-blocks/${block!.id}`, ownerToken, "DELETE"))
          .status
      ).toBe(404);
    });

    it("completes, skips, restores and cancels through explicit transitions", async () => {
      const completed = await create(
        assignmentId,
        ownerToken,
        "2030-04-11T09:00:00.000Z"
      );
      const response = await request(
        `/study-sessions/${completed.id}/complete`,
        ownerToken,
        "POST",
        {},
        1
      );
      expect(response.status).toBe(200);
      const result = ((await response.json()) as { data: SessionResult }).data;
      expect(result).toMatchObject({
        status: "completed",
        actualMinutes: 40,
        revision: 2,
      });
      expect(result.completedAt).not.toBeNull();
      expect(result.startAt).toBe(completed.startAt);
      expect(await linkedBlocks(completed.id)).toHaveLength(0);
      expect(
        (
          await request(
            `/study-sessions/${completed.id}/complete`,
            ownerToken,
            "POST",
            {},
            2
          )
        ).status
      ).toBe(409);
      expect(
        (
          await request(
            `/study-sessions/${completed.id}/reschedule`,
            ownerToken,
            "POST",
            schedule(),
            2
          )
        ).status
      ).toBe(409);

      const skipped = await create(
        assignmentId,
        ownerToken,
        "2030-04-13T09:00:00.000Z"
      );
      const skipResponse = await request(
        `/study-sessions/${skipped.id}/skip`,
        ownerToken,
        "POST",
        undefined,
        1
      );
      expect(skipResponse.status).toBe(200);
      expect(
        ((await skipResponse.json()) as { data: SessionResult }).data
      ).toMatchObject({ status: "skipped", revision: 2 });
      expect(await linkedBlocks(skipped.id)).toHaveLength(0);
      const restore = await request(
        `/study-sessions/${skipped.id}/reschedule`,
        ownerToken,
        "POST",
        schedule("2030-04-14T11:00:00.000Z"),
        2
      );
      expect(restore.status).toBe(200);
      expect(
        ((await restore.json()) as { data: SessionResult }).data
      ).toMatchObject({ status: "planned", revision: 3 });
      expect(await linkedBlocks(skipped.id)).toHaveLength(1);
      const cancel = await request(
        `/study-sessions/${skipped.id}/cancel`,
        ownerToken,
        "POST",
        undefined,
        3
      );
      expect(cancel.status).toBe(200);
      expect(
        ((await cancel.json()) as { data: SessionResult }).data
      ).toMatchObject({ status: "cancelled", revision: 4 });
      expect(await linkedBlocks(skipped.id)).toHaveLength(0);
      expect(
        (
          await request(
            `/study-sessions/${skipped.id}/skip`,
            ownerToken,
            "POST",
            undefined,
            4
          )
        ).status
      ).toBe(409);

      const directCancel = await create(
        assignmentId,
        ownerToken,
        "2030-04-17T09:00:00.000Z"
      );
      const cancelled = await request(
        `/study-sessions/${directCancel.id}/cancel`,
        ownerToken,
        "POST",
        undefined,
        1
      );
      expect(cancelled.status).toBe(200);
      expect(await linkedBlocks(directCancel.id)).toHaveLength(0);
    });

    it("derives progress from legacy minutes plus completed sessions without double-counting", async () => {
      const progressAssignment = await newAssignment({
        estimatedMinutes: 120,
        completedMinutes: 20,
      });
      const completed = await create(progressAssignment);
      await request(
        `/study-sessions/${completed.id}/complete`,
        ownerToken,
        "POST",
        { actualMinutes: 50 },
        1
      );
      await create(progressAssignment, ownerToken, "2030-04-10T09:00:00.000Z");
      const response = await request(
        `/assignments/${progressAssignment}/study-progress`
      );
      expect(response.status).toBe(200);
      expect(((await response.json()) as { data: unknown }).data).toEqual({
        assignmentId: progressAssignment,
        estimatedMinutes: 120,
        unattributedCompletedMinutes: 20,
        completedSessionMinutes: 50,
        studiedMinutes: 70,
        activePlannedMinutes: 40,
        remainingMinutes: 50,
      });
      const [assignment] = await db
        .select({ completedMinutes: assignments.completedMinutes })
        .from(assignments)
        .where(eq(assignments.id, progressAssignment));
      expect(assignment!.completedMinutes).toBe(20);
      expect(
        (
          (await (
            await request(
              `/study-sessions?status=completed&assignmentId=${progressAssignment}`
            )
          ).json()) as { data: SessionResult[] }
        ).data.some((row) => row.id === completed.id)
      ).toBe(true);
      await request(
        `/study-sessions/${completed.id}`,
        ownerToken,
        "DELETE",
        undefined,
        2
      );
      const afterDeletion = await request(
        `/assignments/${progressAssignment}/study-progress`
      );
      expect(
        (
          (await afterDeletion.json()) as {
            data: { studiedMinutes: number; remainingMinutes: number };
          }
        ).data
      ).toMatchObject({ studiedMinutes: 20, remainingMinutes: 100 });
      const unestimated = await newAssignment({ completedMinutes: 5 });
      const noEstimate = await request(
        `/assignments/${unestimated}/study-progress`
      );
      expect(
        (
          (await noEstimate.json()) as {
            data: { remainingMinutes: number | null };
          }
        ).data.remainingMinutes
      ).toBeNull();
      expect(
        (await request(`/assignments/${otherAssignmentId}/study-progress`))
          .status
      ).toBe(404);
    });

    it("rejects direct mutations and cascade shifts of session-owned blocks but retains generic/Task blocks", async () => {
      const session = await create(
        assignmentId,
        ownerToken,
        "2030-04-15T09:00:00.000Z"
      );
      const [block] = await linkedBlocks(session.id);
      expect(
        (
          await request(`/time-blocks/${block!.id}`, ownerToken, "PATCH", {
            title: "Detached",
          })
        ).status
      ).toBe(409);
      expect(
        (await request(`/time-blocks/${block!.id}`, ownerToken, "DELETE"))
          .status
      ).toBe(409);
      expect(
        (
          await request(
            `/time-blocks/${block!.id}/cascade-resize`,
            ownerToken,
            "PATCH",
            { startTime: "09:00", endTime: "09:30" }
          )
        ).status
      ).toBe(409);

      const generic = await request("/time-blocks", ownerToken, "POST", {
        title: "Generic",
        date: "2030-04-15",
        startTime: "08:00",
        endTime: "09:00",
      });
      expect(generic.status).toBe(201);
      const genericId = ((await generic.json()) as { data: { id: string } })
        .data.id;
      expect(
        (
          await request(
            `/time-blocks/${genericId}/cascade-resize`,
            ownerToken,
            "PATCH",
            { startTime: "08:00", endTime: "09:20" }
          )
        ).status
      ).toBe(409);
      const [unchanged] = await db
        .select()
        .from(timeBlocks)
        .where(eq(timeBlocks.id, genericId));
      expect(unchanged!.endTime).toBe("09:00");
      expect((await linkedBlocks(session.id))[0]!.startTime).toBe("09:00");
      expect(
        (
          await request(`/time-blocks/${genericId}`, ownerToken, "PATCH", {
            title: "Edited generic",
          })
        ).status
      ).toBe(200);
      expect(
        (await request(`/time-blocks/${genericId}`, ownerToken, "DELETE"))
          .status
      ).toBe(200);

      const [task] = await db
        .insert(tasks)
        .values({ userId: ownerId, title: "Ordinary Task" })
        .returning({ id: tasks.id });
      const taskBlock = await request("/time-blocks", ownerToken, "POST", {
        taskId: task!.id,
        title: "Task block",
        date: "2030-04-16",
        startTime: "08:00",
        endTime: "08:30",
      });
      expect(taskBlock.status).toBe(201);
      const taskBlockId = ((await taskBlock.json()) as { data: { id: string } })
        .data.id;
      expect(
        (
          await request(`/time-blocks/${taskBlockId}`, ownerToken, "PATCH", {
            title: "Edited task block",
          })
        ).status
      ).toBe(200);
      expect(
        (await request(`/time-blocks/${taskBlockId}`, ownerToken, "DELETE"))
          .status
      ).toBe(200);
    });

    it("validates schedules and conservatively rejects inactive Assignments", async () => {
      const timezoneResponse = await request(
        "/study-sessions",
        ownerToken,
        "POST",
        {
          assignmentId,
          ...schedule("2030-04-18T09:00:00.000Z"),
          timezone: "Asia/Kolkata",
        }
      );
      expect(timezoneResponse.status).toBe(201);
      const timezoneSession = (
        (await timezoneResponse.json()) as { data: SessionResult }
      ).data;
      expect((await linkedBlocks(timezoneSession.id))[0]).toMatchObject({
        date: "2030-04-18",
        startTime: "14:30",
        endTime: "15:10",
      });
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId,
            ...schedule(),
            userId: otherId,
          })
        ).status
      ).toBe(400);
      expect(
        (
          await request(
            `/study-sessions/${timezoneSession.id}`,
            ownerToken,
            "PATCH",
            { revision: 99 },
            timezoneSession.revision
          )
        ).status
      ).toBe(400);
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId,
            ...schedule(),
            timezone: "No/Such_Zone",
          })
        ).status
      ).toBe(400);
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId,
            ...schedule(),
            timezone: "+05:30",
          })
        ).status
      ).toBe(400);
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId,
            ...schedule(),
            plannedMinutes: 20,
          })
        ).status
      ).toBe(400);
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId,
            ...schedule("2030-04-09T23:40:00.000Z"),
          })
        ).status
      ).toBe(400);
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId: "bad-id",
            ...schedule(),
          })
        ).status
      ).toBe(400);
      expect((await request("/study-sessions/bad-id")).status).toBe(400);
      const completedAssignment = await newAssignment({ status: "completed" });
      const cancelledAssignment = await newAssignment({ status: "cancelled" });
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId: completedAssignment,
            ...schedule(),
          })
        ).status
      ).toBe(409);
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId: cancelledAssignment,
            ...schedule(),
          })
        ).status
      ).toBe(409);
      const deletedAssignment = await newAssignment();
      const existing = await create(deletedAssignment);
      await db
        .update(assignments)
        .set({ deletedAt: new Date() })
        .where(eq(assignments.id, deletedAssignment));
      expect(
        (
          await request("/study-sessions", ownerToken, "POST", {
            assignmentId: deletedAssignment,
            ...schedule(),
          })
        ).status
      ).toBe(404);
      expect((await request(`/study-sessions/${existing.id}`)).status).toBe(
        200
      );
      expect(
        (await request(`/study-sessions?assignmentId=${deletedAssignment}`))
          .status
      ).toBe(200);
      expect(
        (
          await request(
            `/study-sessions/${existing.id}/reschedule`,
            ownerToken,
            "POST",
            schedule("2030-04-10T09:00:00.000Z"),
            1
          )
        ).status
      ).toBe(404);
    });

    it("allows only one of two concurrent writes using the same revision", async () => {
      const session = await create(
        await newAssignment(),
        ownerToken,
        "2030-04-19T09:00:00.000Z"
      );
      const responses = await Promise.all([
        request(
          `/study-sessions/${session.id}`,
          ownerToken,
          "PATCH",
          { timezone: "UTC" },
          1
        ),
        request(
          `/study-sessions/${session.id}/skip`,
          ownerToken,
          "POST",
          undefined,
          1
        ),
      ]);
      expect(responses.map((response) => response.status).sort()).toEqual([
        200, 409,
      ]);
      const [stored] = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, session.id));
      expect(stored!.revision).toBe(2);
      expect(await linkedBlocks(session.id)).toHaveLength(
        stored!.status === "planned" ? 1 : 0
      );
    });
  }
);
