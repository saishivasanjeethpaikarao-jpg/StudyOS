import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConfirmStudyPlanInput,
  CompleteStudySessionInput,
  RescheduleStudySessionInput,
  StudyPlanInput,
  StudySession,
  StudySessionFilterInput,
} from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import {
  assignmentKeys,
  studySessionKeys,
  timeBlockKeys,
} from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";

export function useStudySessions(
  filters: StudySessionFilterInput = {},
  enabled = true
) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: studySessionKeys.list(filters),
    queryFn: () => getApi().studySessions.list(filters),
    enabled: enabled && isAuthenticated,
  });
}

export function useStudySession(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: studySessionKeys.detail(id ?? ""),
    queryFn: () => getApi().studySessions.get(id!),
    enabled: isAuthenticated && !!id,
  });
}

export function useAssignmentStudyProgress(
  assignmentId: string,
  enabled = true
) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: studySessionKeys.progress(assignmentId),
    queryFn: () => getApi().studySessions.assignmentProgress(assignmentId),
    enabled: enabled && isAuthenticated,
  });
}

function invalidateStudyWork(
  queryClient: ReturnType<typeof useQueryClient>,
  assignmentId: string
) {
  void queryClient.invalidateQueries({ queryKey: studySessionKeys.all });
  void queryClient.invalidateQueries({ queryKey: timeBlockKeys.lists() });
  void queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
  void queryClient.invalidateQueries({
    queryKey: studySessionKeys.progress(assignmentId),
  });
}

export function usePreviewStudyPlan() {
  return useMutation({
    mutationFn: ({
      assignmentId,
      input,
    }: {
      assignmentId: string;
      input: StudyPlanInput;
    }) => getApi().assignments.previewStudyPlan(assignmentId, input),
  });
}

export function useConfirmStudyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignmentId,
      input,
    }: {
      assignmentId: string;
      input: ConfirmStudyPlanInput;
    }) => getApi().assignments.confirmStudyPlan(assignmentId, input),
    onSuccess: (_result, variables) =>
      invalidateStudyWork(queryClient, variables.assignmentId),
  });
}

export type StudySessionAction =
  "complete" | "skip" | "cancel" | "delete" | "reschedule";

export function useStudySessionAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      session,
      action,
      actualMinutes,
      schedule,
    }: {
      session: StudySession;
      action: StudySessionAction;
      actualMinutes?: number;
      schedule?: RescheduleStudySessionInput;
    }) => {
      const api = getApi().studySessions;
      switch (action) {
        case "complete":
          return api.complete(
            session.id,
            { actualMinutes } satisfies CompleteStudySessionInput,
            session.revision
          );
        case "skip":
          return api.skip(session.id, session.revision);
        case "cancel":
          return api.cancel(session.id, session.revision);
        case "delete":
          await api.delete(session.id, session.revision);
          return null;
        case "reschedule":
          if (!schedule) throw new Error("Choose a new time for this session.");
          return api.reschedule(session.id, schedule, session.revision);
      }
    },
    onSuccess: (_result, variables) =>
      invalidateStudyWork(queryClient, variables.session.assignmentId),
  });
}
