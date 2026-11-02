import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, resetDbInstance, users, tasks, eq, and, sql, type DbClient } from "@open-sunsama/database";
import { randomUUID } from "node:crypto";

const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

describe.skipIf(!testDatabaseUrl)("PostgreSQL & Hyperdrive Drizzle Integration Verification", () => {
  let db: DbClient;
  let testUserId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    resetDbInstance();
    db = getDb();

    // Create isolated test user
    const [user] = await db
      .insert(users)
      .values({
        email: `hyperdrive-test-${randomUUID()}@example.test`,
        name: "Hyperdrive Test User",
      })
      .returning();
    testUserId = user!.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await db.delete(tasks).where(eq(tasks.userId, testUserId));
      await db.delete(users).where(eq(users.id, testUserId));
    }
    await resetDbInstance();
  });

  it("1. Basic read and write executes correctly through Drizzle client", async () => {
    const taskTitle = `Test Task ${randomUUID()}`;
    const [inserted] = await db
      .insert(tasks)
      .values({
        userId: testUserId,
        title: taskTitle,
        status: "inbox",
      })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted!.title).toBe(taskTitle);

    const [found] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, inserted!.id), eq(tasks.userId, testUserId)))
      .limit(1);

    expect(found).toBeDefined();
    expect(found!.id).toBe(inserted!.id);
  });

  it("2. Multi-statement transaction commits atomically", async () => {
    const task1Title = `Tx Task 1 ${randomUUID()}`;
    const task2Title = `Tx Task 2 ${randomUUID()}`;

    const result = await db.transaction(async (tx) => {
      const [t1] = await tx.insert(tasks).values({ userId: testUserId, title: task1Title }).returning();
      const [t2] = await tx.insert(tasks).values({ userId: testUserId, title: task2Title }).returning();
      return [t1, t2];
    });

    expect(result).toHaveLength(2);

    const [persisted1] = await db.select().from(tasks).where(eq(tasks.id, result[0]!.id));
    const [persisted2] = await db.select().from(tasks).where(eq(tasks.id, result[1]!.id));

    expect(persisted1).toBeDefined();
    expect(persisted2).toBeDefined();
  });

  it("3. Transaction rolls back fully on thrown exception (no partial writes)", async () => {
    const canaryTitle = `Canary Task ${randomUUID()}`;

    await expect(
      db.transaction(async (tx) => {
        await tx.insert(tasks).values({ userId: testUserId, title: canaryTitle });
        throw new Error("Forced rollback trigger");
      })
    ).rejects.toThrow("Forced rollback trigger");

    const found = await db.select().from(tasks).where(eq(tasks.title, canaryTitle));
    expect(found).toHaveLength(0);
  });

  it("4. Concurrent requests execute without connection exhaustion or deadlocks", async () => {
    const concurrency = 15;
    const promises = Array.from({ length: concurrency }).map(async (_, idx) => {
      const title = `Concurrent Task ${idx}-${randomUUID()}`;
      const [inserted] = await db.insert(tasks).values({ userId: testUserId, title }).returning();
      const [fetched] = await db.select().from(tasks).where(eq(tasks.id, inserted!.id));
      return fetched?.id === inserted?.id;
    });

    const results = await Promise.all(promises);
    expect(results.every(Boolean)).toBe(true);
  });

  it("5. Raw SQL execution and ping check functions reliably", async () => {
    const result = await db.execute(sql`SELECT 1 as ping`);
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});
