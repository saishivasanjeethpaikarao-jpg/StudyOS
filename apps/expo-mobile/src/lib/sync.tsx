import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import type { SyncChange, SyncMutationInput } from '@open-sunsama/api-client';
import { getApi } from './api';
import { newClientId } from './ids';
import { useAuth } from './auth';

type QueueItem = SyncMutationInput & { queuedAt: string; attempts: number };
type StoredEntity = { entityType: string; entityId: string; data: Record<string, unknown>; deleted?: boolean };

interface SyncState {
  status: 'idle' | 'syncing' | 'offline' | 'error';
  pendingCount: number;
  lastSuccessfulSyncAt: string | null;
  error: string | null;
  conflicts: number;
}

interface SyncContextValue extends SyncState {
  syncNow: () => Promise<void>;
  enqueueMutation: (input: Omit<SyncMutationInput, 'clientMutationId'> & { clientMutationId?: string }) => Promise<string>;
  getCached: <T>(entityType: string, entityId?: string) => Promise<T | T[] | null>;
}

const SyncContext = React.createContext<SyncContextValue | null>(null);

const key = (userId: string, suffix: string) => `studyos:sync:${userId}:${suffix}`;

async function readJson<T>(storageKey: string, fallback: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(storageKey);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(storageKey: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(storageKey, JSON.stringify(value));
}

function applyChanges(entries: StoredEntity[], changes: SyncChange[]): StoredEntity[] {
  const next = new Map(entries.map((entry) => [`${entry.entityType}:${entry.entityId}`, entry]));
  for (const change of changes) {
    const mapKey = `${change.entityType}:${change.entityId}`;
    if (change.operation === 'delete' || !change.payload) {
      next.set(mapKey, {
        entityType: change.entityType,
        entityId: change.entityId,
        data: change.payload ?? {},
        deleted: true,
      });
    } else {
      next.set(mapKey, {
        entityType: change.entityType,
        entityId: change.entityId,
        data: change.payload,
        deleted: false,
      });
    }
  }
  return [...next.values()];
}

export function AccountSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const deviceIdRef = React.useRef<string | null>(null);
  const syncingRef = React.useRef(false);
  const [state, setState] = React.useState<SyncState>({
    status: 'idle', pendingCount: 0, lastSuccessfulSyncAt: null, error: null, conflicts: 0,
  });

  const getDeviceId = React.useCallback(async () => {
    if (!user) return null;
    if (!deviceIdRef.current) {
      const stored = await AsyncStorage.getItem(key(user.id, 'device-id'));
      deviceIdRef.current = stored ?? newClientId();
      await AsyncStorage.setItem(key(user.id, 'device-id'), deviceIdRef.current);
    }
    return deviceIdRef.current;
  }, [user]);

  const applyCache = React.useCallback(async (changes: SyncChange[]) => {
    if (!user) return;
    const cacheKey = key(user.id, 'entities');
    const existing = await readJson<StoredEntity[]>(cacheKey, []);
    await writeJson(cacheKey, applyChanges(existing, changes));
    // Query invalidation is awaited before the cursor is advanced. A failed
    // refetch leaves the prior cursor in place so the batch is replayable.
    await queryClient.invalidateQueries();
  }, [queryClient, user]);

  const refreshQueueCount = React.useCallback(async () => {
    if (!user) return;
    const queue = await readJson<QueueItem[]>(key(user.id, 'queue'), []);
    setState((current) => ({ ...current, pendingCount: queue.length }));
  }, [user]);

  const syncNow = React.useCallback(async () => {
    if (!user || !isAuthenticated || syncingRef.current) return;
    syncingRef.current = true;
    setState((current) => ({ ...current, status: 'syncing', error: null }));
    try {
      const api = getApi();
      const deviceId = await getDeviceId();
      await api.account.registerDevice({ clientDeviceId: deviceId!, platform: 'android', displayName: 'StudyOS Android' });
      let queue = await readJson<QueueItem[]>(key(user.id, 'queue'), []);
      let conflicts = 0;
      for (const item of queue) {
        try {
          await api.sync.mutate(item);
          queue = queue.filter((candidate) => candidate.clientMutationId !== item.clientMutationId);
          await writeJson(key(user.id, 'queue'), queue);
        } catch (error) {
          const status = (error as { status?: number }).status;
          if (status === 409) {
            conflicts += 1;
            // The server has a newer revision. Preserve the conflicting mutation in a durable conflicts store
            // so student offline work is never lost, while unblocking subsequent items in the active queue.
            const existingConflicts = await readJson<QueueItem[]>(key(user.id, 'conflicts'), []);
            await writeJson(key(user.id, 'conflicts'), [...existingConflicts, { ...item, lastError: 'Revision conflict: newer data exists on server.' }]);
            queue = queue.filter((candidate) => candidate.clientMutationId !== item.clientMutationId);
            await writeJson(key(user.id, 'queue'), queue);
            continue;
          }
          if (status && status >= 400 && status < 500) {
            // Irrecoverable client error; remove from queue to avoid permanent blockage.
            queue = queue.filter((candidate) => candidate.clientMutationId !== item.clientMutationId);
            await writeJson(key(user.id, 'queue'), queue);
            continue;
          }
          // Network or server error: keep durable in queue and retry when connection/server is restored.
          break;
        }
      }
      await refreshQueueCount();

      let cursor = await AsyncStorage.getItem(key(user.id, 'cursor'));
      if (cursor === null) {
        let pageToken: string | undefined;
        let snapshotCursor = '0';
        do {
          const page = await api.sync.bootstrap({ deviceId: deviceId!, pageToken, pageSize: 200 });
          const changes: SyncChange[] = page.entries.map((entry) => ({
            sequence: Number(page.snapshotSequence), entityType: entry.entityType,
            entityId: entry.entityId, revision: null, operation: 'upsert',
            payload: (entry.data ?? {}) as Record<string, unknown>, changedAt: new Date().toISOString(),
          }));
          await applyCache(changes);
          pageToken = page.nextPageToken ?? undefined;
          snapshotCursor = page.nextCursor ?? page.snapshotSequence;
        } while (pageToken);
        await AsyncStorage.setItem(key(user.id, 'cursor'), snapshotCursor);
        cursor = snapshotCursor;
      }

      let currentCursor = cursor;
      let hasMore = true;
      while (hasMore) {
        const page = await api.sync.changes({ cursor: currentCursor ?? '0', limit: 200, deviceId: deviceId! });
        if (page.changes.length) {
          await applyCache(page.changes);
          // Only persist after all cache application/refetch work succeeds.
          await AsyncStorage.setItem(key(user.id, 'cursor'), page.nextCursor);
          currentCursor = page.nextCursor;
        }
        hasMore = page.hasMore;
      }
      const syncedAt = new Date().toISOString();
      setState((current) => ({ ...current, status: 'idle', lastSuccessfulSyncAt: syncedAt, conflicts, error: null }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync is unavailable';
      setState((current) => ({ ...current, status: message.includes('Network') ? 'offline' : 'error', error: message }));
    } finally {
      syncingRef.current = false;
    }
  }, [applyCache, getDeviceId, isAuthenticated, refreshQueueCount, user]);

  const enqueueMutation = React.useCallback(async (input: Omit<SyncMutationInput, 'clientMutationId'> & { clientMutationId?: string }) => {
    if (!user) throw new Error('Sign in to save changes');
    const mutation: QueueItem = {
      ...input,
      clientMutationId: input.clientMutationId ?? newClientId(),
      queuedAt: new Date().toISOString(), attempts: 0,
    };
    const queue = await readJson<QueueItem[]>(key(user.id, 'queue'), []);
    await writeJson(key(user.id, 'queue'), [...queue, mutation]);
    setState((current) => ({ ...current, pendingCount: queue.length + 1 }));
    void syncNow();
    return mutation.clientMutationId;
  }, [syncNow, user]);

  const getCached = React.useCallback(async <T,>(entityType: string, entityId?: string) => {
    if (!user) return null;
    const entries = await readJson<StoredEntity[]>(key(user.id, 'entities'), []);
    const aliases = new Set([entityType, entityType.endsWith('s') ? entityType.slice(0, -1) : `${entityType}s`]);
    const filtered = entries.filter((entry) => aliases.has(entry.entityType) && !entry.deleted);
    if (entityId) return (filtered.find((entry) => entry.entityId === entityId)?.data as T | undefined) ?? null;
    return filtered.map((entry) => entry.data) as T[];
  }, [user]);

  React.useEffect(() => {
    deviceIdRef.current = null;
    if (!isAuthenticated || !user) return;
    void refreshQueueCount();
    void syncNow();
    const listener = (nextState: AppStateStatus) => {
      if (nextState === 'active') void syncNow();
    };
    const subscription = AppState.addEventListener('change', listener);
    return () => subscription.remove();
  }, [isAuthenticated, refreshQueueCount, syncNow, user]);

  const value = React.useMemo<SyncContextValue>(() => ({ ...state, syncNow, enqueueMutation, getCached }), [enqueueMutation, getCached, state, syncNow]);
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useAccountSync(): SyncContextValue {
  const context = React.useContext(SyncContext);
  if (!context) throw new Error('useAccountSync must be used within AccountSyncProvider');
  return context;
}
