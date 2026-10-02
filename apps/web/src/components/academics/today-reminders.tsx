import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui";
import { getApi } from "@/lib/api";
import { learningKeys } from "@/lib/query-keys";
import { toast } from "@/hooks/use-toast";

/** In-app reminder surface; no background delivery or device alarm is implied. */
export function TodayReminders() {
  const client = useQueryClient();
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: [...learningKeys.reminders, "pending"],
    queryFn: () => getApi().reminders.list("pending"),
    refetchInterval: 60_000,
  });
  const due = (query.data ?? []).filter(
    (reminder) => new Date(reminder.remindAt).getTime() <= now
  );
  if (!due.length) return null;
  return (
    <section
      aria-label="Due reminders"
      className="mx-3 mt-2 flex shrink-0 items-center gap-3 overflow-x-auto rounded-xl border bg-card px-3 py-2 lg:mx-4"
    >
      <Bell aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
      <span className="shrink-0 text-xs font-medium">Reminders</span>
      <div className="flex min-w-0 gap-2">
        {due.map((reminder) => (
          <div
            key={reminder.id}
            className="flex shrink-0 items-center gap-2 rounded-lg border px-2 py-1 text-sm"
          >
            <span className="max-w-56 truncate">{reminder.title}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={async () => {
                try {
                  await getApi().reminders.dismiss(
                    reminder.id,
                    reminder.revision
                  );
                  await client.invalidateQueries({
                    queryKey: learningKeys.reminders,
                  });
                } catch (error) {
                  toast({
                    variant: "destructive",
                    title: "Could not dismiss reminder",
                    description:
                      error instanceof Error ? error.message : "Try again.",
                  });
                }
              }}
            >
              Dismiss
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
