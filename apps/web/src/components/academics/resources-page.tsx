import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Globe,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import type { LearningResource, Subject } from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { openExternal } from "@/lib/desktop";
import { learningKeys } from "@/lib/query-keys";
import { useSubjects } from "@/hooks/useSubjects";
import { toast } from "@/hooks/use-toast";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

export function ResourcesPage() {
  const client = useQueryClient();
  const { data: activeSubjects = [] } = useSubjects({ archived: false });
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all");
  const [selectedType, setSelectedType] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Form state
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [type, setType] = React.useState<"youtube" | "web">("web");
  const [targetSubjectId, setTargetSubjectId] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const targetFilter = React.useMemo(() => {
    if (selectedSubjectId && selectedSubjectId !== "all") {
      return { subjectId: selectedSubjectId };
    }
    return {};
  }, [selectedSubjectId]);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: [...learningKeys.resources, targetFilter],
    queryFn: () => getApi().resources.list(targetFilter),
  });

  const subjectMap = React.useMemo(
    () => new Map(activeSubjects.map((s) => [s.id, s])),
    [activeSubjects]
  );

  const filteredResources = React.useMemo(() => {
    return resources.filter((res) => {
      if (selectedType !== "all" && res.type !== selectedType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = res.title.toLowerCase().includes(q);
        const matchesUrl = res.url ? res.url.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesUrl) return false;
      }
      return true;
    });
  }, [resources, selectedType, searchQuery]);

  const toggleMutation = useMutation({
    mutationFn: async (res: LearningResource) => {
      await getApi().resources.update(
        res.id,
        { completed: !res.completedAt },
        res.revision
      );
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: learningKeys.resources });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not update resource",
        description: err instanceof Error ? err.message : "Try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (res: LearningResource) => {
      await getApi().resources.delete(res.id, res.revision);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: learningKeys.resources });
      toast({ title: "Resource deleted" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not delete resource",
        description: err instanceof Error ? err.message : "Try again.",
      });
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setIsSubmitting(true);
    try {
      await getApi().resources.create({
        title: title.trim(),
        url: url.trim(),
        type,
        link: targetSubjectId ? { subjectId: targetSubjectId } : undefined,
      });
      await client.invalidateQueries({ queryKey: learningKeys.resources });
      toast({ title: "Resource added successfully" });
      setIsAddOpen(false);
      setTitle("");
      setUrl("");
      setType("web");
      setTargetSubjectId("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not create resource",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResourceIcon = (resType: string) => {
    switch (resType) {
      case "youtube":
        return <Video className="h-4 w-4 text-red-500" />;
      case "web":
        return <Globe className="h-4 w-4 text-blue-500" />;
      default:
        return <FileText className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Academic Resources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize study materials, video lectures, and web links across your subjects.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-10">
              <Plus className="mr-2 h-4 w-4" /> Add Resource
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Add Academic Resource</DialogTitle>
                <DialogDescription>
                  Save a video lecture, reference site, or documentation link.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="res-title">Title</Label>
                  <Input
                    id="res-title"
                    placeholder="e.g., Organic Chemistry Mechanism Walkthrough"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="res-url">URL</Label>
                  <Input
                    id="res-url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => {
                      const v = e.target.value;
                      setUrl(v);
                      if (v.includes("youtube.com") || v.includes("youtu.be")) {
                        setType("youtube");
                      }
                    }}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Resource Type</Label>
                    <Select value={type} onValueChange={(v: "youtube" | "web") => setType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web Page / Link</SelectItem>
                        <SelectItem value="youtube">YouTube Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Subject (Optional)</Label>
                    <Select
                      value={targetSubjectId || "none"}
                      onValueChange={(v) => setTargetSubjectId(v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
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
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !title || !url}>
                  {isSubmitting ? "Saving..." : "Save Resource"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Subject Filter */}
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {activeSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type Filter */}
          <Tabs value={selectedType} onValueChange={setSelectedType} className="h-9">
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
              <TabsTrigger value="youtube" className="text-xs px-3">YouTube</TabsTrigger>
              <TabsTrigger value="web" className="text-xs px-3">Web</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content List */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-8 w-full mt-4" />
            </Card>
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium">No resources found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {searchQuery
              ? "No resources match your search criteria. Try a different query."
              : "Add video lectures, documentation, and reference links to organize your study material."}
          </p>
          {!searchQuery && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add your first resource
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((res) => {
            return (
              <Card
                key={res.id}
                className="flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">{getResourceIcon(res.type)}</div>
                      <div className="min-w-0">
                        <h4
                          className={`text-sm font-semibold leading-tight line-clamp-2 ${
                            res.completedAt ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {res.title}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {res.url ?? "Attached file"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] capitalize">
                      {res.type}
                    </Badge>
                  </div>
                </CardContent>

                <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => toggleMutation.mutate(res)}
                  >
                    {res.completedAt ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary mr-1.5" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {res.completedAt ? "Done" : "Mark read"}
                  </Button>

                  <div className="flex items-center gap-1">
                    {res.url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void openExternal(res.url!)}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" /> Open
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(res)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
