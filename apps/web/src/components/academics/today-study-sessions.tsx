import * as React from "react";
import { format } from "date-fns";
import { Bell, BookOpenCheck } from "lucide-react";
import { useStudySessions } from "@/hooks/useStudySessions";
import { Button, Skeleton } from "@/components/ui";
import {
  isSessionOnViewerClockChangeDay,
  sessionViewerTimeDetails,
  todaySessionRange,
} from "@/lib/study-session-time";
import { triggerNativeAlarm, scheduleNativeNotification } from "@/lib/native-bridge";
import { toast } from "@/hooks/use-toast";

/** A compact Today view over the same canonical sessions projected to Calendar. */
export function TodayStudySessions({
  onSelectSession,
}: {
  onSelectSession?: (id: string) => void;
}) {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const today = todaySessionRange(now);
  const query = useStudySessions({
    status: "planned",
    ...today,
    limit: 100,
  });
  if (query.isLoading)
    return <Skeleton className="mx-3 mt-2 h-12 rounded-xl lg:mx-4" />;
  if (query.isError || !query.data?.data.length) return null;
  const sessions = [...query.data.data].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );
  const viewerTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const handleAlarmAllSessions = () => {
    sessions.forEach((s) => {
      const startTime = new Date(s.startAt);
      if (startTime.getTime() > Date.now()) {
        scheduleNativeNotification(
          `Study Session Starting: ${s.plannedMinutes}m`,
          `Time to begin your scheduled study block. Tap to open FocusTube or notes.`,
          new Date(Math.max(Date.now() + 5000, startTime.getTime() - 10 * 60 * 1000)),
          s.id
        );
      }
    });
    const upcoming = sessions.filter((s) => new Date(s.startAt).getTime() > Date.now());
    if (upcoming[0]) {
      triggerNativeAlarm(
        new Date(upcoming[0].startAt),
        `Study Session (${upcoming[0].plannedMinutes}m)`,
        viewerTimezone,
        false
      );
    }
    toast({
      title: "Study Session Alarms Synced",
      description: `Phone notifications queued for ${sessions.length} study block(s) today.`,
    });
  };

  return (
    <section
      aria-label="Study sessions today"
      className="mx-3 mt-2 flex shrink-0 items-center gap-3 overflow-x-auto rounded-xl border bg-card px-3 py-2 lg:mx-4"
    >
      <BookOpenCheck
        className="h-4 w-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <span className="shrink-0 text-xs font-medium">Study today</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-primary gap-1 shrink-0"
        onClick={handleAlarmAllSessions}
        title="Set phone alarms and notifications for all study sessions today"
      >
        <Bell className="h-3 w-3" />
        Alarm
      </Button>
      <div className="flex min-w-0 gap-2">
        {sessions.map((session) => (
          <Button
            key={session.id}
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1 text-xs"
            onClick={() => onSelectSession?.(session.id)}
          >
            {isSessionOnViewerClockChangeDay(
              { studySessionId: session.id },
              now
            )
              ? `Clock change · ${sessionViewerTimeDetails(session.startAt, session.endAt)}`
              : session.startAt < new Date(today.from)
                ? `Continues until ${format(session.endAt, "h:mm a")}`
                : format(session.startAt, "h:mm a")}{" "}
            · {session.plannedMinutes} min
            {session.timezone !== viewerTimezone
              ? ` · your time (scheduled in ${session.timezone})`
              : ""}
          </Button>
        ))}
      </div>
    </section>
  );
}
