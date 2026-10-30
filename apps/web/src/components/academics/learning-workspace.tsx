import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenText,
  CheckCircle2,
  Circle,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  LearningResource,
  LearningTarget,
  StudyNote,
  StudyReminder,
} from "@open-sunsama/types";
import type { SyncMutationInput } from "@open-sunsama/api-client";
import { getApi } from "@/lib/api";
import { learningKeys } from "@/lib/query-keys";
import { toast } from "@/hooks/use-toast";
import { useAccountSync } from "@/hooks/useAccountSync";
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { QuizWorkspace } from "./quiz-workspace";

type LearningActionInput =
  | (() => Promise<unknown>)
  | { run: () => Promise<unknown>; offline?: SyncMutationInput };

function useLearningAction(queryKey: readonly string[]) {
  const client = useQueryClient();
  const { queueMutation } = useAccountSync();
  return useMutation({
    mutationFn: (input: LearningActionInput) => {
      const run = typeof input === "function" ? input : input.run;
      const offline = typeof input === "function" ? undefined : input.offline;
      if (offline && typeof navigator !== "undefined" && !navigator.onLine) {
        queueMutation(offline);
        return Promise.resolve(null);
      }
      return run();
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey });
    },
    onError: (error) =>
      toast({
        variant: "destructive",
        title: "Could not save",
        description: error instanceof Error ? error.message : "Try again.",
      }),
  });
}

function sameTarget(row: LearningTarget, target: LearningTarget) {
  return Object.entries(target).every(
    ([key, value]) => !value || row[key as keyof LearningTarget] === value
  );
}

export function LearningWorkspace({
  target,
  label,
  triggerLabel = "Learning materials",
}: {
  target: LearningTarget;
  label: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-11">
          <BookOpenText aria-hidden="true" /> {triggerLabel}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto px-4 pb-12 pt-8 sm:max-w-2xl sm:px-6">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{label}</SheetTitle>
          <SheetDescription>
            Keep material, notes and knowledge checks beside your study work.
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="resources" className="mt-6">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1 [scrollbar-width:none]">
            {(
              [
                ["resources", "Resources"],
                ["notes", "Notes"],
                ["reminders", "Reminders"],
                ["focus", "Focus"],
                ...(target.studySessionId ? [] : [["quizzes", "Quizzes"]]),
              ] as [string, string][]
            ).map(([value, title]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-10 shrink-0 px-3"
              >
                {title}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="resources">
            <ResourcesTab target={target} />
          </TabsContent>
          <TabsContent value="notes">
            <NotesTab target={target} />
          </TabsContent>
          <TabsContent value="reminders">
            <RemindersTab target={target} />
          </TabsContent>
          <TabsContent value="focus">
            <FocusTab target={target} />
          </TabsContent>
          {!target.studySessionId && (
            <TabsContent value="quizzes">
              <QuizWorkspace target={target} />
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function ResourcesTab({ target }: { target: LearningTarget }) {
  const api = getApi().resources;
  const query = useQuery({
    queryKey: [...learningKeys.resources, target],
    queryFn: () => api.list(target),
  });
  const all = useQuery({
    queryKey: [...learningKeys.resources, "all"],
    queryFn: () => api.list(),
  });
  const action = useLearningAction(learningKeys.resources);
  const [type, setType] = React.useState<"youtube" | "web">("youtube");
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [existingId, setExistingId] = React.useState("");
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [renameTitle, setRenameTitle] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);
  const saveLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const resourceId = crypto.randomUUID();
    await action.mutateAsync({
      run: () =>
        api.create({
          type,
          title: title.trim(),
          url: url.trim(),
          link: target,
        }),
      offline: {
        clientMutationId: crypto.randomUUID(),
        entityType: "resource",
        operation: "create",
        entityId: resourceId,
        payload: {
          type,
          title: title.trim(),
          url: url.trim(),
          link: target,
        },
      },
    });
    setTitle("");
    setUrl("");
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    await action.mutateAsync(() => api.upload(file, target));
    if (fileRef.current) fileRef.current.value = "";
  };
  const openResource = async (resource: LearningResource) => {
    if (resource.type !== "file") {
      if (resource.url)
        window.open(resource.url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const blob = await api.download(resource.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = resource.filename ?? resource.title;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "File unavailable",
        description: error instanceof Error ? error.message : "Try again.",
      });
    }
  };
  const listed = query.data ?? [];
  const available = (all.data ?? []).filter(
    (r) => !listed.some((shown) => shown.id === r.id)
  );
  return (
    <div className="space-y-5 pt-4">
      <form
        onSubmit={(event) => void saveLink(event)}
        className="space-y-3 rounded-xl border p-4"
      >
        <h3 className="font-medium">Add a link</h3>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={type === "youtube"}
              onChange={() => setType("youtube")}
            />{" "}
            YouTube
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={type === "web"}
              onChange={() => setType("web")}
            />{" "}
            Website
          </label>
        </div>
        <Label htmlFor="learning-resource-title">Title</Label>
        <Input
          id="learning-resource-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          maxLength={500}
          className="h-11"
        />
        <Label htmlFor="learning-resource-url">Link</Label>
        <Input
          id="learning-resource-url"
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          required
          className="h-11"
        />
        <Button disabled={action.isPending} type="submit">
          <Plus aria-hidden="true" /> Add resource
        </Button>
      </form>
      <div className="rounded-xl border p-4">
        <Label htmlFor="learning-resource-file" className="mb-2 block">
          Upload a file (up to 10 MB)
        </Label>
        <Input
          ref={fileRef}
          id="learning-resource-file"
          type="file"
          className="h-11"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,video/mp4,video/webm,video/quicktime"
          onChange={(event) => void upload(event.target.files?.[0])}
          disabled={action.isPending}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          File storage must be enabled on this StudyOS server. Your file is not
          sent to AI.
        </p>
      </div>
      {available.length > 0 && (
        <div className="flex gap-2">
          <select
            aria-label="Existing resource"
            value={existingId}
            onChange={(event) => setExistingId(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Use an existing resource</option>
            {available.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={!existingId || action.isPending}
            onClick={() =>
              void action
                .mutateAsync(() => api.link(existingId, target))
                .then(() => setExistingId(""))
            }
          >
            Attach
          </Button>
        </div>
      )}
      <div aria-live="polite" className="space-y-2">
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading resources…</p>
        ) : query.isError ? (
          <p role="alert">
            Resources could not be loaded.{" "}
            <Button variant="link" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </p>
        ) : listed.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No resources yet. Add a link or file you use for this work.
          </p>
        ) : (
          listed.map((resource) => (
            <div
              key={resource.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{resource.title}</p>
                <p className="text-xs text-muted-foreground">
                  {resource.type === "youtube"
                    ? "YouTube"
                    : resource.type === "file"
                      ? "File"
                      : "Website"}
                  {resource.completedAt ? " · Completed" : ""}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11"
                aria-label={`Open ${resource.title}`}
                onClick={() => void openResource(resource)}
              >
                <ExternalLink aria-hidden="true" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-11"
                onClick={() => {
                  setRenaming(resource.id);
                  setRenameTitle(resource.title);
                }}
              >
                Rename
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11"
                aria-label={
                  resource.completedAt
                    ? `Mark ${resource.title} unfinished`
                    : `Mark ${resource.title} complete`
                }
                onClick={() =>
                  void action.mutateAsync({
                    run: () =>
                      api.update(
                        resource.id,
                        { completed: !resource.completedAt },
                        resource.revision
                      ),
                    offline: {
                      clientMutationId: crypto.randomUUID(),
                      entityType: "resource",
                      operation: "update",
                      entityId: resource.id,
                      expectedRevision: resource.revision,
                      payload: { completed: !resource.completedAt },
                    },
                  })
                }
              >
                {resource.completedAt ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <Circle aria-hidden="true" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11"
                aria-label={`Remove ${resource.title}`}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove ${resource.title} from all study work?`
                    )
                  )
                    void action.mutateAsync({
                      run: () => api.delete(resource.id, resource.revision),
                      offline: {
                        clientMutationId: crypto.randomUUID(),
                        entityType: "resource",
                        operation: "delete",
                        entityId: resource.id,
                        expectedRevision: resource.revision,
                        payload: {},
                      },
                    });
                }}
              >
                <Trash2 aria-hidden="true" />
              </Button>
              {renaming === resource.id && (
                <form
                  className="flex w-full gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action
                      .mutateAsync({
                        run: () =>
                          api.update(
                            resource.id,
                            { title: renameTitle.trim() },
                            resource.revision
                          ),
                        offline: {
                          clientMutationId: crypto.randomUUID(),
                          entityType: "resource",
                          operation: "update",
                          entityId: resource.id,
                          expectedRevision: resource.revision,
                          payload: { title: renameTitle.trim() },
                        },
                      })
                      .then(() => setRenaming(null));
                  }}
                >
                  <Input
                    aria-label={`New title for ${resource.title}`}
                    className="h-11 min-w-0 flex-1"
                    value={renameTitle}
                    onChange={(event) => setRenameTitle(event.target.value)}
                    required
                    maxLength={500}
                    autoFocus
                  />
                  <Button type="submit" disabled={action.isPending}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRenaming(null)}
                  >
                    Cancel
                  </Button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NotesTab({ target }: { target: LearningTarget }) {
  const api = getApi().notes;
  const query = useQuery({
    queryKey: [...learningKeys.notes, target],
    queryFn: () => api.list(target),
  });
  const action = useLearningAction(learningKeys.notes);
  const [editing, setEditing] = React.useState<StudyNote | null>(null);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const reset = () => {
    setEditing(null);
    setTitle("");
    setBody("");
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const noteId = editing?.id ?? crypto.randomUUID();
    await action.mutateAsync({
      run: () =>
        editing
          ? api.update(editing.id, { title, body }, editing.revision)
          : api.create({ title, body, ...target }),
      offline: {
        clientMutationId: crypto.randomUUID(),
        entityType: "study-note",
        operation: editing ? "update" : "create",
        entityId: noteId,
        ...(editing ? { expectedRevision: editing.revision } : {}),
        payload: { title, body, ...target },
      },
    });
    reset();
  };
  return (
    <div className="space-y-4 pt-4">
      <form
        onSubmit={(event) => void save(event)}
        className="space-y-3 rounded-xl border p-4"
      >
        <h3 className="font-medium">
          {editing ? "Edit note" : "Write a note"}
        </h3>
        <Label htmlFor="study-note-title">Title</Label>
        <Input
          id="study-note-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={300}
          required
          className="h-11"
        />
        <Label htmlFor="study-note-body">Note</Label>
        <textarea
          id="study-note-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={6}
          maxLength={100000}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <div className="flex gap-2">
          <Button type="submit" disabled={action.isPending}>
            {editing ? "Save note" : "Add note"}
          </Button>
          {editing && (
            <Button variant="outline" type="button" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
      </form>
      {query.isLoading ? (
        <p>Loading notes…</p>
      ) : query.isError ? (
        <p role="alert">
          Notes could not be loaded.{" "}
          <Button variant="link" onClick={() => void query.refetch()}>
            Try again
          </Button>
        </p>
      ) : !query.data?.length ? (
        <p className="text-sm text-muted-foreground">
          No notes yet. Capture a quick idea while it is fresh.
        </p>
      ) : (
        query.data.map((note) => (
          <article key={note.id} className="rounded-xl border p-4">
            <h3 className="font-medium">{note.title}</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">
              {note.body}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(note);
                  setTitle(note.title);
                  setBody(note.body);
                }}
              >
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Delete note ${note.title}?`))
                    void action.mutateAsync({
                      run: () => api.delete(note.id, note.revision),
                      offline: {
                        clientMutationId: crypto.randomUUID(),
                        entityType: "study-note",
                        operation: "delete",
                        entityId: note.id,
                        expectedRevision: note.revision,
                        payload: {},
                      },
                    });
                }}
              >
                Delete
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function RemindersTab({ target }: { target: LearningTarget }) {
  const api = getApi().reminders;
  const query = useQuery({
    queryKey: [...learningKeys.reminders, target],
    queryFn: () => api.list("pending"),
    refetchInterval: 60_000,
  });
  const action = useLearningAction(learningKeys.reminders);
  const [title, setTitle] = React.useState("");
  const [time, setTime] = React.useState("");
  const reminders = (query.data ?? []).filter((row) => sameTarget(row, target));
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return;
    await action.mutateAsync({
      run: () => api.create({ title, remindAt: date.toISOString(), ...target }),
      offline: {
        clientMutationId: crypto.randomUUID(),
        entityType: "study-reminder",
        operation: "create",
        entityId: crypto.randomUUID(),
        payload: { title, remindAt: date.toISOString(), ...target },
      },
    });
    setTitle("");
    setTime("");
  };
  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        These are in-app reminders while StudyOS is open. They are not Android
        Clock alarms.
      </p>
      <form
        onSubmit={(event) => void save(event)}
        className="space-y-3 rounded-xl border p-4"
      >
        <Label htmlFor="reminder-title">Remind me to</Label>
        <Input
          id="reminder-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Revise this chapter"
          maxLength={300}
          required
          className="h-11"
        />
        <Label htmlFor="reminder-time">When</Label>
        <Input
          id="reminder-time"
          type="datetime-local"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          required
          className="h-11"
        />
        <Button type="submit" disabled={action.isPending}>
          Set reminder
        </Button>
      </form>
      {query.isError ? (
        <p role="alert">Reminders could not be loaded.</p>
      ) : reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pending reminders for this work.
        </p>
      ) : (
        reminders.map((reminder: StudyReminder) => (
          <div key={reminder.id} className="rounded-xl border p-3">
            <p className="font-medium">{reminder.title}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(reminder.remindAt).toLocaleString()}
              {new Date(reminder.remindAt) <= new Date() ? " · Due now" : ""}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  void action.mutateAsync({
                    run: () => api.dismiss(reminder.id, reminder.revision),
                    offline: {
                      clientMutationId: crypto.randomUUID(),
                      entityType: "study-reminder",
                      operation: "update",
                      entityId: reminder.id,
                      expectedRevision: reminder.revision,
                      payload: { state: "dismissed" },
                    },
                  })
                }
              >
                Dismiss
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void action.mutateAsync({
                    run: () => api.cancel(reminder.id, reminder.revision),
                    offline: {
                      clientMutationId: crypto.randomUUID(),
                      entityType: "study-reminder",
                      operation: "delete",
                      entityId: reminder.id,
                      expectedRevision: reminder.revision,
                      payload: {},
                    },
                  })
                }
              >
                Cancel
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function FocusTab({ target }: { target: LearningTarget }) {
  const api = getApi().focus;
  const query = useQuery({
    queryKey: learningKeys.focus,
    queryFn: api.list,
    refetchInterval: 60_000,
  });
  const action = useLearningAction(learningKeys.focus);
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const active = query.data?.find((row) => row.state === "active");
  const here = active && sameTarget(active, target);
  const history = (query.data ?? []).filter(
    (row) => row.state !== "active" && sameTarget(row, target)
  );
  const seconds = active
    ? Math.max(
        0,
        Math.floor((now - new Date(active.startedAt).getTime()) / 1000)
      )
    : 0;
  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-muted-foreground">
        Focus time is recorded separately from Assignment study progress. You
        can stop at any time.
      </p>
      {active ? (
        <div className="rounded-xl border p-5">
          <p className="text-sm font-medium">
            {here
              ? "Focus in progress"
              : "Focus is active on another study item"}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              disabled={action.isPending}
              onClick={() =>
                void action.mutateAsync({
                  run: () => api.finish(active.id, active.revision),
                  offline: {
                    clientMutationId: crypto.randomUUID(),
                    entityType: "focus-session",
                    operation: "update",
                    entityId: active.id,
                    expectedRevision: active.revision,
                    payload: { action: "finish" },
                  },
                })
              }
            >
              Finish focus
            </Button>
            <Button
              variant="outline"
              disabled={action.isPending}
              onClick={() =>
                void action.mutateAsync({
                  run: () => api.cancel(active.id, active.revision),
                  offline: {
                    clientMutationId: crypto.randomUUID(),
                    entityType: "focus-session",
                    operation: "update",
                    entityId: active.id,
                    expectedRevision: active.revision,
                    payload: { action: "cancel" },
                  },
                })
              }
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          className="h-11"
          disabled={action.isPending}
          onClick={() =>
            void action.mutateAsync({
              run: () => api.start(target),
              offline: {
                clientMutationId: crypto.randomUUID(),
                entityType: "focus-session",
                operation: "create",
                entityId: crypto.randomUUID(),
                payload: target,
              },
            })
          }
        >
          Start focus
        </Button>
      )}
      {history.length > 0 && (
        <div>
          <h3 className="mb-2 font-medium">Recent focus</h3>
          {history.slice(0, 10).map((session) => (
            <p key={session.id} className="border-t py-2 text-sm">
              {new Date(session.startedAt).toLocaleString()} ·{" "}
              {Math.floor((session.durationSeconds ?? 0) / 60)} min ·{" "}
              {session.state}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
