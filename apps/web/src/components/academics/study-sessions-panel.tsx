import * as React from "react";
import { CalendarClock, Check, MoreHorizontal } from "lucide-react";
import type { Assignment, StudySession } from "@open-sunsama/types";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Skeleton,
} from "@/components/ui";
import {
  useAssignmentStudyProgress,
  useStudySessionAction,
  useStudySessions,
} from "@/hooks/useStudySessions";
import { PlanStudyDialog } from "./plan-study-dialog";
import { LearningWorkspace } from "./learning-workspace";
import {
  formatSessionLocalInput,
  parseSessionLocalInput,
} from "@/lib/study-session-time";

function sessionTime(session: StudySession) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: session.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(session.startAt);
}

export function StudySessionsPanel({
  assignment,
  focusedSessionId,
}: {
  assignment: Assignment;
  focusedSessionId?: string;
}) {
  const sessions = useStudySessions({
    assignmentId: assignment.id,
    limit: 200,
  });
  const progress = useAssignmentStudyProgress(assignment.id);
  const action = useStudySessionAction();
  const [planOpen, setPlanOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StudySession | null>(null);
  const [completing, setCompleting] = React.useState<StudySession | null>(null);
  const [deleting, setDeleting] = React.useState<StudySession | null>(null);
  const [start, setStart] = React.useState("");
  const [actual, setActual] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const assignmentActive =
    assignment.status === "not_started" || assignment.status === "in_progress";
  const deadlinePassed = new Date(assignment.dueAt) <= new Date();
  const canPlan = assignmentActive && !deadlinePassed;
  const ordered = [...(sessions.data?.data ?? [])].sort(
    (a, b) => a.startAt.getTime() - b.startAt.getTime()
  );
  if (focusedSessionId) {
    const selectedIndex = ordered.findIndex(
      (session) => session.id === focusedSessionId
    );
    if (selectedIndex > 0)
      ordered.unshift(ordered.splice(selectedIndex, 1)[0]!);
  }
  const pastDeadline = ordered.filter(
    (session) =>
      session.status === "planned" && session.endAt > new Date(assignment.dueAt)
  ).length;
  const overdueSessions = ordered.filter(
    (session) => session.status === "planned" && session.endAt < new Date()
  ).length;

  const runAction = async (session: StudySession, kind: "skip" | "cancel") => {
    try {
      setError(null);
      await action.mutateAsync({ session, action: kind });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Session changed. Refresh and try again."
      );
    }
  };

  const saveSchedule = async () => {
    if (!editing) return;
    try {
      setError(null);
      const nextStart = parseSessionLocalInput(start, editing.timezone);
      const nextEnd = new Date(
        nextStart.getTime() + editing.plannedMinutes * 60000
      );
      await action.mutateAsync({
        session: editing,
        action: "reschedule",
        schedule: {
          startAt: nextStart.toISOString(),
          endAt: nextEnd.toISOString(),
          plannedMinutes: editing.plannedMinutes,
          timezone: editing.timezone,
        },
      });
      setEditing(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not reschedule. Refresh and try again."
      );
    }
  };

  const saveCompletion = async () => {
    if (!completing) return;
    const minutes = Number(actual);
    if (!Number.isSafeInteger(minutes) || minutes < 0) {
      setError("Enter a valid number of minutes.");
      return;
    }
    try {
      setError(null);
      await action.mutateAsync({
        session: completing,
        action: "complete",
        actualMinutes: minutes,
      });
      setCompleting(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not complete. Refresh and try again."
      );
    }
  };

  const removeSession = async () => {
    if (!deleting) return;
    try {
      setError(null);
      await action.mutateAsync({ session: deleting, action: "delete" });
      setDeleting(null);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not remove. Refresh and try again."
      );
    }
  };

  return (
    <section
      className="mt-4 border-t pt-4"
      aria-label={`Study sessions for ${assignment.title}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Study sessions</h3>
          {progress.isLoading ? (
            <Skeleton className="mt-1 h-4 w-40" />
          ) : progress.data ? (
            <p className="text-sm text-muted-foreground">
              <span className="tabular-nums">
                {progress.data.studiedMinutes}
              </span>
              {progress.data.estimatedMinutes !== null && (
                <>
                  {" "}
                  /{" "}
                  <span className="tabular-nums">
                    {progress.data.estimatedMinutes}
                  </span>
                </>
              )}
              {" min studied"} ·{" "}
              <span className="tabular-nums">
                {progress.data.activePlannedMinutes}
              </span>{" "}
              min planned
            </p>
          ) : null}
        </div>
        {canPlan && (
          <Button className="h-11" onClick={() => setPlanOpen(true)}>
            <CalendarClock /> Plan study
          </Button>
        )}
      </div>
      {progress.isError && (
        <p className="mt-2 text-sm text-destructive">
          Study progress could not be loaded.
        </p>
      )}
      {deadlinePassed && assignmentActive && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          The deadline has passed. Update it before planning new study time.
        </p>
      )}
      {!assignmentActive &&
        ordered.some((session) => session.status === "planned") && (
          <p
            className="mt-3 text-sm text-amber-700 dark:text-amber-400"
            role="status"
          >
            This assignment is {assignment.status}, but planned sessions remain
            on your calendar. Complete, skip, or cancel them individually.
          </p>
        )}
      {pastDeadline > 0 && (
        <p
          className="mt-3 text-sm text-amber-700 dark:text-amber-400"
          role="status"
        >
          {pastDeadline} planned session{pastDeadline === 1 ? " is" : "s are"}{" "}
          after the assignment deadline. Review its time.
        </p>
      )}
      {overdueSessions > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          {overdueSessions} planned session
          {overdueSessions === 1 ? " is" : "s are"} overdue.
        </p>
      )}
      {sessions.isLoading ? (
        <Skeleton className="mt-3 h-16" />
      ) : sessions.isError ? (
        <div className="mt-3 text-sm text-destructive">
          Sessions could not be loaded.{" "}
          <Button variant="link" onClick={() => void sessions.refetch()}>
            Retry
          </Button>
        </div>
      ) : ordered.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          {canPlan
            ? "No sessions yet. Preview a plan to make time for this assignment."
            : "No study sessions for this assignment yet."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {ordered.map((session) => (
            <li
              key={session.id}
              className={`flex flex-wrap items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm ${session.id === focusedSessionId ? "border-primary/60" : ""}`}
            >
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <p className="font-medium">{sessionTime(session)}</p>
                <p className="text-xs text-muted-foreground">
                  {session.plannedMinutes} min · {session.timezone}
                </p>
              </div>
              <Badge
                variant={session.status === "completed" ? "success" : "outline"}
              >
                {session.status}
              </Badge>
              {session.id === focusedSessionId && (
                <span className="text-xs text-primary">Selected</span>
              )}
              {session.status === "completed" && (
                <span className="text-xs tabular-nums text-muted-foreground">
                  {session.actualMinutes ?? 0} min studied
                </span>
              )}
              <LearningWorkspace
                target={{ studySessionId: session.id }}
                label={`Study session · ${sessionTime(session)}`}
                triggerLabel="Materials & focus"
              />
              {session.status === "planned" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setCompleting(session);
                    setActual(String(session.plannedMinutes));
                    setError(null);
                  }}
                >
                  <Check /> Complete
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10"
                    aria-label={`Actions for ${sessionTime(session)}`}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {assignmentActive &&
                    (session.status === "planned" ||
                      session.status === "skipped") && (
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(session);
                          setStart(
                            formatSessionLocalInput(
                              session.startAt,
                              session.timezone
                            )
                          );
                          setError(null);
                        }}
                      >
                        Reschedule
                      </DropdownMenuItem>
                    )}
                  {session.status === "planned" && (
                    <DropdownMenuItem
                      onClick={() => void runAction(session, "skip")}
                    >
                      Skip
                    </DropdownMenuItem>
                  )}
                  {session.status === "planned" && (
                    <DropdownMenuItem
                      onClick={() => void runAction(session, "cancel")}
                    >
                      Cancel
                    </DropdownMenuItem>
                  )}
                  {session.status !== "planned" && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleting(session);
                        setError(null);
                      }}
                    >
                      Remove history
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
      {error && !editing && !completing && !deleting && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <PlanStudyDialog
        assignment={assignment}
        open={planOpen}
        onOpenChange={setPlanOpen}
      />
      <Dialog
        open={!!editing}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule study</DialogTitle>
            <DialogDescription>
              Move this session in {editing?.timezone}. Its length stays the
              same. Times that do not exist or occur twice during daylight
              saving changes are unavailable.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="session-start">New start</Label>
          <Input
            id="session-start"
            type="datetime-local"
            className="h-11"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={action.isPending}
              onClick={() => void saveSchedule()}
            >
              Save time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!completing}
        onOpenChange={(open) => !open && setCompleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete study session</DialogTitle>
            <DialogDescription>
              Record the time you actually studied.
            </DialogDescription>
          </DialogHeader>
          <Label htmlFor="actual-minutes">Minutes studied</Label>
          <Input
            id="actual-minutes"
            type="number"
            min="0"
            step="1"
            className="h-11"
            value={actual}
            onChange={(event) => setActual(event.target.value)}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleting(null)}>
              Cancel
            </Button>
            <Button
              disabled={action.isPending}
              onClick={() => void saveCompletion()}
            >
              Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this session?</DialogTitle>
            <DialogDescription>
              This removes it from your study history and progress. It cannot be
              restored here.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Keep session
            </Button>
            <Button
              variant="destructive"
              disabled={action.isPending}
              onClick={() => void removeSession()}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
