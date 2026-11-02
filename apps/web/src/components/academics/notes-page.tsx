import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  FileEdit,
  FileText,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { StudyNote, Subject } from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { learningKeys } from "@/lib/query-keys";
import { useSubjects } from "@/hooks/useSubjects";
import { toast } from "@/hooks/use-toast";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/components/ui";

export function NotesPage() {
  const client = useQueryClient();
  const { data: activeSubjects = [] } = useSubjects({ archived: false });
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);

  // Active note editor state
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [noteSubjectId, setNoteSubjectId] = React.useState<string>("");
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "idle">("idle");
  const saveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const targetFilter = React.useMemo(() => {
    if (selectedSubjectId && selectedSubjectId !== "all") {
      return { subjectId: selectedSubjectId };
    }
    return {};
  }, [selectedSubjectId]);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: [...learningKeys.notes, targetFilter],
    queryFn: () => getApi().notes.list(targetFilter),
  });

  const activeNote = React.useMemo(() => {
    if (!selectedNoteId) return notes[0] ?? null;
    return notes.find((n) => n.id === selectedNoteId) ?? notes[0] ?? null;
  }, [notes, selectedNoteId]);

  // Sync editor fields when active note changes
  React.useEffect(() => {
    if (activeNote) {
      setSelectedNoteId(activeNote.id);
      setTitle(activeNote.title);
      setBody(activeNote.body);
      setNoteSubjectId(activeNote.subjectId ?? "");
      setSaveStatus("saved");
    } else {
      setSelectedNoteId(null);
      setTitle("");
      setBody("");
      setNoteSubjectId("");
      setSaveStatus("idle");
    }
  }, [activeNote?.id]);

  const subjectMap = React.useMemo(
    () => new Map(activeSubjects.map((s) => [s.id, s])),
    [activeSubjects]
  );

  const filteredNotes = React.useMemo(() => {
    return notes.filter((n) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesBody = n.body.toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody) return false;
      }
      return true;
    });
  }, [notes, searchQuery]);

  const createNoteMutation = useMutation({
    mutationFn: async () => {
      const newNote = await getApi().notes.create({
        title: "Untitled Study Note",
        body: "",
        subjectId: selectedSubjectId !== "all" ? selectedSubjectId : null,
      });
      return newNote;
    },
    onSuccess: (newNote) => {
      void client.invalidateQueries({ queryKey: learningKeys.notes });
      setSelectedNoteId(newNote.id);
      toast({ title: "Note created" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not create note",
        description: err instanceof Error ? err.message : "Try again.",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (note: StudyNote) => {
      await getApi().notes.delete(note.id, note.revision);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: learningKeys.notes });
      setSelectedNoteId(null);
      toast({ title: "Note deleted" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not delete note",
        description: err instanceof Error ? err.message : "Try again.",
      });
    },
  });

  // Autosave handler
  const scheduleAutosave = React.useCallback(
    (newTitle: string, newBody: string, newSubjectId: string) => {
      if (!activeNote) return;
      setSaveStatus("saving");
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await getApi().notes.update(
            activeNote.id,
            {
              title: newTitle.trim() || "Untitled Note",
              body: newBody,
              subjectId: newSubjectId || null,
            },
            activeNote.revision
          );
          await client.invalidateQueries({ queryKey: learningKeys.notes });
          setSaveStatus("saved");
        } catch {
          setSaveStatus("idle");
        }
      }, 800);
    },
    [activeNote, client]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Capture lecture summaries, formula sheets, and study session notes with autosave.
          </p>
        </div>
        <Button onClick={() => createNoteMutation.mutate()} disabled={createNoteMutation.isPending}>
          <Plus className="mr-2 h-4 w-4" /> New Note
        </Button>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Sidebar: Notes list */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {activeSubjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1 rounded-lg border bg-card p-2 max-h-[700px]">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No notes found.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredNotes.map((note) => {
                  const isSelected = activeNote?.id === note.id;
                  const subject = note.subjectId ? subjectMap.get(note.subjectId) : null;
                  return (
                    <button
                      key={note.id}
                      onClick={() => setSelectedNoteId(note.id)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        isSelected
                          ? "bg-accent text-accent-foreground border-l-4 border-primary font-medium"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium truncate">
                          {note.title || "Untitled Note"}
                        </span>
                        {subject && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded border shrink-0"
                            style={{
                              borderColor: subject.color || undefined,
                              color: subject.color || undefined,
                            }}
                          >
                            {subject.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {note.body.replace(/[#*`]/g, "") || "Empty note"}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Pane: Note Editor */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col">
          {activeNote ? (
            <Card className="flex-1 flex flex-col shadow-sm">
              <CardHeader className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      scheduleAutosave(e.target.value, body, noteSubjectId);
                    }}
                    placeholder="Note title..."
                    className="text-lg font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      {saveStatus === "saving" && (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                        </>
                      )}
                      {saveStatus === "saved" && (
                        <>
                          <Check className="h-3 w-3 text-green-500" /> Saved
                        </>
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-8"
                      onClick={() => deleteNoteMutation.mutate(activeNote)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Label className="text-xs text-muted-foreground">Subject:</Label>
                  <Select
                    value={noteSubjectId || "none"}
                    onValueChange={(val) => {
                      const next = val === "none" ? "" : val;
                      setNoteSubjectId(next);
                      scheduleAutosave(title, body, next);
                    }}
                  >
                    <SelectTrigger className="h-7 w-44 text-xs">
                      <SelectValue placeholder="No subject" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No subject</SelectItem>
                      {activeSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="p-4 flex-1 flex flex-col">
                <textarea
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    scheduleAutosave(title, e.target.value, noteSubjectId);
                  }}
                  placeholder="Write your study notes, key formulas, lecture takeaways..."
                  className="w-full flex-1 resize-none bg-transparent outline-none font-sans text-sm leading-relaxed p-2"
                  rows={20}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-medium text-foreground">No note selected</h3>
              <p className="text-sm mt-1 max-w-sm">
                Choose a note from the sidebar or create a new one to start writing.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => createNoteMutation.mutate()}
              >
                <Plus className="mr-2 h-4 w-4" /> Create note
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
