import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  HelpCircle,
  Search,
  Filter,
  Maximize2,
  Minimize2,
  BookmarkPlus,
  Flame,
  Video,
} from "lucide-react";
import type { LearningResource } from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { useSubjects } from "@/hooks/useSubjects";
import { learningKeys } from "@/lib/query-keys";
import { toast } from "@/hooks/use-toast";
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@/components/ui";
import { AiLearningAssistantDrawer } from "./ai-learning-assistant-drawer";
import { QuizGeneratorModal } from "./quiz-generator-modal";

interface TimestampNote {
  id: string;
  timestampSeconds: number;
  timestampText: string;
  content: string;
  createdAt: string;
}

const STARTER_VIDEOS = [
  {
    title: "CS50 2026 - Lecture 1: C Programming & Computational Thinking",
    url: "https://www.youtube.com/watch?v=LfaMVlDaQ24",
    videoId: "LfaMVlDaQ24",
    tag: "Computer Science",
  },
  {
    title: "Essence of Linear Algebra - Chapter 1: Vectors (3Blue1Brown)",
    url: "https://www.youtube.com/watch?v=fNk_zzaMoSs",
    videoId: "fNk_zzaMoSs",
    tag: "Mathematics",
  },
  {
    title: "Organic Chemistry 1 - Reaction Mechanisms & Electrophiles",
    url: "https://www.youtube.com/watch?v=bBC3_qZ6bJg",
    videoId: "bBC3_qZ6bJg",
    tag: "Chemistry",
  },
  {
    title: "How to Study for Exams: Active Recall & Spaced Repetition",
    url: "https://www.youtube.com/watch?v=ukLnPbIffxE",
    videoId: "ukLnPbIffxE",
    tag: "Study Skills",
  },
];

function extractYouTubeVideoId(inputUrl: string): string | null {
  try {
    const url = new URL(inputUrl);
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be" || host === "www.youtu.be") {
      const id = url.pathname.slice(1).split("/")[0]?.split("?")[0];
      return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
      ].includes(host)
    ) {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }
      if (/^\/(shorts|live|embed)\//.test(url.pathname)) {
        const id = url.pathname.split("/")[2]?.split("?")[0];
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function FocusTubePage() {
  const queryClient = useQueryClient();
  const { data: activeSubjects = [] } = useSubjects({ archived: false });

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all");
  const [activeResourceId, setActiveResourceId] = React.useState<string | null>(null);

  // Modals & Panels
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = React.useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = React.useState(false);
  const [isTheaterMode, setIsTheaterMode] = React.useState(false);

  // Add video form state
  const [videoUrl, setVideoUrl] = React.useState("");
  const [videoTitle, setVideoTitle] = React.useState("");
  const [targetSubjectId, setTargetSubjectId] = React.useState<string>("");
  const [isFetchingMeta, setIsFetchingMeta] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Timestamp note input
  const [noteMinutes, setNoteMinutes] = React.useState("00");
  const [noteSeconds, setNoteSeconds] = React.useState("00");
  const [noteText, setNoteText] = React.useState("");

  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);

  // Fetch all resources
  const { data: allResources = [], isLoading } = useQuery({
    queryKey: learningKeys.resources,
    queryFn: () => getApi().resources.list(),
  });

  // Filter YouTube resources
  const youtubeResources = React.useMemo(() => {
    return allResources.filter((r) => r.type === "youtube");
  }, [allResources]);

  const filteredResources = React.useMemo(() => {
    return youtubeResources.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesUrl = r.url ? r.url.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesUrl) return false;
      }
      return true;
    });
  }, [youtubeResources, searchQuery]);

  // Set active resource if none set yet
  React.useEffect(() => {
    if (!activeResourceId && youtubeResources.length > 0) {
      setActiveResourceId(youtubeResources[0]!.id);
    }
  }, [activeResourceId, youtubeResources]);

  const activeResource = React.useMemo(() => {
    return youtubeResources.find((r) => r.id === activeResourceId) || youtubeResources[0] || null;
  }, [youtubeResources, activeResourceId]);

  const activeVideoId = React.useMemo(() => {
    if (!activeResource) return null;
    return activeResource.providerItemId || (activeResource.url ? extractYouTubeVideoId(activeResource.url) : null);
  }, [activeResource]);

  // Timestamp notes stored locally for this video
  const notesStorageKey = React.useMemo(() => {
    return activeVideoId ? `studyos_focustube_notes_${activeVideoId}` : null;
  }, [activeVideoId]);

  const [timestampNotes, setTimestampNotes] = React.useState<TimestampNote[]>(() => {
    if (!notesStorageKey || typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(notesStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Reload notes when active video changes
  React.useEffect(() => {
    if (!notesStorageKey || typeof window === "undefined") {
      setTimestampNotes([]);
      return;
    }
    try {
      const stored = localStorage.getItem(notesStorageKey);
      setTimestampNotes(stored ? JSON.parse(stored) : []);
    } catch {
      setTimestampNotes([]);
    }
  }, [notesStorageKey]);

  const saveNotes = (updated: TimestampNote[]) => {
    setTimestampNotes(updated);
    if (notesStorageKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(notesStorageKey, JSON.stringify(updated));
      } catch {
        // quota ignore
      }
    }
  };

  const handleAddTimestampNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const m = parseInt(noteMinutes, 10) || 0;
    const s = parseInt(noteSeconds, 10) || 0;
    const totalSecs = m * 60 + s;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const timestampText = `${pad(m)}:${pad(s)}`;

    const newNote: TimestampNote = {
      id: crypto.randomUUID(),
      timestampSeconds: totalSecs,
      timestampText,
      content: noteText.trim(),
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const sorted = [...timestampNotes, newNote].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
    saveNotes(sorted);
    setNoteText("");
    toast({ title: `Note added at [${timestampText}]` });
  };

  const handleDeleteNote = (id: string) => {
    saveNotes(timestampNotes.filter((n) => n.id !== id));
  };

  const seekVideo = (seconds: number) => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: "seekTo",
        args: [seconds, true],
      }),
      "*"
    );
  };

  // Toggle completion mutation
  const toggleMutation = useMutation({
    mutationFn: async (res: LearningResource) => {
      await getApi().resources.update(
        res.id,
        { completed: !res.completedAt },
        res.revision
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningKeys.resources });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not update status",
        description: err instanceof Error ? err.message : "Try again",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (res: LearningResource) => {
      await getApi().resources.delete(res.id, res.revision);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningKeys.resources });
      toast({ title: "Lesson removed from FocusTube" });
      if (activeResourceId === activeResource?.id) {
        setActiveResourceId(null);
      }
    },
  });

  // Add video URL with automatic oEmbed metadata resolution
  const handleUrlBlur = async () => {
    if (!videoUrl.trim() || videoTitle.trim()) return;
    const vid = extractYouTubeVideoId(videoUrl);
    if (!vid) return;

    setIsFetchingMeta(true);
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
      if (res.ok) {
        const data = await res.json() as { title?: string };
        if (data.title) setVideoTitle(data.title);
      } else {
        setVideoTitle(`YouTube Lesson (${vid})`);
      }
    } catch {
      setVideoTitle(`YouTube Lesson (${vid})`);
    } finally {
      setIsFetchingMeta(false);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    const vid = extractYouTubeVideoId(videoUrl);
    if (!vid) {
      toast({
        variant: "destructive",
        title: "Invalid YouTube URL",
        description: "Please enter a valid YouTube video link (watch, youtu.be, or shorts).",
      });
      return;
    }

    const titleToUse = videoTitle.trim() || `YouTube Lesson (${vid})`;
    setIsSubmitting(true);
    try {
      await getApi().resources.create({
        title: titleToUse,
        url: `https://www.youtube.com/watch?v=${vid}`,
        type: "youtube",
        link: targetSubjectId ? { subjectId: targetSubjectId } : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: learningKeys.resources });
      toast({ title: "Video lesson added to FocusTube!" });
      setIsAddOpen(false);
      setVideoUrl("");
      setVideoTitle("");
      setTargetSubjectId("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not add video",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStarter = async (starter: typeof STARTER_VIDEOS[0]) => {
    try {
      await getApi().resources.create({
        title: starter.title,
        url: starter.url,
        type: "youtube",
      });
      await queryClient.invalidateQueries({ queryKey: learningKeys.resources });
      toast({ title: `Added "${starter.title}" to FocusTube!` });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not add starter",
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-600/10 text-red-600">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">FocusTube</h1>
            <Badge variant="outline" className="border-red-500/30 text-red-500 text-xs">
              Distraction-Free Learning
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Zero sidebars, zero comments, zero recommendations. Study with synchronized timestamp notes and AI tutors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddOpen(true)}
            className="h-9 gap-1.5 bg-red-600 hover:bg-red-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Add YouTube Lesson
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[450px] rounded-xl" />
          <Skeleton className="h-[450px] rounded-xl" />
        </div>
      ) : activeResource && activeVideoId ? (
        /* Active FocusTube Player & Notes Workspace */
        <div className="space-y-6">
          <div className={`grid grid-cols-1 ${isTheaterMode ? "lg:grid-cols-1" : "lg:grid-cols-3"} gap-6`}>
            {/* Player Container */}
            <div className={`${isTheaterMode ? "w-full" : "lg:col-span-2"} space-y-3`}>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black shadow-lg border border-border">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3`}
                  title={activeResource.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* Video Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card border rounded-lg">
                <div className="space-y-0.5">
                  <h2 className="text-base font-semibold line-clamp-1">{activeResource.title}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>YouTube Lesson</span>
                    <span>•</span>
                    <a
                      href={activeResource.url || `https://www.youtube.com/watch?v=${activeVideoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1 text-primary"
                    >
                      Open on YouTube <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleMutation.mutate(activeResource)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <CheckCircle2 className={`h-3.5 w-3.5 ${activeResource.completedAt ? "text-green-500 fill-green-500/20" : ""}`} />
                    {activeResource.completedAt ? "Mastered" : "Mark Mastered"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAiDrawerOpen(true)}
                    className="h-8 text-xs gap-1.5 text-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Tutor
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsQuizModalOpen(true)}
                    className="h-8 text-xs gap-1.5"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                    Quiz Me
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    title={isTheaterMode ? "Standard View" : "Theater Mode"}
                  >
                    {isTheaterMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Sidebar: Timestamped Study Notes */}
            {!isTheaterMode && (
              <div className="flex flex-col h-full bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookmarkPlus className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Timestamped Study Notes</h3>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {timestampNotes.length} notes
                  </Badge>
                </div>

                {/* Notes List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px] max-h-[360px]">
                  {timestampNotes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground space-y-1">
                      <Clock className="h-6 w-6 mx-auto stroke-1 opacity-50" />
                      <p className="text-xs font-medium">No timestamp notes yet</p>
                      <p className="text-[11px] text-muted-foreground/80">
                        Add key formulas, definitions, or exam takeaways below.
                      </p>
                    </div>
                  ) : (
                    timestampNotes.map((note) => (
                      <div
                        key={note.id}
                        className="group flex items-start justify-between gap-2 p-2.5 bg-muted/40 hover:bg-muted/70 rounded-lg border text-xs transition-colors"
                      >
                        <div className="space-y-1 flex-1">
                          <button
                            type="button"
                            onClick={() => seekVideo(note.timestampSeconds)}
                            className="inline-flex items-center gap-1 font-mono font-semibold text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded text-[11px]"
                          >
                            <Play className="h-2.5 w-2.5 fill-current" />
                            [{note.timestampText}]
                          </button>
                          <p className="text-foreground leading-relaxed">{note.content}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Timestamp Note Form */}
                <form onSubmit={handleAddTimestampNote} className="p-3 border-t bg-muted/20 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>At time:</span>
                    <input
                      type="text"
                      maxLength={2}
                      value={noteMinutes}
                      onChange={(e) => setNoteMinutes(e.target.value.replace(/\D/g, ""))}
                      className="w-8 h-7 text-center rounded border bg-background text-foreground font-mono text-xs"
                      placeholder="00"
                    />
                    <span>:</span>
                    <input
                      type="text"
                      maxLength={2}
                      value={noteSeconds}
                      onChange={(e) => setNoteSeconds(e.target.value.replace(/\D/g, ""))}
                      className="w-8 h-7 text-center rounded border bg-background text-foreground font-mono text-xs"
                      placeholder="00"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type key takeaway or formula..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Button type="submit" size="sm" className="h-8 px-3 text-xs">
                      Save
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State & Curated Starter Lessons */
        <div className="space-y-6">
          <Card className="border-dashed">
            <CardHeader className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-red-600/10 text-red-600 flex items-center justify-center mx-auto mb-2">
                <Play className="h-6 w-6 fill-current" />
              </div>
              <CardTitle className="text-lg">Welcome to FocusTube</CardTitle>
              <CardDescription className="max-w-md mx-auto text-xs">
                Watch academic lectures in a zero-distraction environment. No algorithmic feeds, no comments, and no notifications.
              </CardDescription>
              <div className="pt-4">
                <Button onClick={() => setIsAddOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                  <Plus className="h-4 w-4" /> Add Your First Video Lesson
                </Button>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h2 className="text-sm font-semibold">Or start with popular academic lectures:</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {STARTER_VIDEOS.map((starter) => (
                <Card
                  key={starter.videoId}
                  className="hover:border-primary/50 transition-colors cursor-pointer group flex flex-col justify-between"
                  onClick={() => handleAddStarter(starter)}
                >
                  <div className="relative aspect-video w-full rounded-t-lg overflow-hidden bg-muted">
                    <img
                      src={`https://img.youtube.com/vi/${starter.videoId}/hqdefault.jpg`}
                      alt={starter.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow">
                        <Play className="h-4 w-4 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <CardHeader className="p-3 space-y-1">
                    <Badge variant="secondary" className="w-fit text-[10px]">
                      {starter.tag}
                    </Badge>
                    <p className="text-xs font-medium line-clamp-2 leading-snug">{starter.title}</p>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 text-[11px] text-primary flex items-center gap-1 font-medium">
                    <span>+ Add to FocusTube</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Video Library Shelf */}
      {youtubeResources.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-red-500" />
              <h2 className="text-base font-semibold">Your FocusTube Library</h2>
              <Badge variant="outline" className="text-xs">
                {youtubeResources.length}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter lessons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredResources.map((res) => {
              const vid = res.providerItemId || (res.url ? extractYouTubeVideoId(res.url) : null);
              const isActive = res.id === activeResource?.id;
              return (
                <Card
                  key={res.id}
                  className={`overflow-hidden transition-all group flex flex-col justify-between ${
                    isActive ? "ring-2 ring-primary border-primary" : "hover:border-primary/40"
                  }`}
                >
                  <div
                    className="relative aspect-video w-full bg-black cursor-pointer overflow-hidden"
                    onClick={() => setActiveResourceId(res.id)}
                  >
                    {vid ? (
                      <img
                        src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                        alt={res.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Video className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-black/60 text-white flex items-center justify-center shadow backdrop-blur-sm">
                        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                      </div>
                    </div>
                    {res.completedAt && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded shadow">
                        Mastered
                      </div>
                    )}
                  </div>

                  <CardHeader className="p-3 space-y-1">
                    <p
                      className="text-xs font-semibold line-clamp-2 leading-snug cursor-pointer hover:text-primary transition-colors"
                      onClick={() => setActiveResourceId(res.id)}
                    >
                      {res.title}
                    </p>
                  </CardHeader>

                  <CardContent className="p-3 pt-0 flex items-center justify-between text-xs text-muted-foreground border-t bg-muted/10">
                    <button
                      type="button"
                      onClick={() => setActiveResourceId(res.id)}
                      className="text-primary hover:underline font-medium text-[11px]"
                    >
                      {isActive ? "Currently Playing" : "Watch Now"}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(res)}
                      title="Remove from FocusTube"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Add YouTube Lesson Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateVideo}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="h-4 w-4 text-red-600 fill-current" />
                Add YouTube Lesson
              </DialogTitle>
              <DialogDescription className="text-xs">
                Paste any YouTube video or playlist lesson link to watch distraction-free in FocusTube.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 text-xs">
              <div className="grid gap-1.5">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="youtube-title">Lesson Title {isFetchingMeta && "(Fetching title...)"}</Label>
                <Input
                  id="youtube-title"
                  placeholder="e.g. CS50 Lecture 1 or Physics Thermodynamics"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  required
                />
              </div>

              {activeSubjects.length > 0 && (
                <div className="grid gap-1.5">
                  <Label htmlFor="target-subject">Academic Subject (Optional)</Label>
                  <Select value={targetSubjectId} onValueChange={setTargetSubjectId}>
                    <SelectTrigger id="target-subject" className="h-9">
                      <SelectValue placeholder="Select course/subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !videoUrl.trim()} className="bg-red-600 hover:bg-red-700 text-white">
                {isSubmitting ? "Adding..." : "Add to FocusTube"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Connected AI Learning Assistant Drawer */}
      <AiLearningAssistantDrawer
        open={isAiDrawerOpen}
        onOpenChange={setIsAiDrawerOpen}
        initialResourceId={activeResource?.id}
      />

      {/* Connected Quiz Generator Modal */}
      <QuizGeneratorModal
        open={isQuizModalOpen}
        onOpenChange={setIsQuizModalOpen}
        preselectedResourceId={activeResource?.id}
      />
    </div>
  );
}
