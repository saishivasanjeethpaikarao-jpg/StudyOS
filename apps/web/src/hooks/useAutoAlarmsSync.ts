import * as React from "react";
import { format } from "date-fns";
import type { Task, StudySession } from "@open-sunsama/types";
import { useAssignments } from "@/hooks/useAssignments";
import { useTasks } from "@/hooks/useTasks";
import { useStudySessions } from "@/hooks/useStudySessions";
import {
  triggerNativeAlarm,
  scheduleNativeNotification,
  isNativePlatform,
} from "@/lib/native-bridge";
import { formatAssignmentDue } from "@/components/academics/academic-utils";

export const AUTO_ALARMS_STORAGE_KEY = "studyos_auto_alarms_enabled";
export const LAST_SYNC_STORAGE_KEY = "studyos_auto_alarms_last_sync";
export const LAST_SCHEDULED_ALARM_KEY = "studyos_last_scheduled_alarm_id";

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
 *
 * Rules:
 * - Respects Quiet / Sleep Hours (21:30 - 07:00): Never sets night/midnight alarms when opened late.
 * - Hardware Clock Alarms are ONLY scheduled for real planned study sessions with daytime hours.
 * - Assignment deadlines and task reminders are sent as gentle notifications, not waking Clock alarms.
 * - Uses exact device timezone and background skipUi so the app is not disrupted.
 */
export function useAutoAlarmsSync() {
  const isNative = React.useMemo(() => isNativePlatform(), []);
  // Format local date (never toISOString slice which is UTC)
  const todayStr = React.useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const assignmentsQuery = useAssignments({ limit: 100 });
  const tasksQuery = useTasks({ scheduledDate: todayStr });
  const studySessionsQuery = useStudySessions({ status: "planned", limit: 50 });

  React.useEffect(() => {
    if (!isNative) return;
    if (!getAutoAlarmsEnabled()) return;
    if (
      assignmentsQuery.isLoading ||
      tasksQuery.isLoading ||
      studySessionsQuery.isLoading
    ) {
      return;
    }

    const now = Date.now();
    const nowDate = new Date(now);
    const localHour = nowDate.getHours();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Throttle auto-sync to at most once per 30 minutes
    const lastSync = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (lastSync && now - parseInt(lastSync, 10) < 30 * 60 * 1000) {
      return;
    }

    const assignments = assignmentsQuery.data?.data ?? [];
    const tasksList: Task[] = Array.isArray(tasksQuery.data) ? tasksQuery.data : [];
    const studySessions: StudySession[] = studySessionsQuery.data?.data ?? [];

    // =========================================================================
    // 1. Assignment Deadline Reminders (Notifications, NOT waking Clock Alarms)
    // =========================================================================
    const upcomingAssignments = assignments.filter((a) => {
      if (a.status === "completed" || a.status === "cancelled") return false;
      const due = new Date(a.dueAt).getTime();
      return due > now && due < now + 48 * 60 * 60 * 1000;
    });

    upcomingAssignments.forEach((a) => {
      const due = new Date(a.dueAt);
      const dueTime = due.getTime();
      const dueHour = due.getHours();

      // If assignment is due around midnight (22:00 - 02:00), schedule the reminder
      // during the early evening (e.g. 7:00 PM / 19:00), so the student isn't disturbed in bed
      let notifyTime: Date;
      if (dueHour >= 22 || dueHour < 2) {
        const eveningReminder = new Date(due);
        if (dueHour < 2) {
          eveningReminder.setDate(eveningReminder.getDate() - 1);
        }
        eveningReminder.setHours(19, 0, 0, 0);
        if (eveningReminder.getTime() > now && eveningReminder.getTime() < dueTime) {
          notifyTime = eveningReminder;
        } else {
          notifyTime = new Date(Math.max(now + 10000, dueTime - 60 * 60 * 1000));
        }
      } else {
        // For daytime deadlines, notify 2 hours before
        notifyTime = new Date(Math.max(now + 10000, dueTime - 2 * 60 * 60 * 1000));
      }

      scheduleNativeNotification(
        `Assignment Due: ${a.title}`,
        `Due ${formatAssignmentDue(a.dueAt)}. Don't forget to submit on time!`,
        notifyTime,
        `auto-assign-${a.id}`
      );
    });

    // =========================================================================
    // 2. Pending Tasks Daytime Study Reminders (Notifications)
    // =========================================================================
    const activeTasks = tasksList.filter(
      (t: Task) => !t.completedAt && t.scheduledDate === todayStr
    );

    // Only schedule study prompt notifications during daytime hours (09:00 - 20:00)
    if (localHour >= 8 && localHour < 20) {
      activeTasks.slice(0, 3).forEach((t: Task, idx: number) => {
        const targetTime = new Date(now + (idx + 1) * 90 * 60 * 1000);
        if (targetTime.getHours() < 21) {
          scheduleNativeNotification(
            `Study Task: ${t.title}`,
            `Estimated ${t.estimatedMins ?? 30} mins. Stay focused on your goals!`,
            targetTime,
            `auto-task-${t.id}`
          );
        }
      });
    }

    // =========================================================================
    // 3. Hardware Phone Clock Alarm (SET_ALARM)
    //    RULES:
    //    - Only set for real, explicitly planned study sessions or scheduled blocks.
    //    - Respect Quiet Hours (21:30 - 07:00): Never set an alarm for late night / midnight!
    //    - Deduplicate: Do not repeatedly trigger the same alarm intent.
    //    - Use skipUi: true so background auto-sync does not interrupt the app UI.
    // =========================================================================
    // Exact Quiet Hours calculation: 21:30 (9:30 PM = 1290m) through 07:00 (7:00 AM = 420m)
    const currentDayMinutes = localHour * 60 + nowDate.getMinutes();
    const isQuietHours = currentDayMinutes >= 1290 || currentDayMinutes < 420;

    // Sort planned sessions chronologically
    const sortedSessions = [...studySessions]
      .filter((s) => s.status === "planned")
      .map((s) => ({ ...s, startDate: new Date(s.startAt) }))
      .filter((s) => s.startDate.getTime() > now + 60 * 1000)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    // Find the next legitimate session to alarm:
    // If during quiet hours, only accept sessions starting tomorrow morning after 7:00 AM
    const nextSession = sortedSessions.find((s) => {
      const sessionMinutes = s.startDate.getHours() * 60 + s.startDate.getMinutes();
      // Never set an alarm during quiet/sleep hours
      if (sessionMinutes >= 1290 || sessionMinutes < 420) {
        return false;
      }
      if (isQuietHours) {
        // When user opens app late at night, only accept waking morning sessions (7:00 AM - 12:00 PM)
        return (
          sessionMinutes >= 420 &&
          sessionMinutes < 720 &&
          s.startDate.getTime() < now + 16 * 60 * 60 * 1000
        );
      }
      // During daytime, accept sessions between 7:00 AM (420m) and 21:30 PM (1290m)
      return sessionMinutes >= 420 && sessionMinutes <= 1290;
    });

    if (nextSession) {
      const lastScheduledAlarmId = localStorage.getItem(LAST_SCHEDULED_ALARM_KEY);
      const sessionAlarmKey = `${nextSession.id}_${nextSession.startDate.getTime()}`;

      if (lastScheduledAlarmId !== sessionAlarmKey) {
        const label = `Study: Study Session (${nextSession.plannedMinutes}m)`;
        // Schedule exact hardware clock alarm with user's local timezone & skipUi: true
        triggerNativeAlarm(nextSession.startDate, label, userTimezone, true);
        localStorage.setItem(LAST_SCHEDULED_ALARM_KEY, sessionAlarmKey);
      }
    }

    localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(now));
  }, [
    isNative,
    assignmentsQuery.isLoading,
    assignmentsQuery.data,
    tasksQuery.isLoading,
    tasksQuery.data,
    studySessionsQuery.isLoading,
    studySessionsQuery.data,
    todayStr,
  ]);
}
