import type {
  AssignmentStudyProgress,
  CompleteStudySessionInput,
  CreateStudySessionInput,
  RescheduleStudySessionInput,
  StudySession,
  StudySessionFilterInput,
  UpdateStudySessionInput,
} from "@open-sunsama/types";
import type { OpenSunsamaClient, RequestOptions } from "./client.js";

interface ApiResponse<T> {
  success: boolean;
  data: T;
}
export type RawStudySession = Omit<
  StudySession,
  "startAt" | "endAt" | "completedAt" | "createdAt" | "updatedAt" | "deletedAt"
> & {
  startAt: string;
  endAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export function hydrateStudySession(raw: RawStudySession): StudySession {
  return {
    ...raw,
    startAt: new Date(raw.startAt),
    endAt: new Date(raw.endAt),
    completedAt: raw.completedAt ? new Date(raw.completedAt) : null,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    deletedAt: raw.deletedAt ? new Date(raw.deletedAt) : null,
  };
}

async function sessionResponse(
  response: Promise<ApiResponse<RawStudySession>>
): Promise<StudySession> {
  return hydrateStudySession((await response).data);
}
export interface StudySessionsListResponse {
  data: StudySession[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Mutation methods require the latest `revision` returned by the API. */
export interface StudySessionsApi {
  list(
    filters?: StudySessionFilterInput,
    options?: RequestOptions
  ): Promise<StudySessionsListResponse>;
  get(id: string, options?: RequestOptions): Promise<StudySession>;
  create(
    input: CreateStudySessionInput,
    options?: RequestOptions
  ): Promise<StudySession>;
  update(
    id: string,
    input: UpdateStudySessionInput,
    revision: number,
    options?: RequestOptions
  ): Promise<StudySession>;
  reschedule(
    id: string,
    input: RescheduleStudySessionInput,
    revision: number,
    options?: RequestOptions
  ): Promise<StudySession>;
  complete(
    id: string,
    input: CompleteStudySessionInput,
    revision: number,
    options?: RequestOptions
  ): Promise<StudySession>;
  skip(
    id: string,
    revision: number,
    options?: RequestOptions
  ): Promise<StudySession>;
  cancel(
    id: string,
    revision: number,
    options?: RequestOptions
  ): Promise<StudySession>;
  delete(id: string, revision: number, options?: RequestOptions): Promise<void>;
  assignmentProgress(
    assignmentId: string,
    options?: RequestOptions
  ): Promise<AssignmentStudyProgress>;
}

function withRevision(
  options: RequestOptions | undefined,
  revision: number
): RequestOptions {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error("Expected revision must be a positive integer");
  }
  return {
    ...options,
    headers: { ...options?.headers, "If-Match": `"${revision}"` },
  };
}

export function createStudySessionsApi(
  client: OpenSunsamaClient
): StudySessionsApi {
  return {
    async list(filters, options) {
      const response = await client.get<
        ApiResponse<RawStudySession[]> & {
          meta: StudySessionsListResponse["meta"];
        }
      >("study-sessions", {
        ...options,
        searchParams: { ...options?.searchParams, ...filters },
      });
      return {
        data: response.data.map(hydrateStudySession),
        meta: response.meta,
      };
    },
    async get(id, options) {
      return sessionResponse(
        client.get<ApiResponse<RawStudySession>>(
          `study-sessions/${id}`,
          options
        )
      );
    },
    async create(input, options) {
      return sessionResponse(
        client.post<ApiResponse<RawStudySession>>(
          "study-sessions",
          input,
          options
        )
      );
    },
    async update(id, input, revision, options) {
      return sessionResponse(
        client.patch<ApiResponse<RawStudySession>>(
          `study-sessions/${id}`,
          input,
          withRevision(options, revision)
        )
      );
    },
    async reschedule(id, input, revision, options) {
      return sessionResponse(
        client.post<ApiResponse<RawStudySession>>(
          `study-sessions/${id}/reschedule`,
          input,
          withRevision(options, revision)
        )
      );
    },
    async complete(id, input, revision, options) {
      return sessionResponse(
        client.post<ApiResponse<RawStudySession>>(
          `study-sessions/${id}/complete`,
          input,
          withRevision(options, revision)
        )
      );
    },
    async skip(id, revision, options) {
      return sessionResponse(
        client.post<ApiResponse<RawStudySession>>(
          `study-sessions/${id}/skip`,
          {},
          withRevision(options, revision)
        )
      );
    },
    async cancel(id, revision, options) {
      return sessionResponse(
        client.post<ApiResponse<RawStudySession>>(
          `study-sessions/${id}/cancel`,
          {},
          withRevision(options, revision)
        )
      );
    },
    async delete(id, revision, options) {
      await client.delete(
        `study-sessions/${id}`,
        withRevision(options, revision)
      );
    },
    async assignmentProgress(assignmentId, options) {
      return (
        await client.get<ApiResponse<AssignmentStudyProgress>>(
          `assignments/${assignmentId}/study-progress`,
          options
        )
      ).data;
    },
  };
}
