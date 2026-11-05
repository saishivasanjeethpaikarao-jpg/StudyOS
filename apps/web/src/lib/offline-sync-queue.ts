import type { SyncMutationInput } from "@open-sunsama/api-client";

const STORAGE_KEY = "studyos_offline_mutations_v1";

export interface QueuedSyncMutation {
  id: string;
  userId: string;
  input: SyncMutationInput;
  queuedAt: string;
  attempts: number;
  lastError: string | null;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function read(): QueuedSyncMutation[] {
  const value = storage();
  if (!value) return [];
  try {
    const parsed = JSON.parse(value.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is QueuedSyncMutation => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<QueuedSyncMutation>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.userId === "string" &&
        !!candidate.input &&
        typeof candidate.queuedAt === "string" &&
        typeof candidate.attempts === "number"
      );
    });
  } catch {
    return [];
  }
}

function write(items: QueuedSyncMutation[]): boolean {
  const value = storage();
  if (!value) return false;
  try {
    value.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

export function listQueuedSyncMutations(userId: string): QueuedSyncMutation[] {
  return read().filter((item) => item.userId === userId);
}

export function enqueueSyncMutation(
  userId: string,
  input: SyncMutationInput
): QueuedSyncMutation | null {
  const item: QueuedSyncMutation = {
    id: input.clientMutationId,
    userId,
    input,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };
  return write([
    ...read().filter(
      (existing) => existing.id !== item.id || existing.userId !== userId
    ),
    item,
  ])
    ? item
    : null;
}

export function updateQueuedSyncMutation(
  userId: string,
  id: string,
  patch: Partial<Pick<QueuedSyncMutation, "attempts" | "lastError">>
): void {
  write(
    read().map((item) =>
      item.userId === userId && item.id === id ? { ...item, ...patch } : item
    )
  );
}

export function removeQueuedSyncMutation(userId: string, id: string): void {
  write(read().filter((item) => item.userId !== userId || item.id !== id));
}

export function clearQueuedSyncMutations(): void {
  const value = storage();
  if (!value) return;
  try {
    value.removeItem(STORAGE_KEY);
  } catch {
    /* ignore storage failures */
  }
}

export function clearConflictedSyncMutations(userId: string): void {
  write(
    read().filter((item) => {
      if (item.userId !== userId) return true;
      const isConflict =
        item.attempts >= 3 ||
        (item.lastError ? item.lastError.toLowerCase().includes("conflict") : false);
      return !isConflict;
    })
  );
}

export function hasConflictedSyncMutations(userId: string): boolean {
  return read().some((item) => {
    if (item.userId !== userId) return false;
    return (
      item.attempts >= 3 ||
      (item.lastError ? item.lastError.toLowerCase().includes("conflict") : false)
    );
  });
}
