import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getApi } from "@/lib/api";
import type {
  AccountDevice,
  SyncMutationInput,
} from "@open-sunsama/api-client";
import {
  enqueueSyncMutation,
  listQueuedSyncMutations,
  removeQueuedSyncMutation,
  updateQueuedSyncMutation,
} from "@/lib/offline-sync-queue";

type SyncState = "starting" | "idle" | "syncing" | "offline" | "error";
interface SyncContextValue {
  state: SyncState;
  lastSuccessfulSyncAt: Date | null;
  error: string | null;
  devices: AccountDevice[];
  clientDeviceId: string | null;
  syncNow: () => Promise<void>;
  revokeDevice: (id: string) => Promise<void>;
  pendingMutationCount: number;
  queueMutation: (input: SyncMutationInput) => void;
}
const SyncContext = React.createContext<SyncContextValue | null>(null);
const CLIENT_DEVICE_KEY = "studyos_web_device_id_v1";

function getClientDeviceId(): string {
  let id = localStorage.getItem(CLIENT_DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_DEVICE_KEY, id);
  }
  return id;
}
function cursorKey(userId: string, deviceId: string) {
  return `studyos_sync_cursor_v1:${userId}:${deviceId}`;
}

function invalidationKeys(entityType: string): readonly unknown[][] {
  if (entityType === "profile") return [["auth"]];
  if (["task", "subtask", "time-block", "task-series"].includes(entityType))
    return [["tasks"], ["timeBlocks"]];
  if (entityType === "subject") return [["subjects"], ["assignments"]];
  if (entityType === "assignment" || entityType === "study-session")
    return [
      ["assignments"],
      ["study-sessions"],
      ["studySessions"],
      ["tasks"],
      ["timeBlocks"],
    ];
  if (
    [
      "resource",
      "resource-link",
      "study-note",
      "study-reminder",
      "focus-session",
    ].includes(entityType)
  )
    return [
      ["learning"],
      ["resources"],
      ["study-notes"],
      ["study-reminders"],
      ["focus-sessions"],
    ];
  if (
    [
      "quiz",
      "quiz-question",
      "quiz-option",
      "quiz-attempt",
      "quiz-answer",
    ].includes(entityType)
  )
    return [["quizzes"], ["quiz-attempts"]];
  if (entityType.startsWith("idea")) return [["ideas"]];
  if (entityType === "attachment") return [["attachments"]];
  return [];
}

export function AccountSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = React.useState<SyncState>("starting");
  const [error, setError] = React.useState<string | null>(null);
  const [devices, setDevices] = React.useState<AccountDevice[]>([]);
  const [lastSuccessfulSyncAt, setLastSuccessfulSyncAt] =
    React.useState<Date | null>(null);
  const [clientDeviceId, setClientDeviceId] = React.useState<string | null>(
    null
  );
  const [pendingMutationCount, setPendingMutationCount] = React.useState(0);
  const running = React.useRef<Promise<void> | null>(null);
  const currentUserId = user?.id;

  const flushQueuedMutations = React.useCallback(async (userId: string) => {
    const queued = listQueuedSyncMutations(userId);
    setPendingMutationCount(queued.length);
    if (!queued.length) return null;
    let firstError: string | null = null;
    const api = getApi();
    for (const item of queued) {
      try {
        await api.sync.mutate(item.input);
        removeQueuedSyncMutation(userId, item.id);
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "StudyOS could not save this change";
        updateQueuedSyncMutation(userId, item.id, {
          attempts: item.attempts + 1,
          lastError: message,
        });
        firstError ??= message;
      }
    }
    setPendingMutationCount(listQueuedSyncMutations(userId).length);
    return firstError;
  }, []);

  const syncNow = React.useCallback(async () => {
    if (!isAuthenticated || !currentUserId || running.current)
      return running.current ?? undefined;
    running.current = (async () => {
      setState("syncing");
      setError(null);
      try {
        const api = getApi();
        const clientDeviceId = getClientDeviceId();
        setClientDeviceId(clientDeviceId);
        const device = await api.account.registerDevice({
          clientDeviceId,
          platform: "web",
          displayName: "This browser",
        });
        const list = await api.account.devices();
        setDevices(list);
        const queuedError = await flushQueuedMutations(currentUserId);
        const key = cursorKey(currentUserId, device.id);
        let cursor = localStorage.getItem(key);
        if (!cursor) {
          let page = await api.sync.bootstrap({
            deviceId: device.id,
            pageSize: 500,
          });
          while (!page.complete) {
            if (!page.nextPageToken)
              throw new Error(
                "Initial sync ended before the snapshot was complete"
              );
            page = await api.sync.bootstrap({
              deviceId: device.id,
              pageSize: 500,
              pageToken: page.nextPageToken,
            });
          }
          cursor = page.nextCursor;
          if (!cursor) throw new Error("Initial sync did not return a cursor");
          localStorage.setItem(key, cursor);
          await queryClient.invalidateQueries();
        }
        let hasMore = true;
        while (hasMore) {
          const changes = await api.sync.changes({
            cursor,
            deviceId: device.id,
            limit: 500,
          });
          for (const change of changes.changes) {
            const keys = invalidationKeys(change.entityType);
            if (keys.length)
              for (const queryKey of keys)
                void queryClient.invalidateQueries({ queryKey });
            else void queryClient.invalidateQueries();
          }
          cursor = changes.nextCursor;
          localStorage.setItem(key, cursor);
          hasMore = changes.hasMore;
        }
        setLastSuccessfulSyncAt(new Date());
        setState(queuedError ? "error" : "idle");
        if (queuedError) setError(queuedError);
      } catch (cause) {
        const message =
          cause instanceof Error
            ? cause.message
            : "StudyOS could not sync right now";
        setError(message);
        setState(
          typeof navigator !== "undefined" && !navigator.onLine
            ? "offline"
            : "error"
        );
      } finally {
        running.current = null;
      }
    })();
    return running.current;
  }, [currentUserId, flushQueuedMutations, isAuthenticated, queryClient]);

  const queueMutation = React.useCallback(
    (input: SyncMutationInput) => {
      if (!currentUserId) return;
      const queued = enqueueSyncMutation(currentUserId, input);
      if (!queued) {
        throw new Error(
          "StudyOS could not save this offline change in this browser"
        );
      }
      setPendingMutationCount(listQueuedSyncMutations(currentUserId).length);
      setState("offline");
      setError(null);
    },
    [currentUserId]
  );

  const revokeDevice = React.useCallback(async (id: string) => {
    await getApi().account.revokeDevice(id);
    setDevices((old) =>
      old.map((device) =>
        device.id === id
          ? { ...device, revokedAt: new Date().toISOString() }
          : device
      )
    );
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated || !currentUserId) {
      setState("starting");
      return;
    }
    void syncNow();
    const timer = window.setInterval(() => {
      if (navigator.onLine) void syncNow();
    }, 30_000);
    const online = () => {
      void syncNow();
    };
    window.addEventListener("online", online);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", online);
    };
  }, [currentUserId, isAuthenticated, syncNow]);

  const value = React.useMemo(
    () => ({
      state,
      lastSuccessfulSyncAt,
      error,
      devices,
      clientDeviceId,
      syncNow,
      revokeDevice,
      pendingMutationCount,
      queueMutation,
    }),
    [
      state,
      lastSuccessfulSyncAt,
      error,
      devices,
      clientDeviceId,
      syncNow,
      revokeDevice,
      pendingMutationCount,
      queueMutation,
    ]
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useAccountSync(): SyncContextValue {
  const value = React.useContext(SyncContext);
  if (!value)
    throw new Error("useAccountSync must be used within AccountSyncProvider");
  return value;
}
