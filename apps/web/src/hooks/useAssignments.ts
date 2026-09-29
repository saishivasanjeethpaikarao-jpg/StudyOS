import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AssignmentFilterInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
} from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { assignmentKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
  return useMutation({
    mutationFn: (input: CreateAssignmentInput) =>
      getApi().assignments.create(input),
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
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAssignmentInput }) =>
      getApi().assignments.update(id, input),
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
