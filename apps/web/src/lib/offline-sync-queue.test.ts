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
});
