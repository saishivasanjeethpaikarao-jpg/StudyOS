import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilterInput,
} from '@open-sunsama/types';
import { getApi } from '@/lib/api';
import * as Haptics from 'expo-haptics';
import { useAccountSync } from '@/lib/sync';
import { newClientId } from '@/lib/ids';

/**
 * Query key factory for tasks
 */
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilterInput) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

/**
 * Fetch all tasks with optional filters
 */
export function useTasks(filters?: TaskFilterInput) {
  const sync = useAccountSync();
  return useQuery({
    queryKey: taskKeys.list(filters ?? {}),
    queryFn: async () => {
      const api = getApi();
      try {
        const response = await api.tasks.list(filters);
        return response.data ?? [];
      } catch {
        const cached = await sync.getCached<Task>('tasks');
        const values = Array.isArray(cached) ? cached : [];
        return values
          .map((task) => ({ ...task, completedAt: task.completedAt ? new Date(task.completedAt) : null, createdAt: new Date(task.createdAt), updatedAt: new Date(task.updatedAt) }))
          .filter((task) => !filters?.scheduledDate || task.scheduledDate === filters.scheduledDate);
      }
    },
  });
}

/**
 * Fetch a single task by ID
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const api = getApi();
      return await api.tasks.get(id);
    },
    enabled: !!id,
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();

  return useMutation({
    mutationFn: async (data: CreateTaskInput): Promise<Task> => {
      const id = newClientId();
      const now = new Date();
      const optimistic: Task = {
        id, userId: 'pending', title: data.title, notes: data.notes ?? null,
        scheduledDate: data.scheduledDate ?? null, estimatedMins: data.estimatedMins ?? null,
        actualMins: null, priority: data.priority ?? 'P2', completedAt: null,
        position: 0, subtasksHidden: false, revision: 1, seriesId: null,
        seriesInstanceNumber: null, timerStartedAt: null, timerAccumulatedSeconds: 0,
        createdAt: now, updatedAt: now,
      };
      await sync.enqueueMutation({ entityType: 'task', operation: 'create', entityId: id, payload: data as unknown as Record<string, unknown> });
      return optimistic;
    },
    onSuccess: (newTask) => {
      // Invalidate and refetch task lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      
      // Optionally add the new task to the cache
      queryClient.setQueryData(taskKeys.detail(newTask.id), newTask);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      // Error haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });
}

/**
 * Update an existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskInput }): Promise<Task> => {
      const current = queryClient.getQueryData<Task>(taskKeys.detail(id));
      await sync.enqueueMutation({ entityType: 'task', operation: 'update', entityId: id, expectedRevision: current?.revision, payload: data as Record<string, unknown> });
      return { ...(current as Task), ...data, updatedAt: new Date(), revision: (current?.revision ?? 0) + 1 };
    },
    onSuccess: (updatedTask) => {
      // Update the task in cache
      queryClient.setQueryData(taskKeys.detail(updatedTask.id), updatedTask);
      
      // Invalidate lists to ensure consistency
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();

  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const current = queryClient.getQueryData<Task>(taskKeys.detail(id));
      await sync.enqueueMutation({ entityType: 'task', operation: 'delete', entityId: id, expectedRevision: current?.revision, payload: {} });
      return id;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: taskKeys.detail(deletedId) });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });
}

/**
 * Complete or uncomplete a task
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();
  const sync = useAccountSync();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }): Promise<Task> => {
      const current = queryClient.getQueryData<Task>(taskKeys.detail(id));
      await sync.enqueueMutation({
        entityType: 'task', operation: 'update', entityId: id,
        expectedRevision: current?.revision,
        payload: { completedAt: completed ? new Date().toISOString() : null },
      });
      return { ...(current as Task), completedAt: completed ? new Date() : null, revision: (current?.revision ?? 0) + 1, updatedAt: new Date() };
    },
    onMutate: async ({ id, completed }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() });

      // Optimistic update
      const previousLists = queryClient.getQueriesData({ queryKey: taskKeys.lists() });
      
      queryClient.setQueriesData<Task[]>({ queryKey: taskKeys.lists() }, (old) => {
        if (!old) return old;
        return old.map((task) => {
          if (task.id === id) {
            return {
              ...task,
              completedAt: completed ? new Date() : null,
            };
          }
          return task;
        });
      });

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      return { previousLists };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(taskKeys.detail(updatedTask.id), updatedTask);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}
