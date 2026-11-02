import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Assignment, CreateAssignmentInput, CreateSubjectInput, StudySession, Subject,
  UpdateAssignmentInput, UpdateSubjectInput,
} from '@open-sunsama/types';
import { getApi } from '@/lib/api';
import { useAccountSync } from '@/lib/sync';
import { newClientId } from '@/lib/ids';

export const subjectKeys = { all: ['subjects'] as const, list: () => ['subjects', 'list'] as const };
export const assignmentKeys = {
  all: ['assignments'] as const,
  list: (subjectId?: string) => ['assignments', 'list', subjectId ?? 'all'] as const,
  detail: (id: string) => ['assignments', 'detail', id] as const,
};
export const sessionKeys = {
  all: ['study-sessions'] as const,
  list: (filters?: Record<string, string>) => ['study-sessions', 'list', filters ?? {}] as const,
  assignment: (id: string) => ['study-sessions', 'assignment', id] as const,
  progress: (id: string) => ['study-sessions', 'progress', id] as const,
};

export function useSubjects() {
  const sync = useAccountSync();
  return useQuery({ queryKey: subjectKeys.list(), queryFn: async () => {
    try { return await getApi().subjects.list({ archived: false }); }
    catch { const cached = await sync.getCached<Subject>('subjects'); return (Array.isArray(cached) ? cached : []).map((subject) => ({ ...subject, createdAt: new Date(subject.createdAt), updatedAt: new Date(subject.updatedAt) })); }
  } });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();
  return useMutation({
    mutationFn: async (input: CreateSubjectInput) => {
      const id = newClientId();
      await sync.enqueueMutation({ entityType: 'subject', operation: 'create', entityId: id, payload: input as unknown as Record<string, unknown> });
      return { id, ...input, description: input.description ?? null, icon: input.icon ?? null, color: input.color ?? null, sortOrder: input.sortOrder ?? 0 } as Subject;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: subjectKeys.all }); },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSubjectInput }) => {
      const subject = queryClient.getQueryData<Subject[]>(subjectKeys.list())?.find((item) => item.id === id);
      await sync.enqueueMutation({ entityType: 'subject', operation: 'update', entityId: id, expectedRevision: subject?.revision, payload: input as Record<string, unknown> });
      return { ...subject, ...input, revision: (subject?.revision ?? 0) + 1, updatedAt: new Date() } as Subject;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: subjectKeys.all }); },
  });
}

export function useAssignments(subjectId?: string) {
  const sync = useAccountSync();
  return useQuery({
    queryKey: assignmentKeys.list(subjectId),
    queryFn: async () => {
      try { return (await getApi().assignments.list(subjectId ? { subjectId } : undefined)).data; }
      catch { const cached = await sync.getCached<Assignment>('assignments'); return (Array.isArray(cached) ? cached : []).map((assignment) => ({ ...assignment, dueAt: new Date(assignment.dueAt), createdAt: new Date(assignment.createdAt), updatedAt: new Date(assignment.updatedAt) })).filter((assignment) => !subjectId || assignment.subjectId === subjectId); }
    },
  });
}

export function useAssignment(id: string) {
  return useQuery({ queryKey: assignmentKeys.detail(id), queryFn: () => getApi().assignments.get(id), enabled: !!id });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();
  return useMutation({
    mutationFn: async (input: CreateAssignmentInput) => {
      const id = newClientId();
      await sync.enqueueMutation({ entityType: 'assignment', operation: 'create', entityId: id, payload: input as unknown as Record<string, unknown> });
      return { id, ...input, subjectId: input.subjectId ?? null, description: input.description ?? null, status: input.status ?? 'not_started', priority: input.priority ?? 'P2', estimatedMinutes: input.estimatedMinutes ?? null, completedMinutes: input.completedMinutes ?? 0, revision: 1, deletedAt: null, dueAt: new Date(input.dueAt), createdAt: new Date(), updatedAt: new Date() } as Assignment;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: assignmentKeys.all }); },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateAssignmentInput }) => {
      const assignment = queryClient.getQueryData<Assignment>(assignmentKeys.detail(id));
      await sync.enqueueMutation({ entityType: 'assignment', operation: 'update', entityId: id, expectedRevision: assignment?.revision, payload: input as Record<string, unknown> });
      return { ...assignment, ...input, dueAt: input.dueAt ? new Date(input.dueAt) : assignment?.dueAt, revision: (assignment?.revision ?? 0) + 1, updatedAt: new Date() } as Assignment;
    },
    onSuccess: (assignment) => {
      queryClient.setQueryData(assignmentKeys.detail(assignment.id), assignment);
      void queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
}

export function useStudySessions(assignmentId?: string) {
  const sync = useAccountSync();
  return useQuery({
    queryKey: assignmentId ? sessionKeys.assignment(assignmentId) : sessionKeys.list(),
    queryFn: async () => {
      try { return (await getApi().studySessions.list(assignmentId ? { assignmentId } : undefined)).data; }
      catch { const cached = await sync.getCached<Record<string, unknown>>('study-sessions'); const values = Array.isArray(cached) ? cached : []; return values.map((session) => ({ ...session, startAt: new Date(String(session.startAt)), endAt: new Date(String(session.endAt)), createdAt: new Date(String(session.createdAt)), updatedAt: new Date(String(session.updatedAt)) })) as unknown as StudySession[]; }
    },
  });
}

export function useStudyProgress(assignmentId: string) {
  return useQuery({ queryKey: sessionKeys.progress(assignmentId), queryFn: () => getApi().studySessions.assignmentProgress(assignmentId), enabled: !!assignmentId });
}

export function useCompleteStudySession() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();
  return useMutation({
    mutationFn: async ({ session, actualMinutes }: { session: StudySession; actualMinutes?: number }) => {
      try {
        return await getApi().studySessions.complete(session.id, { actualMinutes }, session.revision);
      } catch {
        await sync.enqueueMutation({
          entityType: 'study-session',
          operation: 'update',
          entityId: session.id,
          expectedRevision: session.revision,
          payload: { action: 'complete', actualMinutes: actualMinutes ?? session.plannedMinutes },
        });
        return {
          ...session,
          status: 'completed',
          actualMinutes: actualMinutes ?? session.plannedMinutes,
          completedAt: new Date(),
          revision: session.revision + 1,
          updatedAt: new Date(),
        } as StudySession;
      }
    },
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.all });
      void queryClient.invalidateQueries({ queryKey: sessionKeys.progress(session.assignmentId) });
    },
  });
}

export function useStudyPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, input }: { assignmentId: string; input: Parameters<ReturnType<typeof getApi>['assignments']['previewStudyPlan']>[1] }) => {
      const api = getApi();
      const preview = await api.assignments.previewStudyPlan(assignmentId, input);
      return { assignmentId, input, preview };
    },
    onSuccess: ({ assignmentId }) => { void queryClient.invalidateQueries({ queryKey: sessionKeys.assignment(assignmentId) }); },
  });
}

export function useLearning() {
  const api = getApi();
  return {
    resources: api.resources,
    notes: api.notes,
    reminders: api.reminders,
    focus: api.focus,
    quizzes: api.quizzes,
  };
}
