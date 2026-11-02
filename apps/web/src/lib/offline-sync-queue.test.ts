import { afterEach, describe, expect, it } from "vitest";
import type { SyncMutationInput } from "@open-sunsama/api-client";
import {
  clearQueuedSyncMutations,
  enqueueSyncMutation,
  listQueuedSyncMutations,
  removeQueuedSyncMutation,
  updateQueuedSyncMutation,
} from "./offline-sync-queue";

function makeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  } as Storage;
}

const input: SyncMutationInput = {
  clientMutationId: "00000000-0000-4000-8000-000000000001",
  entityType: "subject",
  operation: "create",
  entityId: "00000000-0000-4000-8000-000000000002",
  payload: { name: "Mathematics" },
};

describe("offline sync queue", () => {
  const originalWindow = globalThis.window;
  afterEach(() => {
    clearQueuedSyncMutations();
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      configurable: true,
    });
  });

  it("keeps queued changes isolated by account and supports retry metadata", () => {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: makeStorage() },
      configurable: true,
    });
    enqueueSyncMutation("user-a", input);
    expect(listQueuedSyncMutations("user-a")).toHaveLength(1);
    expect(listQueuedSyncMutations("user-b")).toHaveLength(0);

    updateQueuedSyncMutation("user-a", input.clientMutationId, {
      attempts: 2,
      lastError: "offline",
    });
    expect(listQueuedSyncMutations("user-a")[0]).toMatchObject({
      attempts: 2,
      lastError: "offline",
    });
    removeQueuedSyncMutation("user-a", input.clientMutationId);
    expect(listQueuedSyncMutations("user-a")).toHaveLength(0);
  });

  it("persists revision-aware task lifecycle mutations without duplicates", () => {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: makeStorage() },
      configurable: true,
    });
    const taskId = "00000000-0000-4000-8000-000000000010";
    const create: SyncMutationInput = {
      clientMutationId: "00000000-0000-4000-8000-000000000011",
      entityType: "task",
      operation: "create",
      entityId: taskId,
      payload: { title: "Study offline", scheduledDate: "2026-11-02" },
    };
    const update: SyncMutationInput = {
      clientMutationId: "00000000-0000-4000-8000-000000000012",
      entityType: "task",
      operation: "update",
      entityId: taskId,
      expectedRevision: 1,
      payload: { title: "Study offline now" },
    };
    const complete: SyncMutationInput = {
      clientMutationId: "00000000-0000-4000-8000-000000000013",
      entityType: "task",
      operation: "update",
      entityId: taskId,
      expectedRevision: 2,
      payload: { completedAt: "2026-11-02T09:00:00.000Z" },
    };
    const remove: SyncMutationInput = {
      clientMutationId: "00000000-0000-4000-8000-000000000014",
      entityType: "task",
      operation: "delete",
      entityId: taskId,
      expectedRevision: 3,
      payload: {},
    };

    for (const mutation of [create, update, complete, remove]) {
      enqueueSyncMutation("user-a", mutation);
      enqueueSyncMutation("user-a", mutation);
    }

    expect(listQueuedSyncMutations("user-a").map((item) => item.input)).toEqual(
      [create, update, complete, remove]
    );
  });

  it("keeps subtask parent linkage and revision conflicts in the queue", () => {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: makeStorage() },
      configurable: true,
    });
    const mutation: SyncMutationInput = {
      clientMutationId: "00000000-0000-4000-8000-000000000021",
      entityType: "subtask",
      operation: "create",
      entityId: "00000000-0000-4000-8000-000000000022",
      payload: {
        taskId: "00000000-0000-4000-8000-000000000023",
        title: "Read the chapter",
      },
    };
    enqueueSyncMutation("user-a", mutation);
    const [queued] = listQueuedSyncMutations("user-a");
    if (!queued || !queued.input.payload)
      throw new Error("Mutation was not queued");
    expect(queued.input).toMatchObject({
      entityType: "subtask",
      payload: { taskId: "00000000-0000-4000-8000-000000000023" },
    });
  });
});
