import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  FileEdit,
  FileText,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import type { StudyNote, Subject } from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { learningKeys } from "@/lib/query-keys";
import { useSubjects, subjectKeys } from "@/hooks/useSubjects";
import { toast } from "@/hooks/use-toast";
import { TeacherLectureViewer } from "./teacher-lecture-viewer";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const CURATED_PRESETS = [
  { id: "c-programming", label: "C Programming & Systems", icon: "💻" },
  { id: "python", label: "Python & Data Science", icon: "🐍" },
  { id: "dsa", label: "Data Structures & Algorithms", icon: "⚡" },
  { id: "web-react", label: "Fullstack Web & React", icon: "⚛️" },
  { id: "java", label: "Java & Object-Oriented", icon: "☕" },
  { id: "machine-learning", label: "Machine Learning & AI", icon: "🤖" },
  { id: "operating-systems", label: "Operating Systems & Arch", icon: "🖥️" },
  { id: "database-sql", label: "SQL & Database Systems", icon: "🗄️" },
];

export function NotesPage() {
  const client = useQueryClient();
  const { data: activeSubjects = [] } = useSubjects({ archived: false });
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);

  // AI Generator Modal state
  const [generateModalOpen, setGenerateModalOpen] = React.useState(false);
  const [customTopic, setCustomTopic] = React.useState("");
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null);

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

  const generateCurriculumMutation = useMutation({
    mutationFn: async (topic: string) => {
      return (await (getApi().notes as any).generateCurriculum(topic)) as {
        package: any;
        enrollment: any;
      };
    },
    onSuccess: (res) => {
      void client.invalidateQueries({ queryKey: learningKeys.notes });
      void client.invalidateQueries({ queryKey: subjectKeys.all });
      void client.invalidateQueries({ queryKey: learningKeys.resources });
      toast({
        title: "Curriculum Enrolled! 🎓",
        description: `Generated 8 lecture slide decks, 4 assignments, and 24 daily schedule blocks for ${res?.enrollment?.subjectName || "your subject"}.`,
      });
      setGenerateModalOpen(false);
      setCustomTopic("");
      setSelectedPreset(null);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not generate curriculum",
        description: err instanceof Error ? err.message : "Please try again.",
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300 gap-2 shadow-sm"
            onClick={() => setGenerateModalOpen(true)}
          >
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            AI Course Deck & Notes
          </Button>
          <Button onClick={() => createNoteMutation.mutate()} disabled={createNoteMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" /> New Note
          </Button>
        </div>
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
              <div className="p-8 text-center text-muted-foreground text-sm space-y-3">
                <p>No notes found.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                  onClick={() => setGenerateModalOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Generate Course Decks
                </Button>
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

              <CardContent className="p-4 flex-1 flex flex-col min-h-[500px]">
                <TeacherLectureViewer
                  title={title}
                  body={body}
                  subjectName={noteSubjectId ? subjectMap.get(noteSubjectId)?.name : undefined}
                  onBodyChange={(newBody) => {
                    setBody(newBody);
                    scheduleAutosave(title, newBody, noteSubjectId);
                  }}
                  isEditable={true}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-medium text-foreground">No note selected</h3>
              <p className="text-sm mt-1 max-w-sm">
                Choose a lecture deck from the sidebar or generate an academic course package with slides, videos, and daily schedules.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                <Button
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-sm"
                  onClick={() => setGenerateModalOpen(true)}
                >
                  <Sparkles className="h-4 w-4" /> AI Course Deck & Notes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => createNoteMutation.mutate()}
                >
                  <Plus className="mr-2 h-4 w-4" /> Blank note
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* AI Generate Course Deck Dialog */}
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-2 text-indigo-400">
              <Sparkles className="h-5 w-5" />
              <DialogTitle className="text-xl">AI Course Deck & Curriculum Generator</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Select a curated foundational subject or type any topic. StudyOS will instantly construct 8 teacher lecture decks (ready for slides and printable PDF), 4 assignments, 24 daily schedule blocks, and verified video courses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-2 block">
                Popular Curated Subjects
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CURATED_PRESETS.map((p) => {
                  const isSelected = selectedPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={generateCurriculumMutation.isPending}
                      onClick={() => {
                        setSelectedPreset(p.id);
                        setCustomTopic(p.label);
                      }}
                      className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all text-xs font-medium ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500/10 text-foreground ring-1 ring-indigo-500"
                          : "border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <span className="text-lg mb-1">{p.icon}</span>
                      <span className="font-semibold text-foreground line-clamp-1">{p.label}</span>
                      <span className="text-[10px] text-muted-foreground">8 PPT Decks • 4 Projects</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-topic" className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                Or Type Any Custom Topic / Subject
              </Label>
              <Input
                id="custom-topic"
                placeholder="e.g., Rust Systems, Computer Vision, Docker & Kubernetes, Quantum Computing..."
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setSelectedPreset(null);
                }}
                disabled={generateCurriculumMutation.isPending}
                className="h-10 text-sm"
              />
            </div>

            {generateCurriculumMutation.isPending && (
              <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4 flex items-center gap-3 text-sm text-indigo-300">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium text-indigo-200">Building Academic Package...</p>
                  <p className="text-xs text-muted-foreground">
                    Generating 8 modular lecture slide decks, syllabus, assignments, FocusTube video courses, and 24 calendar blocks.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setGenerateModalOpen(false)}
              disabled={generateCurriculumMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white gap-2"
              disabled={!customTopic.trim() || generateCurriculumMutation.isPending}
              onClick={() => generateCurriculumMutation.mutate(customTopic.trim())}
            >
              {generateCurriculumMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Curriculum & Notes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
