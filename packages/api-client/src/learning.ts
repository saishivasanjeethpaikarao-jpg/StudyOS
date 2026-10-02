import type {
  AcademicFocusSession,
  LearningResource,
  LearningTarget,
  QuizAttemptResult,
  QuizAttemptStarted,
  QuizAttemptSummary,
  QuizAuthor,
  QuizInput,
  QuizPlay,
  QuizSummary,
  ResourceLink,
  StudyNote,
  StudyReminder,
} from "@open-sunsama/types";
import type { OpenSunsamaClient } from "./client.js";

type Result<T> = { success: true; data: T };
const revision = (value: number) => ({ headers: { "If-Match": `"${value}"` } });

export function createLearningApi(client: OpenSunsamaClient) {
  return {
    resources: {
      list: async (target: LearningTarget = {}) =>
        (
          await client.get<Result<LearningResource[]>>("resources", {
            searchParams: target as Record<string, string | undefined>,
          })
        ).data,
      get: async (id: string) =>
        (await client.get<Result<LearningResource>>(`resources/${id}`)).data,
      create: async (input: {
        type: "youtube" | "web";
        title: string;
        url: string;
        link?: LearningTarget;
      }) =>
        (await client.post<Result<LearningResource>>("resources", input)).data,
      upload: async (file: File, link?: LearningTarget) => {
        const body = new FormData();
        body.set("file", file);
        if (link) body.set("link", JSON.stringify(link));
        return (
          await client
            .getClient()
            .post("resources/upload", { body })
            .json<Result<LearningResource>>()
        ).data;
      },
      download: async (id: string) =>
        client.getClient().get(`resources/${id}/file`).blob(),
      update: async (
        id: string,
        input: { title?: string; completed?: boolean },
        rev: number
      ) =>
        (
          await client.patch<Result<LearningResource>>(
            `resources/${id}`,
            input,
            revision(rev)
          )
        ).data,
      delete: async (id: string, rev: number) => {
        await client.delete(`resources/${id}`, revision(rev));
      },
      links: async (id: string) =>
        (await client.get<Result<ResourceLink[]>>(`resources/${id}/links`))
          .data,
      link: async (id: string, target: LearningTarget) =>
        (
          await client.post<Result<ResourceLink>>(
            `resources/${id}/links`,
            target
          )
        ).data,
      unlink: async (id: string, linkId: string) => {
        await client.delete(`resources/${id}/links/${linkId}`);
      },
    },
    notes: {
      list: async (target: LearningTarget = {}) =>
        (
          await client.get<Result<StudyNote[]>>("study-notes", {
            searchParams: target as Record<string, string | undefined>,
          })
        ).data,
      get: async (id: string) =>
        (await client.get<Result<StudyNote>>(`study-notes/${id}`)).data,
      create: async (
        input: Pick<StudyNote, "title" | "body"> & LearningTarget
      ) => (await client.post<Result<StudyNote>>("study-notes", input)).data,
      update: async (
        id: string,
        input: Partial<Pick<StudyNote, "title" | "body"> & LearningTarget>,
        rev: number
      ) =>
        (
          await client.patch<Result<StudyNote>>(
            `study-notes/${id}`,
            input,
            revision(rev)
          )
        ).data,
      delete: async (id: string, rev: number) => {
        await client.delete(`study-notes/${id}`, revision(rev));
      },
    },
    reminders: {
      list: async (state?: StudyReminder["state"]) =>
        (
          await client.get<Result<StudyReminder[]>>("study-reminders", {
            searchParams: { state },
          })
        ).data,
      create: async (
        input: {
          title: string;
          remindAt: string;
          quizId?: string | null;
        } & LearningTarget
      ) =>
        (await client.post<Result<StudyReminder>>("study-reminders", input))
          .data,
      update: async (
        id: string,
        input: Partial<
          {
            title: string;
            remindAt: string;
            quizId: string | null;
          } & LearningTarget
        >,
        rev: number
      ) =>
        (
          await client.patch<Result<StudyReminder>>(
            `study-reminders/${id}`,
            input,
            revision(rev)
          )
        ).data,
      dismiss: async (id: string, rev: number) =>
        (
          await client.post<Result<StudyReminder>>(
            `study-reminders/${id}/dismiss`,
            {},
            revision(rev)
          )
        ).data,
      cancel: async (id: string, rev: number) =>
        (
          await client.post<Result<StudyReminder>>(
            `study-reminders/${id}/cancel`,
            {},
            revision(rev)
          )
        ).data,
    },
    focus: {
      list: async () =>
        (await client.get<Result<AcademicFocusSession[]>>("focus-sessions"))
          .data,
      start: async (target: LearningTarget) =>
        (
          await client.post<Result<AcademicFocusSession>>(
            "focus-sessions",
            target
          )
        ).data,
      finish: async (id: string, rev: number) =>
        (
          await client.post<Result<AcademicFocusSession>>(
            `focus-sessions/${id}/finish`,
            {},
            revision(rev)
          )
        ).data,
      cancel: async (id: string, rev: number) =>
        (
          await client.post<Result<AcademicFocusSession>>(
            `focus-sessions/${id}/cancel`,
            {},
            revision(rev)
          )
        ).data,
    },
    quizzes: {
      list: async (
        target: {
          subjectId?: string;
          assignmentId?: string;
          resourceId?: string;
        } = {}
      ) =>
        (
          await client.get<Result<QuizSummary[]>>("quizzes", {
            searchParams: target,
          })
        ).data,
      get: async (id: string) =>
        (await client.get<Result<QuizAuthor>>(`quizzes/${id}`)).data,
      create: async (input: QuizInput) =>
        (await client.post<Result<QuizAuthor>>("quizzes", input)).data,
      update: async (id: string, input: QuizInput, rev: number) =>
        (
          await client.put<Result<QuizAuthor>>(
            `quizzes/${id}`,
            input,
            revision(rev)
          )
        ).data,
      delete: async (id: string, rev: number) => {
        await client.delete(`quizzes/${id}`, revision(rev));
      },
      play: async (id: string) =>
        (await client.get<Result<QuizPlay>>(`quizzes/${id}/play`)).data,
      start: async (id: string) =>
        (
          await client.post<Result<QuizAttemptStarted>>(
            `quizzes/${id}/attempts`,
            {}
          )
        ).data,
      attempts: async (id: string) =>
        (
          await client.get<Result<QuizAttemptSummary[]>>(
            `quizzes/${id}/attempts`
          )
        ).data,
      attempt: async (id: string) =>
        (
          await client.get<Result<QuizAttemptStarted | QuizAttemptResult>>(
            `quiz-attempts/${id}`
          )
        ).data,
      submit: async (
        id: string,
        answers: { questionId: string; selectedOptionIds: string[] }[]
      ) =>
        (
          await client.post<Result<QuizAttemptResult>>(
            `quiz-attempts/${id}/submit`,
            { answers }
          )
        ).data,
    },
  };
}
