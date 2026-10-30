import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSubjectInput,
  Subject,
  SubjectFilterInput,
  UpdateSubjectInput,
} from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { subjectKeys, assignmentKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useAccountSync } from "@/hooks/useAccountSync";

export { subjectKeys };

export function useSubjects(filters: SubjectFilterInput = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: subjectKeys.list(filters),
    queryFn: () => getApi().subjects.list(filters),
    enabled: isAuthenticated,
  });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { queueMutation } = useAccountSync();
  return useMutation({
    mutationFn: (input: CreateSubjectInput) => {
      if (typeof navigator !== "undefined" && !navigator.onLine && user?.id) {
        const now = new Date();
        const id = crypto.randomUUID();
        queueMutation({
          clientMutationId: crypto.randomUUID(),
          entityType: "subject",
          operation: "create",
          entityId: id,
          payload: { ...input },
        });
        return Promise.resolve({
          id,
          userId: user.id,
          name: input.name,
          description: input.description ?? null,
          icon: input.icon ?? null,
          color: input.color ?? null,
          sortOrder: input.sortOrder ?? 0,
          archivedAt: null,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        } satisfies Subject);
      }
      return getApi().subjects.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.lists() });
      toast({ title: "Subject added", description: "Your subject is ready." });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Couldn't add subject",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}

export function useUpdateSubject() {
  const queryClient = useQueryClient();
  const { queueMutation } = useAccountSync();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubjectInput }) => {
      const current = queryClient.getQueryData<Subject>(subjectKeys.detail(id));
      if (typeof navigator !== "undefined" && !navigator.onLine && current) {
        queueMutation({
          clientMutationId: crypto.randomUUID(),
          entityType: "subject",
          operation: "update",
          entityId: id,
          expectedRevision: current.revision,
          payload: { ...input },
        });
        return Promise.resolve({
          ...current,
          ...input,
          archivedAt:
            input.archivedAt === undefined
              ? current.archivedAt
              : input.archivedAt
                ? new Date(input.archivedAt)
                : null,
          revision: current.revision + 1,
          updatedAt: new Date(),
        } satisfies Subject);
      }
      return getApi().subjects.update(id, input);
    },
    onSuccess: (subject) => {
      queryClient.setQueryData(subjectKeys.detail(subject.id), subject);
      queryClient.invalidateQueries({ queryKey: subjectKeys.lists() });
      toast({ title: "Subject updated" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Couldn't update subject",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getApi().subjects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectKeys.all });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      toast({
        title: "Subject deleted",
        description: "Its assignments are still available without a subject.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Couldn't delete subject",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}
