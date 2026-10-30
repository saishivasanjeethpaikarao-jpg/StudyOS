import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Assignment,
  AssignmentFilterInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { assignmentKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useAccountSync } from "@/hooks/useAccountSync";

export { assignmentKeys };

export function useAssignments(filters: AssignmentFilterInput = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: assignmentKeys.list(filters),
    queryFn: () => getApi().assignments.list(filters),
    enabled: isAuthenticated,
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { queueMutation } = useAccountSync();
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) => {
      if (typeof navigator !== "undefined" && !navigator.onLine && user?.id) {
        const now = new Date();
        const id = crypto.randomUUID();
        queueMutation({
          clientMutationId: crypto.randomUUID(),
          entityType: "assignment",
          operation: "create",
          entityId: id,
          payload: { ...input },
        });
        return Promise.resolve({
          id,
          userId: user.id,
          subjectId: input.subjectId ?? null,
          title: input.title,
          description: input.description ?? null,
          dueAt: new Date(input.dueAt),
          status: input.status ?? "not_started",
          priority: input.priority ?? "P2",
          estimatedMinutes: input.estimatedMinutes ?? null,
          completedMinutes: input.completedMinutes ?? 0,
          revision: 1,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        } satisfies Assignment);
      }
      return getApi().assignments.create(input);
    },
    onSuccess: (assignment) => {
      queryClient.setQueryData(
        assignmentKeys.detail(assignment.id),
        assignment
      );
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      toast({
        title: "Assignment added",
        description: "It now appears in your academic workspace.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Couldn't add assignment",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  const { queueMutation } = useAccountSync();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateAssignmentInput;
    }) => {
      const current = queryClient.getQueryData<Assignment>(
        assignmentKeys.detail(id)
      );
      if (typeof navigator !== "undefined" && !navigator.onLine && current) {
        queueMutation({
          clientMutationId: crypto.randomUUID(),
          entityType: "assignment",
          operation: "update",
          entityId: id,
          expectedRevision: current.revision,
          payload: { ...input },
        });
        return Promise.resolve({
          ...current,
          ...input,
          subjectId:
            input.subjectId === undefined ? current.subjectId : input.subjectId,
          description:
            input.description === undefined
              ? current.description
              : input.description,
          dueAt: input.dueAt ? new Date(input.dueAt) : current.dueAt,
          revision: current.revision + 1,
          updatedAt: new Date(),
        } satisfies Assignment);
      }
      return getApi().assignments.update(id, input);
    },
    onSuccess: (assignment) => {
      queryClient.setQueryData(
        assignmentKeys.detail(assignment.id),
        assignment
      );
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      toast({ title: "Assignment updated" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Couldn't update assignment",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => getApi().assignments.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      toast({ title: "Assignment deleted" });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Couldn't delete assignment",
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });
}
