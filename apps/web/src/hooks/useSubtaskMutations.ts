import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  Subtask,
  CreateSubtaskInput,
  UpdateSubtaskInput,
} from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { subtaskKeys } from "@/lib/query-keys";
import { useAccountSync } from "@/hooks/useAccountSync";

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function mutationId(): string {
  return crypto.randomUUID();
}

/**
 * Create a subtask. Optimistically inserts a placeholder so the new row
 * appears the instant the user hits Enter.
 */
export function useCreateSubtask() {
  const queryClient = useQueryClient();
  const { queueMutation } = useAccountSync();
  const offlineIds = useMemo(() => new WeakMap<object, string>(), []);

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: Omit<CreateSubtaskInput, "taskId">;
    }): Promise<Subtask> => {
      if (isBrowserOffline()) {
        const id = offlineIds.get(data as object) ?? crypto.randomUUID();
        offlineIds.set(data as object, id);
        const nowIso = new Date().toISOString();
        const current = queryClient.getQueryData<Subtask[]>(
          subtaskKeys.list(taskId)
        );
        const optimistic: Subtask = {
          id,
          taskId,
          title: data.title,
          completed: false,
          position: data.position ?? current?.length ?? 0,
          revision: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        queueMutation({
          clientMutationId: mutationId(),
          entityType: "subtask",
          operation: "create",
          entityId: id,
          payload: { taskId, ...data },
        });
        return optimistic;
      }
      const api = getApi();
      return await api.subtasks.create(taskId, data);
    },
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.list(taskId) });
      const previous = queryClient.getQueryData<Subtask[]>(
        subtaskKeys.list(taskId)
      );

      const tempId = offlineIds.get(data as object) ?? crypto.randomUUID();
      offlineIds.set(data as object, tempId);
      const nowIso = new Date().toISOString();
      const optimistic: Subtask = {
        id: tempId,
        taskId,
        title: data.title,
        completed: false,
        position: previous?.length ?? 0,
        revision: 1,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      queryClient.setQueryData<Subtask[]>(subtaskKeys.list(taskId), (old) => [
        ...(old ?? []),
        optimistic,
      ]);

      return { previous, tempId };
    },
    onError: (error, { taskId }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(subtaskKeys.list(taskId), context.previous);
      }
      toast({
        variant: "destructive",
        title: "Failed to create subtask",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: (newSubtask, { taskId }, context) => {
      queryClient.setQueryData<Subtask[]>(subtaskKeys.list(taskId), (old) => {
        if (!old) return [newSubtask];
        if (context?.tempId) {
          const idx = old.findIndex((st) => st.id === context.tempId);
          if (idx >= 0) {
            const next = old.slice();
            next[idx] = newSubtask;
            return next;
          }
        }
        // Fallback if optimistic entry was not present
        return old.some((st) => st.id === newSubtask.id)
          ? old
          : [...old, newSubtask];
      });
    },
  });
}

/**
 * Update a subtask with optimistic title/completion change.
 */
export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  const { record } = useUndoRedo();
  const { queueMutation } = useAccountSync();

  return useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
      data,
    }: {
      taskId: string;
      subtaskId: string;
      data: UpdateSubtaskInput;
    }): Promise<Subtask> => {
      if (isBrowserOffline()) {
        const current = queryClient
          .getQueryData<Subtask[]>(subtaskKeys.list(taskId))
          ?.find((st) => st.id === subtaskId);
        if (!current)
          throw new Error("Subtask must be loaded before editing offline");
        queueMutation({
          clientMutationId: mutationId(),
          entityType: "subtask",
          operation: "update",
          entityId: subtaskId,
          expectedRevision: current.revision,
          payload: data as Record<string, unknown>,
        });
        return {
          ...current,
          ...data,
          revision: current.revision + 1,
          updatedAt: new Date().toISOString(),
        };
      }
      const api = getApi();
      return await api.subtasks.update(taskId, subtaskId, data);
    },
    onMutate: async ({ taskId, subtaskId, data }) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.list(taskId) });
      const previous = queryClient.getQueryData<Subtask[]>(
        subtaskKeys.list(taskId)
      );
      const prevCompleted = previous?.find(
        (st) => st.id === subtaskId
      )?.completed;

      queryClient.setQueryData<Subtask[]>(
        subtaskKeys.list(taskId),
        (old) =>
          old?.map((st) =>
            st.id === subtaskId
              ? { ...st, ...data, updatedAt: new Date().toISOString() }
              : st
          ) ?? []
      );

      return { previous, prevCompleted };
    },
    onError: (error, { taskId }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(subtaskKeys.list(taskId), context.previous);
      }
      toast({
        variant: "destructive",
        title: "Failed to update subtask",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: (updatedSubtask, { taskId, subtaskId, data }, context) => {
      queryClient.setQueryData<Subtask[]>(
        subtaskKeys.list(taskId),
        (old) =>
          old?.map((st) =>
            st.id === updatedSubtask.id ? updatedSubtask : st
          ) ?? []
      );

      // Make completion toggles undoable (title edits aren't recorded here).
      if (
        data.completed !== undefined &&
        context?.prevCompleted !== undefined &&
        context.prevCompleted !== data.completed
      ) {
        const prevCompleted = context.prevCompleted;
        const nextCompleted = data.completed;
        try {
          record({
            label: nextCompleted ? "Complete subtask" : "Uncomplete subtask",
            undo: async () => {
              await getApi().subtasks.update(taskId, subtaskId, {
                completed: prevCompleted,
              });
              queryClient.invalidateQueries({
                queryKey: subtaskKeys.list(taskId),
              });
            },
            redo: async () => {
              await getApi().subtasks.update(taskId, subtaskId, {
                completed: nextCompleted,
              });
              queryClient.invalidateQueries({
                queryKey: subtaskKeys.list(taskId),
              });
            },
          });
        } catch {
          // history bookkeeping must never break the update
        }
      }
    },
  });
}

/**
 * Delete a subtask with optimistic removal so the row disappears instantly.
 */
export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  const { queueMutation } = useAccountSync();

  return useMutation({
    mutationFn: async ({
      taskId,
      subtaskId,
    }: {
      taskId: string;
      subtaskId: string;
    }): Promise<string> => {
      if (isBrowserOffline()) {
        const current = queryClient
          .getQueryData<Subtask[]>(subtaskKeys.list(taskId))
          ?.find((st) => st.id === subtaskId);
        if (!current)
          throw new Error("Subtask must be loaded before deleting offline");
        queueMutation({
          clientMutationId: mutationId(),
          entityType: "subtask",
          operation: "delete",
          entityId: subtaskId,
          expectedRevision: current.revision,
          payload: {},
        });
        return subtaskId;
      }
      const api = getApi();
      await api.subtasks.delete(taskId, subtaskId);
      return subtaskId;
    },
    onMutate: async ({ taskId, subtaskId }) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.list(taskId) });
      const previous = queryClient.getQueryData<Subtask[]>(
        subtaskKeys.list(taskId)
      );
      queryClient.setQueryData<Subtask[]>(
        subtaskKeys.list(taskId),
        (old) => old?.filter((st) => st.id !== subtaskId) ?? []
      );
      return { previous };
    },
    onError: (error, { taskId }, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(subtaskKeys.list(taskId), context.previous);
      }
      toast({
        variant: "destructive",
        title: "Failed to delete subtask",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

/**
 * Reorder subtasks within a task.
 */
export function useReorderSubtasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      subtaskIds,
    }: {
      taskId: string;
      subtaskIds: string[];
    }): Promise<Subtask[]> => {
      const api = getApi();
      return await api.subtasks.reorder(taskId, subtaskIds);
    },
    onMutate: async ({ taskId, subtaskIds }) => {
      await queryClient.cancelQueries({ queryKey: subtaskKeys.list(taskId) });
      const previousSubtasks = queryClient.getQueryData<Subtask[]>(
        subtaskKeys.list(taskId)
      );

      if (previousSubtasks) {
        const reorderedSubtasks = subtaskIds
          .map((id, index) => {
            const subtask = previousSubtasks.find((st) => st.id === id);
            return subtask ? { ...subtask, position: index } : null;
          })
          .filter((st): st is Subtask => st !== null);

        queryClient.setQueryData(subtaskKeys.list(taskId), reorderedSubtasks);
      }

      return { previousSubtasks };
    },
    onError: (error, { taskId }, context) => {
      if (context?.previousSubtasks) {
        queryClient.setQueryData(
          subtaskKeys.list(taskId),
          context.previousSubtasks
        );
      }
      toast({
        variant: "destructive",
        title: "Failed to reorder subtasks",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
    onSuccess: (subtasks, { taskId }) => {
      // Trust the server-returned ordering rather than refetching.
      queryClient.setQueryData(subtaskKeys.list(taskId), subtasks);
    },
  });
}
