import * as React from "react";
import { isToday } from "date-fns";
import type { Task } from "@open-sunsama/types";
import { useAssignments } from "@/hooks/useAssignments";
import { useTasks } from "@/hooks/useTasks";
import { triggerNativeAlarm, scheduleNativeNotification, isNativePlatform } from "@/lib/native-bridge";
import { formatAssignmentDue } from "@/components/academics/academic-utils";

export const AUTO_ALARMS_STORAGE_KEY = "studyos_auto_alarms_enabled";
export const LAST_SYNC_STORAGE_KEY = "studyos_auto_alarms_last_sync";

export function getAutoAlarmsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(AUTO_ALARMS_STORAGE_KEY);
  return val === null ? true : val === "true";
}

export function setAutoAlarmsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_ALARMS_STORAGE_KEY, enabled ? "true" : "false");
}

/**
 * Hook that automatically synchronizes native phone alarms and high-priority
 * notifications for today's active study sessions and upcoming deadlines.
 */
export function useAutoAlarmsSync() {
  const isNative = React.useMemo(() => isNativePlatform(), []);
  const todayStr = React.useMemo(() => new Date().toISOString().slice(0, 10), []);

  const assignmentsQuery = useAssignments({ limit: 100 });
  const tasksQuery = useTasks({ scheduledDate: todayStr });

  React.useEffect(() => {
    if (!isNative) return;
    if (!getAutoAlarmsEnabled()) return;
    if (assignmentsQuery.isLoading || tasksQuery.isLoading) return;

    // Throttle auto-sync to at most once per 60 minutes unless manually triggered
    const lastSync = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    const now = Date.now();
    if (lastSync && now - parseInt(lastSync, 10) < 60 * 60 * 1000) {
      return;
    }

    const assignments = assignmentsQuery.data?.data ?? [];
    const tasksList: Task[] = Array.isArray(tasksQuery.data) ? tasksQuery.data : [];

    // 1. Schedule notifications for upcoming assignments due in next 48h
    const upcomingAssignments = assignments.filter((a) => {
      if (a.status === "completed" || a.status === "cancelled") return false;
      const due = new Date(a.dueAt).getTime();
      return due > now && due < now + 48 * 60 * 60 * 1000;
    });

    upcomingAssignments.forEach((a) => {
      const due = new Date(a.dueAt);
      // 1 hour before deadline
      const notifyTime = new Date(Math.max(now + 10000, due.getTime() - 60 * 60 * 1000));
      scheduleNativeNotification(
        `Assignment Alert: ${a.title}`,
        `Due ${formatAssignmentDue(a.dueAt)}. Make sure to complete and submit!`,
        notifyTime,
        `auto-assign-${a.id}`
      );
    });

    // 2. Schedule notifications for today's pending tasks
    const activeTasks = tasksList.filter(
      (t: Task) => !t.completedAt && t.scheduledDate === todayStr
    );

    activeTasks.forEach((t: Task, idx: number) => {
      // Space notifications for pending tasks every 60 mins during the day
      const targetTime = new Date(now + (idx + 1) * 60 * 60 * 1000);
      scheduleNativeNotification(
        `Study Session: ${t.title}`,
        `Estimated ${t.estimatedMins ?? 30} mins. Stay focused and keep up the momentum!`,
        targetTime,
        `auto-task-${t.id}`
      );
    });

    // 3. Set the nearest phone clock alarm for today's highest-priority item
    const sortedAssignments = [...upcomingAssignments].sort(
      (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    );

    const firstUpcoming = sortedAssignments[0];
    if (firstUpcoming && isToday(new Date(firstUpcoming.dueAt))) {
      const due = new Date(firstUpcoming.dueAt);
      if (due.getTime() > now) {
        // Set alarm for 30 minutes before due date
        const alarmDate = new Date(Math.max(now + 60000, due.getTime() - 30 * 60 * 1000));
        triggerNativeAlarm(alarmDate, `StudyOS: ${firstUpcoming.title}`);
      }
    }

    localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(now));
  }, [
    isNative,
    assignmentsQuery.isLoading,
    assignmentsQuery.data,
    tasksQuery.isLoading,
    tasksQuery.data,
    todayStr,
  ]);
}
