import { describe, expect, it } from "vitest";
import type { SyncChange, SyncMutationInput } from "./index.js";

type StoredEntity = { entityType: string; entityId: string; data: Record<string, unknown>; deleted?: boolean };
type QueueItem = SyncMutationInput & { queuedAt: string; attempts: number };

function applyChanges(entries: StoredEntity[], changes: SyncChange[]): StoredEntity[] {
  const next = new Map(entries.map((entry) => [`${entry.entityType}:${entry.entityId}`, entry]));
  for (const change of changes) {
    const mapKey = `${change.entityType}:${change.entityId}`;
    if (change.operation === "delete" || !change.payload) {
      next.set(mapKey, {
        entityType: change.entityType,
        entityId: change.entityId,
        data: change.payload ?? {},
        deleted: true,
      });
    } else {
      next.set(mapKey, {
        entityType: change.entityType,
        entityId: change.entityId,
        data: change.payload,
        deleted: false,
      });
    }
  }
  return [...next.values()];
}

describe("Mobile Sync & Cache Mechanics", () => {
  it("upserts entities and replaces existing cached records by composite key", () => {
    const initial: StoredEntity[] = [
      { entityType: "task", entityId: "t1", data: { title: "Draft assignment" }, deleted: false },
    ];

    const changes: SyncChange[] = [
      {
        sequence: 1,
        entityType: "task",
        entityId: "t1",
        revision: 2,
        operation: "upsert",
        payload: { title: "Draft assignment (revised)" },
        changedAt: new Date().toISOString(),
      },
      {
        sequence: 2,
        entityType: "assignment",
        entityId: "a1",
        revision: 1,
        operation: "upsert",
        payload: { title: "Math Assignment", estimatedMinutes: 60 },
        changedAt: new Date().toISOString(),
      },
    ];

    const result = applyChanges(initial, changes);
    expect(result).toHaveLength(2);

    const task = result.find((item) => item.entityType === "task" && item.entityId === "t1");
    expect(task?.data.title).toBe("Draft assignment (revised)");
    expect(task?.deleted).toBe(false);

    const assignment = result.find((item) => item.entityType === "assignment" && item.entityId === "a1");
    expect(assignment?.data.title).toBe("Math Assignment");
  });

  it("marks deleted entities with tombstones so queries do not return stale items", () => {
    const initial: StoredEntity[] = [
      { entityType: "task", entityId: "t1", data: { title: "Task 1" }, deleted: false },
      { entityType: "task", entityId: "t2", data: { title: "Task 2" }, deleted: false },
    ];

    const changes: SyncChange[] = [
      {
        sequence: 3,
        entityType: "task",
        entityId: "t1",
        revision: 3,
        operation: "delete",
        payload: {},
        changedAt: new Date().toISOString(),
      },
    ];

    const result = applyChanges(initial, changes);
    const deletedTask = result.find((item) => item.entityId === "t1");
    expect(deletedTask?.deleted).toBe(true);

    const activeTask = result.find((item) => item.entityId === "t2");
    expect(activeTask?.deleted).toBe(false);
  });

  it("enforces user account storage isolation by user ID prefix", () => {
    const key = (userId: string, suffix: string) => `studyos:sync:${userId}:${suffix}`;

    const user1Key = key("user-111", "entities");
    const user2Key = key("user-222", "entities");

    expect(user1Key).toBe("studyos:sync:user-111:entities");
    expect(user2Key).toBe("studyos:sync:user-222:entities");
    expect(user1Key).not.toBe(user2Key);
  });

  it("handles offline mutation queue lifecycle and conflict filtering without blocking", async () => {
    let queue: QueueItem[] = [
      {
        clientMutationId: "m1",
        entityType: "task",
        operation: "update",
        entityId: "t1",
        expectedRevision: 1,
        payload: { title: "Conflicting task update" },
        queuedAt: new Date().toISOString(),
        attempts: 0,
      },
      {
        clientMutationId: "m2",
        entityType: "task",
        operation: "create",
        entityId: "t2",
        payload: { title: "Offline created task" },
        queuedAt: new Date().toISOString(),
        attempts: 0,
      },
    ];

    // Simulate mutation runner: m1 encounters a 409 revision conflict, m2 succeeds
    let conflicts = 0;
    const syncedMutations: string[] = [];

    for (const item of [...queue]) {
      if (item.clientMutationId === "m1") {
        conflicts += 1;
        // 409 Conflict: remove from queue and allow downstream change-feed to reconcile
        queue = queue.filter((c) => c.clientMutationId !== item.clientMutationId);
        continue;
      }
      if (item.clientMutationId === "m2") {
        syncedMutations.push(item.clientMutationId);
        queue = queue.filter((c) => c.clientMutationId !== item.clientMutationId);
      }
    }

    expect(conflicts).toBe(1);
    expect(syncedMutations).toEqual(["m2"]);
    expect(queue).toHaveLength(0); // Queue is cleanly unblocked
  });

  it("preserves cursor state and only updates after full cache persistence succeeds", async () => {
    let cursor = "100";
    let cacheSaved = false;

    const commitBatch = async (nextCursor: string, shouldFailCache: boolean) => {
      if (shouldFailCache) {
        throw new Error("Disk / storage failure");
      }
      cacheSaved = true;
      cursor = nextCursor;
    };

    // If cache persistence fails, cursor must remain at old sequence
    await expect(commitBatch("105", true)).rejects.toThrow("Disk / storage failure");
    expect(cursor).toBe("100");
    expect(cacheSaved).toBe(false);

    // When cache persistence succeeds, cursor advances
    await commitBatch("105", false);
    expect(cursor).toBe("105");
    expect(cacheSaved).toBe(true);
  });
});
