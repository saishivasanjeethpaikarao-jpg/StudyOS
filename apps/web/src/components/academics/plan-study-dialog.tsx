import * as React from "react";
import { addDays, format, startOfDay } from "date-fns";
import { isApiError } from "@open-sunsama/api-client";
import type { Assignment, StudyPlanInput } from "@open-sunsama/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/components/ui";
import {
  useConfirmStudyPlan,
  usePreviewStudyPlan,
} from "@/hooks/useStudySessions";

function initialDates(dueAt: Date) {
  const today = startOfDay(new Date());
  const lastPreferredDay = startOfDay(addDays(dueAt, -1));
  return {
    startDate: format(today, "yyyy-MM-dd"),
    endDate: format(
      lastPreferredDay < today ? today : lastPreferredDay,
      "yyyy-MM-dd"
    ),
  };
}

export function PlanStudyDialog({
  assignment,
  open,
  onOpenChange,
}: {
  assignment: Assignment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [dates, setDates] = React.useState(() =>
    initialDates(new Date(assignment.dueAt))
  );
  const [target, setTarget] = React.useState(
    String(assignment.estimatedMinutes ?? "")
  );
  const [length, setLength] = React.useState("40");
  const [error, setError] = React.useState<string | null>(null);
  const mutationId = React.useRef<string | null>(null);
  const preview = usePreviewStudyPlan();
  const confirm = useConfirmStudyPlan();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  React.useEffect(() => {
    if (open) {
      setDates(initialDates(new Date(assignment.dueAt)));
      setTarget(String(assignment.estimatedMinutes ?? ""));
      setLength("40");
      setError(null);
      mutationId.current = null;
      preview.reset();
      confirm.reset();
    }
    // Reset only when opening or switching assignments, not on a parent refetch.
  }, [open, assignment.id]);

  const invalidatePreview = () => {
    preview.reset();
    mutationId.current = null;
    setError(null);
  };

  const handlePreview = async (event: React.FormEvent) => {
    event.preventDefault();
    const targetMinutes = Number(target);
    const preferredSessionMinutes = Number(length);
    if (
      !Number.isSafeInteger(targetMinutes) ||
      targetMinutes < 1 ||
      !Number.isSafeInteger(preferredSessionMinutes) ||
      preferredSessionMinutes < 1
    ) {
      setError(
        "Enter whole minutes greater than zero for effort and session length."
      );
      return;
    }
    if (!dates.startDate || !dates.endDate || dates.endDate < dates.startDate) {
      setError("Choose a valid start and end date.");
      return;
    }
    const input: StudyPlanInput = {
      targetMinutes,
      startDate: dates.startDate,
      endDate: dates.endDate,
      preferredSessionMinutes,
      timezone,
    };
    try {
      setError(null);
      await preview.mutateAsync({ assignmentId: assignment.id, input });
      mutationId.current = crypto.randomUUID();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not preview this plan."
      );
    }
  };

  const handleConfirm = async () => {
    const plan = preview.data;
    if (!plan?.confirmable) return;
    try {
      setError(null);
      await confirm.mutateAsync({
        assignmentId: assignment.id,
        input: {
          clientMutationId:
            mutationId.current ?? (mutationId.current = crypto.randomUUID()),
          assignmentRevision: plan.assignmentRevision,
          availabilityFingerprint: plan.availabilityFingerprint,
          normalizedInput: plan.normalizedInput,
          proposedSlots: plan.proposedSlots,
        },
      });
      onOpenChange(false);
    } catch (cause) {
      if (isApiError(cause) && cause.status === 409) {
        preview.reset();
        mutationId.current = null;
        setError(
          "Your assignment or calendar changed. Preview the plan again before confirming."
        );
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not confirm this plan. Preview it again."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Plan study for {assignment.title}</DialogTitle>
          <DialogDescription>
            Preview available study times before adding anything to your
            calendar.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => void handlePreview(event)}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="study-total">Total effort (minutes)</Label>
              <Input
                id="study-total"
                type="number"
                min="1"
                step="1"
                className="h-11"
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  invalidatePreview();
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="study-length">Preferred session (minutes)</Label>
              <Input
                id="study-length"
                type="number"
                min="1"
                step="1"
                className="h-11"
                value={length}
                onChange={(event) => {
                  setLength(event.target.value);
                  invalidatePreview();
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="study-start">From</Label>
              <Input
                id="study-start"
                type="date"
                className="h-11"
                value={dates.startDate}
                onChange={(event) => {
                  setDates((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }));
                  invalidatePreview();
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="study-end">Through</Label>
              <Input
                id="study-end"
                type="date"
                className="h-11"
                value={dates.endDate}
                onChange={(event) => {
                  setDates((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }));
                  invalidatePreview();
                }}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Times use {timezone}. Existing calendar blocks are treated as busy.
          </p>
          <Button
            type="submit"
            variant="outline"
            className="h-11"
            disabled={preview.isPending || confirm.isPending}
          >
            {preview.isPending ? "Finding time…" : "Preview plan"}
          </Button>
        </form>
        {preview.data && (
          <section
            aria-label="Study plan preview"
            className="space-y-3 border-t pt-4"
          >
            <div>
              <p className="font-medium">Your proposed sessions</p>
              <p className="text-sm text-muted-foreground">
                {preview.data.plannedMinutes} min planned ·{" "}
                {preview.data.unscheduledMinutes} min unscheduled
              </p>
            </div>
            {preview.data.proposedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No study time is needed or available in this range.
              </p>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {preview.data.proposedSlots.map((slot) => (
                  <li
                    key={`${slot.startAt}-${slot.endAt}`}
                    className="flex justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span>
                      {format(new Date(slot.startAt), "EEE, MMM d · h:mm a")}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {slot.plannedMinutes} min
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!preview.data.confirmable && (
              <p
                className="text-sm text-amber-700 dark:text-amber-400"
                role="status"
              >
                This range cannot fit all the remaining work. Try more days or
                shorter sessions.
              </p>
            )}
          </section>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!preview.data?.confirmable || confirm.isPending}
          >
            {confirm.isPending ? "Adding sessions…" : "Confirm plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
