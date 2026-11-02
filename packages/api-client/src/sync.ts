import type { OpenSunsamaClient } from "./client.js";

export interface SyncEntry {
  entityType: string;
  entityId: string;
  data: unknown;
}
export interface SyncChange {
  sequence: number;
  entityType: string;
  entityId: string;
  revision: number | null;
  operation: "upsert" | "delete";
  payload: Record<string, unknown> | null;
  changedAt: string;
}
export interface BootstrapPage {
  snapshotId: string;
  snapshotSequence: string;
  entries: SyncEntry[];
  complete: boolean;
  nextPageToken: string | null;
  nextCursor: string | null;
  expiresAt: string;
}
export interface ChangesPage {
  changes: SyncChange[];
  nextCursor: string;
  hasMore: boolean;
  currentSequence: string;
}
export interface SyncMutationInput {
  clientMutationId: string;
  entityType:
    | "subject"
    | "assignment"
    | "study-note"
    | "study-session"
    | "resource"
    | "study-reminder"
    | "focus-session"
    | "quiz"
    | "task"
    | "subtask";
  operation: "create" | "update" | "delete";
  entityId: string;
  expectedRevision?: number;
  payload?: Record<string, unknown>;
}
export interface SyncMutationResult {
  entityType: SyncMutationInput["entityType"];
  entityId: string;
  operation: SyncMutationInput["operation"];
  data: Record<string, unknown>;
  replayed: boolean;
}
interface Response<T> {
  success: boolean;
  data: T;
}

export function createSyncApi(client: OpenSunsamaClient) {
  return {
    async bootstrap(
      input: { deviceId?: string; pageToken?: string; pageSize?: number } = {}
    ): Promise<BootstrapPage> {
      return (
        await client.post<Response<BootstrapPage>>("sync/bootstrap", input)
      ).data;
    },
    async changes(input: {
      cursor: string;
      limit?: number;
      deviceId?: string;
    }): Promise<ChangesPage> {
      return (
        await client.get<Response<ChangesPage>>("sync/changes", {
          searchParams: input,
        })
      ).data;
    },
    async mutate(input: SyncMutationInput): Promise<SyncMutationResult> {
      return (
        await client.post<Response<SyncMutationResult>>("sync/mutations", input)
      ).data;
    },
  };
}
