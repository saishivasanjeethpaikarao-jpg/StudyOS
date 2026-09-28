import type {
  CreateSubjectInput,
  Subject,
  SubjectFilterInput,
  UpdateSubjectInput,
} from "@open-sunsama/types";
import type { OpenSunsamaClient, RequestOptions } from "./client.js";

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
}

export interface SubjectsApi {
  list(
    filters?: SubjectFilterInput,
    options?: RequestOptions
  ): Promise<Subject[]>;
  get(id: string, options?: RequestOptions): Promise<Subject>;
  create(input: CreateSubjectInput, options?: RequestOptions): Promise<Subject>;
  update(
    id: string,
    input: UpdateSubjectInput,
    options?: RequestOptions
  ): Promise<Subject>;
  delete(id: string, options?: RequestOptions): Promise<void>;
}

export function createSubjectsApi(client: OpenSunsamaClient): SubjectsApi {
  return {
    async list(filters, options) {
      const response = await client.get<ApiResponseWrapper<Subject[]>>(
        "subjects",
        {
          ...options,
          searchParams: {
            ...options?.searchParams,
            archived:
              filters?.archived !== undefined
                ? String(filters.archived)
                : undefined,
          },
        }
      );
      return response.data;
    },

    async get(id, options) {
      const response = await client.get<ApiResponseWrapper<Subject>>(
        `subjects/${id}`,
        options
      );
      return response.data;
    },

    async create(input, options) {
      const response = await client.post<ApiResponseWrapper<Subject>>(
        "subjects",
        input,
        options
      );
      return response.data;
    },

    async update(id, input, options) {
      const response = await client.patch<ApiResponseWrapper<Subject>>(
        `subjects/${id}`,
        input,
        options
      );
      return response.data;
    },

    async delete(id, options) {
      await client.delete(`subjects/${id}`, options);
    },
  };
}
