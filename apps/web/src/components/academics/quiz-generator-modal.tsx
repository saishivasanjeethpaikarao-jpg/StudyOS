import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  BookOpen,
  Youtube,
  FileText,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { getApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  GeneratedQuizCandidate,
  GeneratedQuizQuestionCandidate,
  QuizGenerationInput,
  QuizSourceType,
} from "@open-sunsama/types";
import { learningKeys } from "@/lib/query-keys";

interface QuizGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedSubjectId?: string | null;
  preselectedResourceId?: string | null;
}

export function QuizGeneratorModal({
  open,
  onOpenChange,
  preselectedSubjectId,
  preselectedResourceId,
}: QuizGeneratorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Wizard state: 1 = Configure, 2 = Generating, 3 = Review/Edit Candidate
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // Form inputs
  const [sourceType, setSourceType] = React.useState<QuizSourceType>(
    preselectedResourceId ? "resource" : "note"
  );
  const [selectedResourceId, setSelectedResourceId] = React.useState(
    preselectedResourceId || ""
  );
  const [selectedNoteId, setSelectedNoteId] = React.useState("");
  const [pastedText, setPastedText] = React.useState("");
  const [questionCount, setQuestionCount] = React.useState(5);
  const [difficulty, setDifficulty] = React.useState<"easy" | "medium" | "hard">("medium");
  const [questionType, setQuestionType] = React.useState<"single" | "multiple" | "mixed">("mixed");
  const [focusTopics, setFocusTopics] = React.useState("");

  // Generated candidate state
  const [candidate, setCandidate] = React.useState<GeneratedQuizCandidate | null>(null);
  const [editableTitle, setEditableTitle] = React.useState("");
  const [editableDescription, setEditableDescription] = React.useState("");
  const [editableQuestions, setEditableQuestions] = React.useState<GeneratedQuizQuestionCandidate[]>([]);

  // Load available resources & notes
  const { data: resources = [] } = useQuery({
    queryKey: learningKeys.resources,
    queryFn: () => getApi().resources.list({}),
    enabled: open,
  });

  const { data: notes = [] } = useQuery({
    queryKey: learningKeys.notes,
    queryFn: () => getApi().notes.list({}),
    enabled: open,
  });

  // Filter supported resources (PDFs and YouTube)
  const supportedResources = resources.filter(
    (r) =>
      r.type === "youtube" ||
      (r.type === "file" && (r.mimeType?.includes("pdf") || r.filename?.endsWith(".pdf")))
  );

  React.useEffect(() => {
    if (preselectedResourceId) {
      setSourceType("resource");
      setSelectedResourceId(preselectedResourceId);
    }
  }, [preselectedResourceId]);

  const generateMutation = useMutation({
    mutationFn: (input: QuizGenerationInput) => getApi().ai.generateQuiz(input),
    onSuccess: (data) => {
      setCandidate(data);
      setEditableTitle(data.title);
      setEditableDescription(data.description);
      setEditableQuestions(data.questions);
      setStep(3);
    },
    onError: (err) => {
      setStep(1);
      toast({
        variant: "destructive",
        title: "Quiz generation failed",
        description: err instanceof Error ? err.message : "Try again with different material or settings.",
      });
    },
  });

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      if (!editableQuestions.length) throw new Error("No questions in quiz");
      return getApi().quizzes.create({
        title: editableTitle.trim() || "Generated Knowledge Check",
        description: editableDescription.trim() || undefined,
        subjectId: preselectedSubjectId || null,
        resourceId: candidate?.sourceType === "resource" ? selectedResourceId || null : null,
        status: "published",
        questions: editableQuestions.map((q) => ({
          type: q.type,
          prompt: q.prompt,
          explanation: q.explanation || null,
          options: q.options,
          sourceResourceId: candidate?.sourceType === "resource" ? selectedResourceId || null : null,
          sourceReference: q.sourceReference || null,
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningKeys.quizzes });
      toast({
        title: "Knowledge Check saved!",
        description: `Saved "${editableTitle}" with ${editableQuestions.length} questions to your library.`,
      });
      onOpenChange(false);
      // Reset state
      setStep(1);
      setCandidate(null);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not save Knowledge Check",
        description: err instanceof Error ? err.message : "Try again",
      });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceType === "resource" && !selectedResourceId) {
      toast({ variant: "destructive", title: "Please select an academic resource" });
      return;
    }
    if (sourceType === "note" && !selectedNoteId) {
      toast({ variant: "destructive", title: "Please select a study note" });
      return;
    }
    if (sourceType === "text" && pastedText.trim().length < 50) {
      toast({ variant: "destructive", title: "Please paste at least 50 characters of study material" });
      return;
    }

    setStep(2);
    generateMutation.mutate({
      sourceType,
      resourceId: sourceType === "resource" ? selectedResourceId : undefined,
      noteId: sourceType === "note" ? selectedNoteId : undefined,
      pastedText: sourceType === "text" ? pastedText.trim() : undefined,
      questionCount,
      difficulty,
      questionType,
      focusTopics: focusTopics.trim() || undefined,
    });
  };

  const handleToggleOptionCorrect = (qIdx: number, optIdx: number) => {
    setEditableQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIdx) return q;
        if (q.type === "single") {
          return {
            ...q,
            options: q.options.map((opt, oIdx) => ({
              ...opt,
              isCorrect: oIdx === optIdx,
            })),
          };
        } else {
          return {
            ...q,
            options: q.options.map((opt, oIdx) =>
              oIdx === optIdx ? { ...opt, isCorrect: !opt.isCorrect } : opt
            ),
          };
        }
      })
    );
  };

  const handleDeleteQuestion = (qIdx: number) => {
    setEditableQuestions((prev) => prev.filter((_, idx) => idx !== qIdx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Generate Knowledge Check with AI</DialogTitle>
              <DialogDescription>
                Turn lecture videos, PDFs, and notes into structured practice questions.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 1 && (
          <form onSubmit={handleGenerate} className="space-y-4 pt-2">
            {/* Source Type Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Study Material</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={sourceType === "resource" ? "default" : "outline"}
                  className="h-10 text-xs justify-start gap-2"
                  onClick={() => setSourceType("resource")}
                >
                  <BookOpen className="h-4 w-4" /> Resource / Video
                </Button>
                <Button
                  type="button"
                  variant={sourceType === "note" ? "default" : "outline"}
                  className="h-10 text-xs justify-start gap-2"
                  onClick={() => setSourceType("note")}
                >
                  <FileText className="h-4 w-4" /> Study Note
                </Button>
                <Button
                  type="button"
                  variant={sourceType === "text" ? "default" : "outline"}
                  className="h-10 text-xs justify-start gap-2"
                  onClick={() => setSourceType("text")}
                >
                  <Plus className="h-4 w-4" /> Pasted Text
                </Button>
              </div>
            </div>

            {/* Source Target Picker */}
            {sourceType === "resource" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Choose Resource</Label>
                {supportedResources.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 border rounded-md">
                    No PDF files or YouTube lessons found in your resources library. Save one first or choose &quot;Pasted Text&quot;.
                  </p>
                ) : (
                  <Select
                    value={selectedResourceId}
                    onValueChange={setSelectedResourceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select PDF or YouTube video" />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedResources.map((res) => (
                        <SelectItem key={res.id} value={res.id}>
                          {res.type === "youtube" ? "▶ " : "📄 "}
                          {res.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {sourceType === "note" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Choose Note</Label>
                {notes.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 border rounded-md">
                    No notes found. Create notes in the Notes workspace or choose &quot;Pasted Text&quot;.
                  </p>
                ) : (
                  <Select
                    value={selectedNoteId}
                    onValueChange={setSelectedNoteId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a study note" />
                    </SelectTrigger>
                    <SelectContent>
                      {notes.map((n) => (
                        <SelectItem key={n.id} value={n.id}>
                          {n.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {sourceType === "text" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Paste Lecture / Study Material</Label>
                <Textarea
                  placeholder="Paste excerpt, lecture summary, or textbook chapter here (minimum 50 characters)..."
                  rows={4}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}

            {/* Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Question Count</Label>
                <Select
                  value={String(questionCount)}
                  onValueChange={(v) => setQuestionCount(Number(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Questions (Quick)</SelectItem>
                    <SelectItem value="5">5 Questions (Standard)</SelectItem>
                    <SelectItem value="10">10 Questions (Thorough)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Difficulty</Label>
                <Select
                  value={difficulty}
                  onValueChange={(v) => setDifficulty(v as "easy" | "medium" | "hard")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy (Fundamentals)</SelectItem>
                    <SelectItem value="medium">Medium (Application)</SelectItem>
                    <SelectItem value="hard">Hard (Deep synthesis)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Question Format</Label>
                <Select
                  value={questionType}
                  onValueChange={(v) => setQuestionType(v as "single" | "multiple" | "mixed")}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single Choice Only</SelectItem>
                    <SelectItem value="multiple">Multiple Choice Only</SelectItem>
                    <SelectItem value="mixed">Mixed Types</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Focus Topics (Optional)</Label>
              <Input
                placeholder="e.g. Light-dependent reactions, ATP synthase, electron transport"
                value={focusTopics}
                onChange={(e) => setFocusTopics(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-1.5">
                <Sparkles className="h-4 w-4" /> Generate Questions
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 2 && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Analyzing Study Material...</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Extracting concepts, generating candidates, and validating answer schemas with your configured AI provider.
              </p>
            </div>
          </div>
        )}

        {step === 3 && candidate && (
          <div className="space-y-5 pt-2">
            <div className="p-3 bg-muted/40 rounded-lg space-y-2 border">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {candidate.provider} • {candidate.model}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Grounded in: <strong className="text-foreground">{candidate.sourceTitle}</strong>
                </span>
              </div>
              <Input
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="font-semibold text-sm h-9"
                placeholder="Knowledge Check Title"
              />
              <Input
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                className="text-xs h-8 text-muted-foreground"
                placeholder="Description"
              />
            </div>

            {candidate.warnings.length > 0 && (
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-md text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{candidate.warnings.join(". ")}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Review &amp; Edit Questions ({editableQuestions.length})
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Click checkmarks to adjust correct answers
                </span>
              </div>

              {editableQuestions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-4 border rounded-lg space-y-3 bg-card relative group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground">
                        Q{qIdx + 1}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {q.type === "single" ? "Single Choice" : "Multi-Select"}
                      </Badge>
                      {q.sourceReference && (
                        <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                          {q.sourceReference}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteQuestion(qIdx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Textarea
                    value={q.prompt}
                    onChange={(e) => {
                      const newPrompt = e.target.value;
                      setEditableQuestions((prev) =>
                        prev.map((item, idx) =>
                          idx === qIdx ? { ...item, prompt: newPrompt } : item
                        )
                      );
                    }}
                    rows={2}
                    className="text-xs font-medium resize-none"
                  />

                  {/* Options */}
                  <div className="space-y-1.5 pl-2 border-l-2 border-muted">
                    {q.options.map((opt, optIdx) => (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-1.5 rounded-md text-xs transition-colors ${
                          opt.isCorrect
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <button
                          type="button"
                          className="shrink-0 focus:outline-none"
                          onClick={() => handleToggleOptionCorrect(qIdx, optIdx)}
                        >
                          {opt.isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        <Input
                          value={opt.text}
                          onChange={(e) => {
                            const newText = e.target.value;
                            setEditableQuestions((prev) =>
                              prev.map((item, idx) => {
                                if (idx !== qIdx) return item;
                                return {
                                  ...item,
                                  options: item.options.map((o, oIdx) =>
                                    oIdx === optIdx ? { ...o, text: newText } : o
                                  ),
                                };
                              })
                            );
                          }}
                          className="h-7 text-xs border-0 bg-transparent shadow-none px-1"
                        />
                      </div>
                    ))}
                  </div>

                  {q.explanation && (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-2 rounded">
                      Explanation: {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
              >
                Back / Regenerate
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={saveQuizMutation.isPending || editableQuestions.length === 0}
                onClick={() => saveQuizMutation.mutate()}
              >
                {saveQuizMutation.isPending ? "Saving..." : "Save to Knowledge Checks"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
