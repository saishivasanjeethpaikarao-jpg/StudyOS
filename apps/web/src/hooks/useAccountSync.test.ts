import { describe, expect, it } from "vitest";
import { applySyncChanges } from "./useAccountSync";

describe("applySyncChanges", () => {
  it("awaits every invalidation before resolving", async () => {
    const calls: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queryClient = {
      invalidateQueries: async (input?: {
        queryKey?: readonly unknown[];
        throwOnError?: boolean;
      }) => {
        calls.push(input?.queryKey?.[0]?.toString() ?? "all");
        if (calls.length === 1) await gate;
      },
    };
    let applied = false;
    const pending = applySyncChanges(queryClient, [
      { entityType: "task" },
      { entityType: "assignment" },
    ]).then(() => {
      applied = true;
    });
    await Promise.resolve();
    expect(applied).toBe(false);
    expect(calls).toEqual(["tasks"]);
    release();
    await pending;
    expect(applied).toBe(true);
    expect(calls).toEqual([
      "tasks",
      "timeBlocks",
      "assignments",
      "study-sessions",
      "studySessions",
      "tasks",
      "timeBlocks",
    ]);
  });

  it("rejects without completing, so callers can retain the old cursor", async () => {
    const queryClient = {
      invalidateQueries: async () => {
        throw new Error("cache write failed");
      },
    };
    await expect(
      applySyncChanges(queryClient, [{ entityType: "task" }])
    ).rejects.toThrow("cache write failed");
  });

  it("can replay the same batch after a failed application", async () => {
    let attempts = 0;
    const queryClient = {
      invalidateQueries: async () => {
        attempts += 1;
        if (attempts === 1) throw new Error("temporary outage");
      },
    };
    await expect(
      applySyncChanges(queryClient, [{ entityType: "profile" }])
    ).rejects.toThrow("temporary outage");
    await applySyncChanges(queryClient, [{ entityType: "profile" }]);
    expect(attempts).toBe(2);
  });
});
