import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  assignments,
  eq,
  getDb,
  resetDbInstance,
  studyPlanApplications,
  studySessions,
  subjects,
  tasks,
  timeBlocks,
  users,
  type DbClient,
  type NewStudySession,
  type StudySessionStatus,
  insertStudySessionSchema,
} from "@open-sunsama/database";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("Study Session database invariants", () => {
  let db: DbClient;
  let ownerId: string;
  let otherId: string;
  let assignmentId: string;
  let otherAssignmentId: string;
  let subjectId: string;

  const startAt = new Date("2030-04-09T09:00:00.000Z");
  const endAt = new Date("2030-04-09T09:40:00.000Z");

  function session(overrides: Partial<NewStudySession> = {}): NewStudySession {
    return {
      userId: ownerId,
      assignmentId,
      startAt,
      endAt,
      timezone: "Asia/Kolkata",
      plannedMinutes: 40,
      ...overrides,
    };
  }

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    resetDbInstance();
    db = getDb();
    const marker = randomUUID();
    const createdUsers = await db
      .insert(users)
      .values([
        {
          email: `study-session-owner-${marker}@example.com`,
          passwordHash: "x",
        },
        {
          email: `study-session-other-${marker}@example.com`,
          passwordHash: "x",
        },
      ])
      .returning({ id: users.id });
    ownerId = createdUsers[0]!.id;
    otherId = createdUsers[1]!.id;
    const [createdSubject] = await db
      .insert(subjects)
      .values({ userId: ownerId, name: "Schema Test Subject" })
      .returning({ id: subjects.id });
    subjectId = createdSubject!.id;
    const createdAssignments = await db
      .insert(assignments)
      .values([
        {
          userId: ownerId,
          subjectId,
          title: "Schema Test Assignment",
          dueAt: new Date("2030-04-12T18:00:00.000Z"),
        },
        {
          userId: otherId,
          title: "Other Owner Assignment",
          dueAt: new Date("2030-04-12T18:00:00.000Z"),
        },
      ])
      .returning({ id: assignments.id, userId: assignments.userId });
    assignmentId = createdAssignments.find(
      (item) => item.userId === ownerId
    )!.id;
    otherAssignmentId = createdAssignments.find(
      (item) => item.userId === otherId
    )!.id;
  });

  afterAll(async () => {
    if (db && ownerId) await db.delete(users).where(eq(users.id, ownerId));
    if (db && otherId) await db.delete(users).where(eq(users.id, otherId));
    if (db) await db.$client.end();
    resetDbInstance();
  });

  it("requires an owned Assignment and initializes revision and nullable completion fields", async () => {
    await expect(
      db.insert(studySessions).values(session({ assignmentId: randomUUID() }))
    ).rejects.toThrow();
    await expect(
      db
        .insert(studySessions)
        .values(session({ assignmentId: otherAssignmentId }))
    ).rejects.toThrow();

    const [created] = await db
      .insert(studySessions)
      .values(session())
      .returning();
    expect(created).toMatchObject({
      userId: ownerId,
      assignmentId,
      revision: 1,
      status: "planned",
      actualMinutes: null,
      completedAt: null,
      deletedAt: null,
      planApplicationId: null,
    });
  });

  it("enforces time order, positive effort, valid status, and nonnegative actual minutes", async () => {
    for (const status of [
      "planned",
      "completed",
      "skipped",
      "cancelled",
    ] as const) {
      const [created] = await db
        .insert(studySessions)
        .values(session({ status }))
        .returning({ status: studySessions.status });
      expect(created!.status).toBe(status);
    }
    expect(
      insertStudySessionSchema.safeParse(
        session({ timezone: "Not/A_Timezone" })
      ).success
    ).toBe(false);
    await expect(
      db.insert(studySessions).values(session({ endAt: startAt }))
    ).rejects.toThrow();
    await expect(
      db.insert(studySessions).values(session({ plannedMinutes: 0 }))
    ).rejects.toThrow();
    await expect(
      db
        .insert(studySessions)
        .values(session({ status: "paused" as StudySessionStatus }))
    ).rejects.toThrow();
    await expect(
      db.insert(studySessions).values(session({ actualMinutes: -1 }))
    ).rejects.toThrow();
    await expect(
      db.insert(studySessions).values(session({ revision: 0 }))
    ).rejects.toThrow();
  });

  it("allows one owner-matched Time Block per session, never simultaneous Task ownership", async () => {
    const [created] = await db
      .insert(studySessions)
      .values(session())
      .returning({ id: studySessions.id });
    const [createdTask] = await db
      .insert(tasks)
      .values({ userId: ownerId, title: "Generic Task" })
      .returning({ id: tasks.id });
    const block = {
      userId: ownerId,
      studySessionId: created!.id,
      title: "Projected Study",
      date: "2030-04-09",
      startTime: "14:30",
      endTime: "15:10",
      durationMins: 40,
    };
    await db.insert(timeBlocks).values(block);
    await expect(db.insert(timeBlocks).values(block)).rejects.toThrow();
    await expect(
      db.insert(timeBlocks).values({ ...block, studySessionId: randomUUID() })
    ).rejects.toThrow();
    await expect(
      db.insert(timeBlocks).values({ ...block, userId: otherId })
    ).rejects.toThrow();
    await expect(
      db.insert(timeBlocks).values({ ...block, taskId: createdTask!.id })
    ).rejects.toThrow();
    await db.insert(timeBlocks).values({
      userId: ownerId,
      taskId: createdTask!.id,
      title: "Unchanged Generic Block",
      date: "2030-04-09",
      startTime: "16:00",
      endTime: "16:40",
      durationMins: 40,
    });
  });

  it("scopes plan-application idempotency and relationships to the owner and Assignment", async () => {
    const clientMutationId = randomUUID();
    const requestHash = "a".repeat(64);
    const [application] = await db
      .insert(studyPlanApplications)
      .values({ userId: ownerId, assignmentId, clientMutationId, requestHash })
      .returning({ id: studyPlanApplications.id });
    await expect(
      db.insert(studyPlanApplications).values({
        userId: ownerId,
        assignmentId,
        clientMutationId,
        requestHash,
      })
    ).rejects.toThrow();
    await db.insert(studyPlanApplications).values({
      userId: otherId,
      assignmentId: otherAssignmentId,
      clientMutationId,
      requestHash,
    });
    await expect(
      db.insert(studyPlanApplications).values({
        userId: ownerId,
        assignmentId: otherAssignmentId,
        clientMutationId: randomUUID(),
        requestHash,
      })
    ).rejects.toThrow();
    const [planned] = await db
      .insert(studySessions)
      .values(session({ planApplicationId: application!.id }))
      .returning({ planApplicationId: studySessions.planApplicationId });
    expect(planned!.planApplicationId).toBe(application!.id);
    await expect(
      db
        .insert(studySessions)
        .values(session({ planApplicationId: randomUUID() }))
    ).rejects.toThrow();
  });

  it("preserves Study Sessions through Assignment soft deletion and Subject unlink", async () => {
    const [created] = await db
      .insert(studySessions)
      .values(session())
      .returning({ id: studySessions.id });
    await db
      .update(assignments)
      .set({ deletedAt: new Date() })
      .where(eq(assignments.id, assignmentId));
    expect(
      (
        await db
          .select()
          .from(studySessions)
          .where(eq(studySessions.id, created!.id))
      ).length
    ).toBe(1);
    await db.delete(subjects).where(eq(subjects.id, subjectId));
    const [assignment] = await db
      .select({ subjectId: assignments.subjectId })
      .from(assignments)
      .where(eq(assignments.id, assignmentId));
    expect(assignment!.subjectId).toBeNull();
    expect(
      (
        await db
          .select()
          .from(studySessions)
          .where(eq(studySessions.id, created!.id))
      ).length
    ).toBe(1);
  });
});
