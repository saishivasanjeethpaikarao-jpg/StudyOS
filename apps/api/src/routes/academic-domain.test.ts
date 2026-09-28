import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import {
  assignments,
  eq,
  getDb,
  resetDbInstance,
  users,
  type DbClient,
} from "@open-sunsama/database";
import { errorHandler } from "../middleware/error.js";
import { signToken } from "../lib/jwt.js";
import { assignmentsRouter } from "./assignments.js";
import { subjectsRouter } from "./subjects.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)(
  "academic domain ownership and CRUD against PostgreSQL",
  () => {
    const app = new Hono();
    app.route("/subjects", subjectsRouter);
    app.route("/assignments", assignmentsRouter);
    app.onError(errorHandler);

    let db: DbClient;
    let firstUserId: string;
    let secondUserId: string;
    let firstToken: string;
    let secondToken: string;
    let subjectId: string;
    let secondSubjectId: string;
    let assignmentId: string;

    function request(
      path: string,
      token?: string,
      method = "GET",
      body?: unknown
    ) {
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      if (body !== undefined) headers.set("Content-Type", "application/json");
      return app.request(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    }

    beforeAll(async () => {
      process.env.DATABASE_URL = testDatabaseUrl;
      resetDbInstance();
      db = getDb();

      const marker = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const createdUsers = await db
        .insert(users)
        .values([
          { email: `academic-owner-${marker}@example.com`, passwordHash: "x" },
          { email: `academic-other-${marker}@example.com`, passwordHash: "x" },
        ])
        .returning({ id: users.id });

      firstUserId = createdUsers[0]!.id;
      secondUserId = createdUsers[1]!.id;
      firstToken = signToken(firstUserId);
      secondToken = signToken(secondUserId);
    });

    afterAll(async () => {
      if (db && firstUserId) {
        await db.delete(users).where(eq(users.id, firstUserId));
      }
      if (db && secondUserId) {
        await db.delete(users).where(eq(users.id, secondUserId));
      }
      if (db) await db.$client.end();
      resetDbInstance();
    });

    it("requires authentication and keeps subjects private to their owner", async () => {
      expect((await request("/subjects")).status).toBe(401);

      const createResponse = await request("/subjects", firstToken, "POST", {
        name: "Mathematics",
        description: "Core mathematics work",
        color: "#3B82F6",
        icon: "Calculator",
      });
      expect(createResponse.status).toBe(201);
      const created = (await createResponse.json()) as {
        data: { id: string; userId: string; revision: number };
      };
      subjectId = created.data.id;
      expect(created.data.userId).toBe(firstUserId);
      expect(created.data.revision).toBe(1);

      const otherList = (await (
        await request("/subjects", secondToken)
      ).json()) as { data: Array<{ id: string }> };
      expect(otherList.data).toEqual([]);

      expect(
        (await request(`/subjects/${subjectId}`, secondToken)).status
      ).toBe(404);
      expect(
        (
          await request(`/subjects/${subjectId}`, secondToken, "PATCH", {
            name: "Stolen",
          })
        ).status
      ).toBe(404);
      expect(
        (await request(`/subjects/${subjectId}`, secondToken, "DELETE")).status
      ).toBe(404);

      const updatedResponse = await request(
        `/subjects/${subjectId}`,
        firstToken,
        "PATCH",
        { name: "Advanced Mathematics" }
      );
      expect(updatedResponse.status).toBe(200);
      const updated = (await updatedResponse.json()) as {
        data: { name: string; revision: number };
      };
      expect(updated.data).toMatchObject({
        name: "Advanced Mathematics",
        revision: 2,
      });
    });

    it("rejects foreign subject links and isolates assignment CRUD", async () => {
      const foreignSubjectResponse = await request(
        "/assignments",
        secondToken,
        "POST",
        {
          subjectId,
          title: "Unauthorized assignment",
          dueAt: "2026-10-10T12:00:00.000Z",
        }
      );
      expect(foreignSubjectResponse.status).toBe(404);

      const createResponse = await request("/assignments", firstToken, "POST", {
        subjectId,
        title: "Calculus problem set",
        description: "Complete exercises 1-20",
        dueAt: "2026-10-10T12:00:00.000Z",
        priority: "P1",
        estimatedMinutes: 180,
      });
      expect(createResponse.status).toBe(201);
      const created = (await createResponse.json()) as {
        data: {
          id: string;
          userId: string;
          subjectId: string;
          revision: number;
        };
      };
      assignmentId = created.data.id;
      expect(created.data).toMatchObject({
        userId: firstUserId,
        subjectId,
        revision: 1,
      });

      const otherList = (await (
        await request("/assignments", secondToken)
      ).json()) as { data: Array<{ id: string }> };
      expect(otherList.data).toEqual([]);

      expect(
        (await request(`/assignments/${assignmentId}`, secondToken)).status
      ).toBe(404);
      expect(
        (
          await request(`/assignments/${assignmentId}`, secondToken, "PATCH", {
            title: "Stolen",
          })
        ).status
      ).toBe(404);
      expect(
        (await request(`/assignments/${assignmentId}`, secondToken, "DELETE"))
          .status
      ).toBe(404);

      const updateResponse = await request(
        `/assignments/${assignmentId}`,
        firstToken,
        "PATCH",
        { status: "in_progress", completedMinutes: 45 }
      );
      expect(updateResponse.status).toBe(200);
      const updated = (await updateResponse.json()) as {
        data: { status: string; completedMinutes: number; revision: number };
      };
      expect(updated.data).toMatchObject({
        status: "in_progress",
        completedMinutes: 45,
        revision: 2,
      });
    });

    it("validates subject ownership before filtering assignments", async () => {
      const ownFilterResponse = await request(
        `/assignments?subjectId=${subjectId}`,
        firstToken
      );
      expect(ownFilterResponse.status).toBe(200);
      const ownFilter = (await ownFilterResponse.json()) as {
        data: Array<{ id: string; subjectId: string }>;
      };
      expect(ownFilter.data).toEqual([
        expect.objectContaining({ id: assignmentId, subjectId }),
      ]);

      const secondSubjectResponse = await request(
        "/subjects",
        secondToken,
        "POST",
        { name: "Physics" }
      );
      expect(secondSubjectResponse.status).toBe(201);
      const secondSubject = (await secondSubjectResponse.json()) as {
        data: { id: string };
      };
      secondSubjectId = secondSubject.data.id;

      expect(
        (await request(`/assignments?subjectId=${secondSubjectId}`, firstToken))
          .status
      ).toBe(404);
      expect(
        (
          await request(
            "/assignments?subjectId=00000000-0000-4000-8000-000000000000",
            firstToken
          )
        ).status
      ).toBe(404);
    });

    it("soft-deletes assignments and preserves them when a subject is deleted", async () => {
      const deleteAssignment = await request(
        `/assignments/${assignmentId}`,
        firstToken,
        "DELETE"
      );
      expect(deleteAssignment.status).toBe(200);
      expect(
        (await request(`/assignments/${assignmentId}`, firstToken)).status
      ).toBe(404);

      const [deletedAssignment] = await db
        .select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId));
      expect(deletedAssignment?.deletedAt).toBeInstanceOf(Date);
      expect(deletedAssignment?.revision).toBe(3);

      const activeAssignmentResponse = await request(
        "/assignments",
        firstToken,
        "POST",
        {
          subjectId,
          title: "Exam revision plan",
          description: "Preserve this assignment when its subject is deleted",
          dueAt: "2026-10-12T12:00:00.000Z",
          priority: "P0",
          estimatedMinutes: 240,
        }
      );
      expect(activeAssignmentResponse.status).toBe(201);
      const activeAssignment = (await activeAssignmentResponse.json()) as {
        data: { id: string; revision: number };
      };
      const oldUpdatedAt = new Date("2020-01-01T00:00:00.000Z");
      await db
        .update(assignments)
        .set({ updatedAt: oldUpdatedAt })
        .where(eq(assignments.id, activeAssignment.data.id));

      const otherAssignmentResponse = await request(
        "/assignments",
        secondToken,
        "POST",
        {
          subjectId: secondSubjectId,
          title: "Other student's physics assignment",
          dueAt: "2026-10-14T12:00:00.000Z",
        }
      );
      expect(otherAssignmentResponse.status).toBe(201);
      const otherAssignment = (await otherAssignmentResponse.json()) as {
        data: {
          id: string;
          subjectId: string;
          revision: number;
          updatedAt: string;
        };
      };

      const deleteSubject = await request(
        `/subjects/${subjectId}`,
        firstToken,
        "DELETE"
      );
      expect(deleteSubject.status).toBe(200);
      expect((await request(`/subjects/${subjectId}`, firstToken)).status).toBe(
        404
      );

      const [preservedAssignment] = await db
        .select()
        .from(assignments)
        .where(eq(assignments.id, assignmentId));
      expect(preservedAssignment).toBeDefined();
      expect(preservedAssignment?.subjectId).toBeNull();

      const [preservedActiveAssignment] = await db
        .select()
        .from(assignments)
        .where(eq(assignments.id, activeAssignment.data.id));
      expect(preservedActiveAssignment).toMatchObject({
        subjectId: null,
        title: "Exam revision plan",
        description: "Preserve this assignment when its subject is deleted",
        priority: "P0",
        estimatedMinutes: 240,
        revision: activeAssignment.data.revision + 1,
      });
      expect(preservedActiveAssignment!.updatedAt.getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime()
      );

      const [unaffectedOtherAssignment] = await db
        .select()
        .from(assignments)
        .where(eq(assignments.id, otherAssignment.data.id));
      expect(unaffectedOtherAssignment).toMatchObject({
        subjectId: otherAssignment.data.subjectId,
        revision: otherAssignment.data.revision,
      });
      expect(unaffectedOtherAssignment!.updatedAt.toISOString()).toBe(
        otherAssignment.data.updatedAt
      );
    });
  }
);
