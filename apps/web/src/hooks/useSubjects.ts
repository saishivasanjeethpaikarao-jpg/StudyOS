import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateSubjectInput,
  SubjectFilterInput,
  UpdateSubjectInput,
} from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { subjectKeys, assignmentKeys } from "@/lib/query-keys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

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
  return useMutation({
    mutationFn: (input: CreateSubjectInput) => getApi().subjects.create(input),
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
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSubjectInput }) =>
      getApi().subjects.update(id, input),
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
