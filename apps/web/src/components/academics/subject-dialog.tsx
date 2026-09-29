import * as React from "react";
import type { Subject } from "@open-sunsama/types";
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
import { cn } from "@/lib/utils";
import {
  createSubjectInput,
  getAcademicErrorMessage,
  subjectColors,
  subjectDraft,
  subjectIcons,
} from "./academic-utils";

interface SubjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject?: Subject;
  onSubmit: (input: ReturnType<typeof createSubjectInput>) => Promise<unknown>;
  pending?: boolean;
}

export function SubjectDialog({
  open,
  onOpenChange,
  subject,
  onSubmit,
  pending,
}: SubjectDialogProps) {
  const [draft, setDraft] = React.useState(() => subjectDraft(subject));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setDraft(subjectDraft(subject));
      setError(null);
    }
  }, [open, subject]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Enter a subject name.");
      return;
    }
    try {
      await onSubmit(createSubjectInput(draft));
      onOpenChange(false);
    } catch (submitError) {
      setError(getAcademicErrorMessage(submitError));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {subject ? "Edit subject" : "Add a subject"}
            </DialogTitle>
            <DialogDescription>
              Group assignments by the course or area you are studying.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-5">
            <div className="space-y-2">
              <Label htmlFor="subject-name">Name</Label>
              <Input
                id="subject-name"
                autoFocus
                required
                maxLength={120}
                className="h-11"
                placeholder="e.g. Mathematics"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject-description">
                Description (optional)
              </Label>
              <Textarea
                id="subject-description"
                maxLength={1000}
                placeholder="Course details, teacher, or semester"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject-icon">Icon</Label>
                <Select
                  value={draft.icon}
                  onValueChange={(icon) =>
                    setDraft((current) => ({ ...current, icon }))
                  }
                >
                  <SelectTrigger id="subject-icon" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectIcons.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-[13px] font-medium">Color</legend>
                <div className="flex flex-wrap gap-2">
                  {subjectColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Use color ${color}`}
                      aria-pressed={draft.color === color}
                      className={cn(
                        "h-11 w-11 rounded-full border-4 border-background shadow-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        draft.color === color && "ring-2 ring-foreground/60"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() =>
                        setDraft((current) => ({ ...current, color }))
                      }
                    />
                  ))}
                </div>
              </fieldset>
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
              {pending ? "Saving…" : subject ? "Save changes" : "Add subject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteSubjectDialogProps {
  subject: Subject | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<unknown>;
  pending?: boolean;
}

export function DeleteSubjectDialog({
  subject,
  onOpenChange,
  onConfirm,
  pending,
}: DeleteSubjectDialogProps) {
  return (
    <Dialog open={Boolean(subject)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {subject?.name}?</DialogTitle>
          <DialogDescription>
            The subject will be permanently deleted. Its assignments will be
            kept and shown without a subject.
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
            {pending ? "Deleting…" : "Delete subject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
