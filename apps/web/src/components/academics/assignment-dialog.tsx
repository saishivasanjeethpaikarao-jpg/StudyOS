import * as React from "react";
import type {
  Assignment,
  CreateAssignmentInput,
  Subject,
  UpdateAssignmentInput,
} from "@open-sunsama/types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import {
  assignmentDraft,
  assignmentStatusLabel,
  createAssignmentInput,
  getAcademicErrorMessage,
  priorityLabel,
  updateAssignmentInput,
} from "./academic-utils";

interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: Assignment;
  subjects: Subject[];
  initialSubjectId?: string;
  onSubmit: (
    input: CreateAssignmentInput | UpdateAssignmentInput
  ) => Promise<unknown>;
  pending?: boolean;
}

export function AssignmentDialog({
  open,
  onOpenChange,
  assignment,
  subjects,
  initialSubjectId,
  onSubmit,
  pending,
}: AssignmentDialogProps) {
  const [draft, setDraft] = React.useState(() => assignmentDraft(assignment));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const next = assignmentDraft(assignment);
      if (!assignment && initialSubjectId) next.subjectId = initialSubjectId;
      setDraft(next);
      setError(null);
    }
  }, [assignment, initialSubjectId, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError("Enter an assignment title.");
      return;
    }
    if (!draft.dueAt || Number.isNaN(new Date(draft.dueAt).getTime())) {
      setError("Choose a valid due date and time.");
      return;
    }
    if (
      draft.estimatedMinutes &&
      (!Number.isInteger(Number(draft.estimatedMinutes)) ||
        Number(draft.estimatedMinutes) < 1)
    ) {
      setError("Estimated effort must be a whole number of minutes.");
      return;
    }
    try {
      await onSubmit(
        assignment ? updateAssignmentInput(draft) : createAssignmentInput(draft)
      );
      onOpenChange(false);
    } catch (submitError) {
      setError(getAcademicErrorMessage(submitError));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {assignment ? "Edit assignment" : "Add an assignment"}
            </DialogTitle>
            <DialogDescription>
              Capture the deadline now. You can plan the work as tasks later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="assignment-title">Title</Label>
              <Input
                id="assignment-title"
                autoFocus
                required
                maxLength={200}
                className="h-11"
                placeholder="e.g. Submit lab report"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignment-subject">Subject</Label>
                <Select
                  value={draft.subjectId || "none"}
                  onValueChange={(subjectId) =>
                    setDraft((current) => ({
                      ...current,
                      subjectId: subjectId === "none" ? "" : subjectId,
                    }))
                  }
                >
                  <SelectTrigger id="assignment-subject" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No subject</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                        {subject.archivedAt ? " (archived)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-due">Due</Label>
                <Input
                  id="assignment-due"
                  type="datetime-local"
                  required
                  className="h-11"
                  value={draft.dueAt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      dueAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignment-priority">Priority</Label>
                <Select
                  value={draft.priority}
                  onValueChange={(priority) =>
                    setDraft((current) => ({
                      ...current,
                      priority: priority as typeof current.priority,
                    }))
                  }
                >
                  <SelectTrigger id="assignment-priority" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["P0", "P1", "P2", "P3"] as const).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priorityLabel(priority)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignment-effort">
                  Estimated effort (minutes)
                </Label>
                <Input
                  id="assignment-effort"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={10080}
                  className="h-11"
                  placeholder="e.g. 90"
                  value={draft.estimatedMinutes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      estimatedMinutes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {assignment && (
              <div className="space-y-2">
                <Label htmlFor="assignment-status">Status</Label>
                <Select
                  value={draft.status}
                  onValueChange={(status) =>
                    setDraft((current) => ({
                      ...current,
                      status: status as typeof current.status,
                    }))
                  }
                >
                  <SelectTrigger id="assignment-status" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "not_started",
                        "in_progress",
                        "completed",
                        "cancelled",
                      ] as const
                    ).map((status) => (
                      <SelectItem key={status} value={status}>
                        {assignmentStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="assignment-description">
                Description (optional)
              </Label>
              <Textarea
                id="assignment-description"
                maxLength={5000}
                placeholder="Instructions, rubric, or helpful context"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending
                ? "Saving…"
                : assignment
                  ? "Save changes"
                  : "Add assignment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteAssignmentDialogProps {
  assignment: Assignment | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<unknown>;
  pending?: boolean;
}

export function DeleteAssignmentDialog({
  assignment,
  onOpenChange,
  onConfirm,
  pending,
}: DeleteAssignmentDialogProps) {
  return (
    <Dialog open={Boolean(assignment)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this assignment?</DialogTitle>
          <DialogDescription>
            “{assignment?.title}” will be removed from your workspace. This
            cannot be undone from the app.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-11"
            disabled={pending}
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
          >
            {pending ? "Deleting…" : "Delete assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
