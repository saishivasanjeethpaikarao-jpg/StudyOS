import { addDays, endOfDay, isBefore, isToday } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarCheck2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAssignments } from "@/hooks";
import { Button, Skeleton } from "@/components/ui";

export function AcademicDueSummary() {
  const now = new Date();
  const query = useAssignments({
    dueTo: endOfDay(addDays(now, 7)).toISOString(),
    limit: 200,
  });

  if (query.isLoading) {
    return <Skeleton className="mx-3 mt-3 h-14 shrink-0 rounded-xl lg:mx-4" />;
  }
  if (query.isError) return null;

  const active = (query.data?.data ?? []).filter(
    (assignment) =>
      assignment.status !== "completed" && assignment.status !== "cancelled"
  );
  const overdue = active.filter((assignment) =>
    isBefore(new Date(assignment.dueAt), now)
  ).length;
  const today = active.filter((assignment) =>
    isToday(new Date(assignment.dueAt))
  ).length;
  const comingUp = active.length - overdue - today;

  return (
    <section
      className="mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 shadow-sm lg:mx-4"
      aria-label="Assignment deadlines"
    >
      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
        <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">Academic deadlines</p>
        <p className="truncate text-xs text-muted-foreground">
          {active.length === 0
            ? "Nothing due in the next 7 days"
            : `${overdue} overdue · ${today} today · ${comingUp} coming up`}
        </p>
      </div>
      {overdue > 0 && (
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-destructive"
          aria-label="Overdue assignments"
        />
      )}
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="h-10 shrink-0 px-2 sm:px-3"
      >
        <Link to="/app/assignments">
          <span className="hidden sm:inline">View assignments</span>
          <span className="sm:hidden">View</span>
          <ArrowRight />
        </Link>
      </Button>
    </section>
  );
}
