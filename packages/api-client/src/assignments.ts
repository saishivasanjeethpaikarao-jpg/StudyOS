import type {
  Assignment,
  AssignmentFilterInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  StudyPlanInput,
  StudyPlanPreview,
  ConfirmStudyPlanInput,
  ConfirmStudyPlanResult,
} from "@open-sunsama/types";
import type { OpenSunsamaClient, RequestOptions } from "./client.js";
import { hydrateStudySession, type RawStudySession } from "./study-sessions.js";

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
}

export interface AssignmentsListResponse {
  data: Assignment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssignmentsApi {
  list(
    filters?: AssignmentFilterInput,
    options?: RequestOptions
  ): Promise<AssignmentsListResponse>;
  get(id: string, options?: RequestOptions): Promise<Assignment>;
  create(
    input: CreateAssignmentInput,
    options?: RequestOptions
  ): Promise<Assignment>;
  update(
    id: string,
    input: UpdateAssignmentInput,
    options?: RequestOptions
  ): Promise<Assignment>;
  delete(id: string, options?: RequestOptions): Promise<void>;
  previewStudyPlan(
    id: string,
    input: StudyPlanInput,
    options?: RequestOptions
  ): Promise<StudyPlanPreview>;
  confirmStudyPlan(
    id: string,
    input: ConfirmStudyPlanInput,
    options?: RequestOptions
  ): Promise<ConfirmStudyPlanResult>;
}

export function createAssignmentsApi(
  client: OpenSunsamaClient
): AssignmentsApi {
  return {
    async list(filters, options) {
      const response = await client.get<{
        success: boolean;
        data: Assignment[];
        meta: AssignmentsListResponse["meta"];
      }>("assignments", {
        ...options,
        searchParams: {
          ...options?.searchParams,
          subjectId: filters?.subjectId,
          status: filters?.status,
          dueFrom: filters?.dueFrom,
          dueTo: filters?.dueTo,
          page: filters?.page,
          limit: filters?.limit,
        },
      });
      return { data: response.data, meta: response.meta };
    },

    async get(id, options) {
      const response = await client.get<ApiResponseWrapper<Assignment>>(
        `assignments/${id}`,
        options
      );
      return response.data;
    },

    async create(input, options) {
      const response = await client.post<ApiResponseWrapper<Assignment>>(
        "assignments",
        input,
        options
      );
      return response.data;
    },

    async update(id, input, options) {
      const response = await client.patch<ApiResponseWrapper<Assignment>>(
        `assignments/${id}`,
        input,
        options
      );
      return response.data;
    },

    async delete(id, options) {
      await client.delete(`assignments/${id}`, options);
    },

    async previewStudyPlan(id, input, options) {
      return (
        await client.post<ApiResponseWrapper<StudyPlanPreview>>(
          `assignments/${id}/study-plan/preview`,
          input,
          options
        )
      ).data;
    },

    async confirmStudyPlan(id, input, options) {
      const result = (
        await client.post<
          ApiResponseWrapper<
            Omit<ConfirmStudyPlanResult, "sessions"> & {
              sessions: RawStudySession[];
            }
          >
        >(`assignments/${id}/study-plan/confirm`, input, options)
      ).data;
      return {
        ...result,
        sessions: result.sessions.map(hydrateStudySession),
      };
    },
  };
}
