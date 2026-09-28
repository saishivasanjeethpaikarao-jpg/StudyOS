import type {
  Assignment,
  AssignmentFilterInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@open-sunsama/types";
import type { OpenSunsamaClient, RequestOptions } from "./client.js";

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
  };
}
