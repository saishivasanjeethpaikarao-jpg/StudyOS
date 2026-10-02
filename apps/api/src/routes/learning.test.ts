import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Hono } from "hono";
import {
  assignments,
  eq,
  getDb,
  resetDbInstance,
  resources,
  subjects,
  users,
  type DbClient,
} from "@open-sunsama/database";
import { signToken } from "../lib/jwt.js";
import { errorHandler } from "../middleware/error.js";
import { resourcesRouter } from "./resources.js";
import { studyNotesRouter } from "./study-notes.js";
import { studyRemindersRouter } from "./study-reminders.js";
import { focusSessionsRouter } from "./focus-sessions.js";
import { quizzesRouter, quizAttemptsRouter } from "./quizzes.js";
import { uploadsRouter } from "./uploads.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)(
  "Phase 3 learning API against PostgreSQL",
  () => {
    const app = new Hono();
    app.route("/resources", resourcesRouter);
    app.route("/study-notes", studyNotesRouter);
    app.route("/study-reminders", studyRemindersRouter);
    app.route("/focus-sessions", focusSessionsRouter);
    app.route("/quizzes", quizzesRouter);
    app.route("/quiz-attempts", quizAttemptsRouter);
    app.route("/uploads", uploadsRouter);
    app.onError(errorHandler);

    let db: DbClient;
    let ownerId: string;
    let otherId: string;
    let ownerToken: string;
    let otherToken: string;
    let subjectId: string;
    let assignmentId: string;
    let foreignSubjectId: string;

    const request = (
      path: string,
      token = ownerToken,
      method = "GET",
      body?: unknown,
      revision?: number
    ) => {
      const headers = new Headers({ Authorization: `Bearer ${token}` });
      if (body !== undefined) headers.set("Content-Type", "application/json");
      if (revision !== undefined) headers.set("If-Match", `"${revision}"`);
      return app.request(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    };
    const data = async <T>(response: Response): Promise<T> =>
      ((await response.json()) as { data: T }).data;

    beforeAll(async () => {
      process.env.DATABASE_URL = testDatabaseUrl;
      resetDbInstance();
      db = getDb();
      const marker = randomUUID();
      const created = await db
        .insert(users)
        .values([
          { email: `phase3-owner-${marker}@example.com`, passwordHash: "x" },
          { email: `phase3-other-${marker}@example.com`, passwordHash: "x" },
        ])
        .returning({ id: users.id });
      ownerId = created[0]!.id;
      otherId = created[1]!.id;
      ownerToken = signToken(ownerId);
      otherToken = signToken(otherId);
      const ownSubjects = await db
        .insert(subjects)
        .values([
          { userId: ownerId, name: "Phase 3 Chemistry" },
          { userId: otherId, name: "Other private subject" },
        ])
        .returning({ id: subjects.id, userId: subjects.userId });
      subjectId = ownSubjects.find((item) => item.userId === ownerId)!.id;
      foreignSubjectId = ownSubjects.find(
        (item) => item.userId === otherId
      )!.id;
      const [assignment] = await db
        .insert(assignments)
        .values({
          userId: ownerId,
          subjectId,
          title: "Phase 3 practice",
          dueAt: new Date("2030-05-01T18:00:00Z"),
        })
        .returning({ id: assignments.id });
      assignmentId = assignment!.id;
    });

    afterAll(async () => {
      if (db && ownerId) await db.delete(users).where(eq(users.id, ownerId));
      if (db && otherId) await db.delete(users).where(eq(users.id, otherId));
      if (db) await db.$client.end();
      resetDbInstance();
    });

    it("creates reusable resources and protects owner-scoped associations", async () => {
      const created = await request("/resources", ownerToken, "POST", {
        type: "youtube",
        title: "Cell lesson",
        url: "https://youtu.be/dQw4w9WgXcQ",
        link: { subjectId },
      });

      expect(created.status).toBe(201);
      const resource = await data<{
        id: string;
        revision: number;
        url: string;
      }>(created);
      expect(resource.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(
        (
          await data<{ id: string }[]>(
            await request(`/resources?subjectId=${subjectId}`)
          )
        ).map((item) => item.id)
      ).toContain(resource.id);
      expect(
        (await request(`/resources?subjectId=${foreignSubjectId}`)).status
      ).toBe(404);
      expect(
        (await request(`/resources/${resource.id}`, otherToken)).status
      ).toBe(404);
      expect(
        (await request(`/resources/${resource.id}/links`, otherToken)).status
      ).toBe(404);
      expect(
        (
          await request(`/resources/${resource.id}/links`, ownerToken, "POST", {
            assignmentId,
          })
        ).status
      ).toBe(201);
      expect(
        (await request(`/resources?assignmentId=${assignmentId}`)).status
      ).toBe(200);
      expect(
        (
          await request("/resources", ownerToken, "POST", {
            type: "web",
            title: "Bad",
            url: "file:///secret",
            link: { subjectId },
          })
        ).status
      ).toBe(400);
      expect(
        (
          await request(
            `/resources/${resource.id}`,
            ownerToken,
            "PATCH",
            { completed: true },
            resource.revision
          )
        ).status
      ).toBe(200);
      expect(
        (
          await request(
            `/resources/${resource.id}`,
            ownerToken,
            "PATCH",
            { title: "Stale" },
            resource.revision
          )
        ).status
      ).toBe(409);
      const current = await data<{ revision: number }>(
        await request(`/resources/${resource.id}`)
      );
      expect(
        (
          await request(
            `/resources/${resource.id}`,
            ownerToken,
            "DELETE",
            undefined,
            current.revision
          )
        ).status
      ).toBe(200);
      expect((await request(`/resources/${resource.id}`)).status).toBe(404);
    });

    it("rejects unsafe uploads and never exposes private resource files through the inherited proxy", async () => {
      const [file] = await db
        .insert(resources)
        .values({
          userId: ownerId,
          type: "file",
          title: "Private PDF",
          storageKey: `resources/${ownerId}/${randomUUID()}-private.pdf`,
          mimeType: "application/pdf",
          filename: "private.pdf",
          sizeBytes: 5,
        })
        .returning({ id: resources.id });
      expect(
        (await request(`/resources/${file!.id}/file`, otherToken)).status
      ).toBe(404);
      expect(
        (await request(`/uploads/resources/${ownerId}/private.pdf`)).status
      ).toBe(404);
      const body = new FormData();
      body.set(
        "file",
        new File(["<svg/>"], "unsafe.svg", { type: "image/svg+xml" })
      );
      const response = await app.request("/resources/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${ownerToken}` },
        body,
      });
      expect(response.status).toBe(400);
    });

    it("keeps notes and reminders private with revision-safe mutations", async () => {
      expect(
        (await request(`/study-notes?subjectId=${foreignSubjectId}`)).status
      ).toBe(404);
      const note = await data<{ id: string; revision: number }>(
        await request("/study-notes", ownerToken, "POST", {
          title: "Equations",
          body: "A + B",
          assignmentId,
        })
      );
      expect(
        (await request(`/study-notes/${note.id}`, otherToken)).status
      ).toBe(404);
      expect(
        (
          await request(
            `/study-notes/${note.id}`,
            ownerToken,
            "PATCH",
            { body: "Updated" },
            note.revision
          )
        ).status
      ).toBe(200);
      expect(
        (
          await request(
            `/study-notes/${note.id}`,
            ownerToken,
            "DELETE",
            undefined,
            note.revision
          )
        ).status
      ).toBe(409);
      const current = await data<{ revision: number }>(
        await request(`/study-notes/${note.id}`)
      );
      expect(
        (
          await request(
            `/study-notes/${note.id}`,
            ownerToken,
            "DELETE",
            undefined,
            current.revision
          )
        ).status
      ).toBe(200);
      expect((await request(`/study-notes/${note.id}`)).status).toBe(404);
      const reminder = await data<{ id: string; revision: number }>(
        await request("/study-reminders", ownerToken, "POST", {
          title: "Revise",
          remindAt: "2030-05-01T10:00:00Z",
          subjectId,
        })
      );
      expect(
        (
          await request(
            `/study-reminders/${reminder.id}/dismiss`,
            otherToken,
            "POST",
            {},
            reminder.revision
          )
        ).status
      ).toBe(404);
      expect(
        (
          await request(
            `/study-reminders/${reminder.id}`,
            ownerToken,
            "PATCH",
            { assignmentId },
            reminder.revision
          )
        ).status
      ).toBe(409);
      expect(
        (
          await request(
            `/study-reminders/${reminder.id}/dismiss`,
            ownerToken,
            "POST",
            {},
            reminder.revision
          )
        ).status
      ).toBe(200);
    });

    it("tracks factual focus time without allowing foreign item access", async () => {
      expect(
        (
          await request("/focus-sessions", ownerToken, "POST", {
            subjectId: foreignSubjectId,
          })
        ).status
      ).toBe(404);
      const focus = await data<{ id: string; revision: number }>(
        await request("/focus-sessions", ownerToken, "POST", { assignmentId })
      );
      expect(
        (
          await request(
            `/focus-sessions/${focus.id}/finish`,
            otherToken,
            "POST",
            {},
            focus.revision
          )
        ).status
      ).toBe(404);
      const finished = await data<{ state: string; durationSeconds: number }>(
        await request(
          `/focus-sessions/${focus.id}/finish`,
          ownerToken,
          "POST",
          {},
          focus.revision
        )
      );
      expect(finished.state).toBe("completed");
      expect(finished.durationSeconds).toBeGreaterThanOrEqual(0);
    });

    it("hides answer keys before submission and preserves scored attempt history after edits", async () => {
      const input = {
        title: "Biology check",
        subjectId,
        assignmentId,
        status: "published",
        questions: [
          {
            type: "single",
            prompt: "Which one?",
            explanation: "A is right",
            options: [
              { text: "A", isCorrect: true },
              { text: "B", isCorrect: false },
            ],
          },
          {
            type: "multiple",
            prompt: "Which set?",
            options: [
              { text: "C", isCorrect: true },
              { text: "D", isCorrect: true },
              { text: "E", isCorrect: false },
            ],
          },
        ],
      };
      expect(
        (
          await request("/quizzes", ownerToken, "POST", {
            ...input,
            questions: [
              {
                ...input.questions[0],
                options: [
                  { text: "A", isCorrect: false },
                  { text: "B", isCorrect: false },
                ],
              },
            ],
          })
        ).status
      ).toBe(400);
      const quiz = await data<{ id: string; revision: number }>(
        await request("/quizzes", ownerToken, "POST", input)
      );
      expect((await request(`/quizzes/${quiz.id}`, otherToken)).status).toBe(
        404
      );
      expect(
        (await request(`/quizzes?subjectId=${foreignSubjectId}`)).status
      ).toBe(404);
      const startedResponse = await request(
        `/quizzes/${quiz.id}/attempts`,
        ownerToken,
        "POST",
        {}
      );
      expect(startedResponse.status).toBe(201);
      const started = await data<{
        id: string;
        questions: { id: string; options: { id: string; text: string }[] }[];
      }>(startedResponse);
      expect(JSON.stringify(started)).not.toMatch(
        /isCorrect|explanation|A is right/
      );
      expect(
        (await request(`/quiz-attempts/${started.id}`, otherToken)).status
      ).toBe(404);
      const answers = started.questions.map((question, index) => ({
        questionId: question.id,
        selectedOptionIds:
          index === 0
            ? [question.options[0]!.id]
            : [question.options[0]!.id, question.options[1]!.id],
      }));
      const submitted = await data<{
        correctCount: number;
        scorePercent: number;
        questions: unknown[];
      }>(
        await request(
          `/quiz-attempts/${started.id}/submit`,
          ownerToken,
          "POST",
          { answers }
        )
      );
      expect(submitted).toMatchObject({ correctCount: 2, scorePercent: 100 });
      expect(
        (
          await request(
            `/quiz-attempts/${started.id}/submit`,
            ownerToken,
            "POST",
            { answers }
          )
        ).status
      ).toBe(200);
      const changed = {
        ...input,
        title: "Edited check",
        questions: [{ ...input.questions[0], prompt: "New question" }],
      };
      expect(
        (
          await request(
            `/quizzes/${quiz.id}`,
            ownerToken,
            "PUT",
            changed,
            quiz.revision
          )
        ).status
      ).toBe(200);
      const historical = await data<{
        questions: { prompt: string }[];
        scorePercent: number;
      }>(await request(`/quiz-attempts/${started.id}`));
      expect(historical.questions[0]?.prompt).toBe("Which one?");
      expect(historical.scorePercent).toBe(100);
      expect(
        (await request(`/quizzes/${quiz.id}/attempts`, ownerToken)).status
      ).toBe(200);
      expect(
        (await request(`/quizzes/${quiz.id}/attempts`, otherToken)).status
      ).toBe(404);
    });
  }
);
