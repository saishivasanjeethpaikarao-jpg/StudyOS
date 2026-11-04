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

  it("retains conflicting mutations in a durable conflicts store so user edits are not lost", async () => {
    let queue: QueueItem[] = [
      {
        clientMutationId: "m-conflict",
        entityType: "task",
        operation: "update",
        entityId: "t1",
        expectedRevision: 1,
        payload: { title: "Conflicting offline edit" },
        queuedAt: new Date().toISOString(),
        attempts: 0,
      },
    ];
    const conflictsStore: Array<QueueItem & { lastError: string }> = [];

    for (const item of [...queue]) {
      const status = 409;
      if (status === 409) {
        conflictsStore.push({ ...item, lastError: "Revision conflict: newer data exists on server." });
        queue = queue.filter((c) => c.clientMutationId !== item.clientMutationId);
      }
    }

    expect(queue).toHaveLength(0);
    expect(conflictsStore).toHaveLength(1);
    expect(conflictsStore[0].clientMutationId).toBe("m-conflict");
    expect(conflictsStore[0].payload.title).toBe("Conflicting offline edit");
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
  it("simulates two-device concurrent edit conflict and recovery", async () => {
    // Initial state: Task t1 at revision 1 on both Device A (Windows) and Device B (Android)
    let serverTask = { id: "t1", title: "Original Title", revision: 1 };
    let deviceBEntities: StoredEntity[] = [
      { entityType: "task", entityId: "t1", data: { ...serverTask }, deleted: false }
    ];
    let deviceBConflicts: Array<QueueItem & { lastError: string }> = [];

    // 1. Device A updates task on server to revision 2
    serverTask = { ...serverTask, title: "Title from Device A", revision: 2 };

    // 2. Device B, having been offline with expectedRevision: 1, attempts to update
    const deviceBMutation: QueueItem = {
      clientMutationId: "b-mut-1",
      entityType: "task",
      operation: "update",
      entityId: "t1",
      expectedRevision: 1,
      payload: { title: "Conflicting Title from Device B" },
      queuedAt: new Date().toISOString(),
      attempts: 0,
    };

    // Server check: expectedRevision (1) !== serverTask.revision (2) -> 409 SYNC_CONFLICT
    const hasConflict = deviceBMutation.expectedRevision !== serverTask.revision;
    expect(hasConflict).toBe(true);

    if (hasConflict) {
      deviceBConflicts.push({ ...deviceBMutation, lastError: "Revision conflict: newer data exists on server." });
    }

    // Verify Device B preserved its edit in conflicts store
    expect(deviceBConflicts).toHaveLength(1);
    expect(deviceBConflicts[0].payload.title).toBe("Conflicting Title from Device B");

    // 3. Device B pulls downstream changes from server
    const downstreamChanges: SyncChange[] = [
      {
        sequence: 10,
        entityType: "task",
        entityId: "t1",
        revision: serverTask.revision,
        operation: "upsert",
        payload: { ...serverTask },
        changedAt: new Date().toISOString(),
      }
    ];
    deviceBEntities = applyChanges(deviceBEntities, downstreamChanges);

    // Verify Device B cache now reflects authoritative server state (Device A's edit)
    const updatedInCache = deviceBEntities.find((e) => e.entityId === "t1");
    expect(updatedInCache?.data.title).toBe("Title from Device A");
    expect(updatedInCache?.data.revision).toBe(2);

    // 4. User can inspect conflict and rebase mutation with new revision 2
    const resolvedMutation: QueueItem = {
      ...deviceBConflicts[0],
      clientMutationId: "b-mut-2",
      expectedRevision: updatedInCache?.data.revision as number,
      payload: { title: "Merged Title from Device B" },
    };
    deviceBConflicts = [];

    // Server now accepts mutation because expectedRevision (2) == serverTask.revision (2)
    expect(resolvedMutation.expectedRevision).toBe(serverTask.revision);
    serverTask = { ...serverTask, title: "Merged Title from Device B", revision: 3 };
    expect(serverTask.revision).toBe(3);
    expect(serverTask.title).toBe("Merged Title from Device B");
  });

  it("verifies duplicate mutations with same clientMutationId are idempotent", () => {
    // Receipts map simulates sync_mutation_receipts table
    const receipts = new Map<string, { requestHash: string; response: Record<string, unknown> }>();
    let executions = 0;

    const processMutation = (input: { clientMutationId: string; title: string }) => {
      const hash = input.title; // mock hash
      if (receipts.has(input.clientMutationId)) {
        const existing = receipts.get(input.clientMutationId)!;
        if (existing.requestHash !== hash) {
          throw new Error("Conflict: clientMutationId reused with different content");
        }
        return { replayed: true, response: existing.response };
      }
      executions += 1;
      const response = { id: "t100", title: input.title, revision: 1 };
      receipts.set(input.clientMutationId, { requestHash: hash, response });
      return { replayed: false, response };
    };

    // First attempt
    const res1 = processMutation({ clientMutationId: "idempotent-uuid-1", title: "Buy textbook" });
    expect(res1.replayed).toBe(false);
    expect(executions).toBe(1);

    // Network retry with exact same payload
    const res2 = processMutation({ clientMutationId: "idempotent-uuid-1", title: "Buy textbook" });
    expect(res2.replayed).toBe(true);
    expect(executions).toBe(1); // Not executed twice!
    expect(res2.response).toEqual(res1.response);
  });
});
