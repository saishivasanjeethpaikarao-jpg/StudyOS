import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  BookOpen,
  FileText,
  Bookmark,
  CheckCircle2,
  RefreshCw,
  X,
  Lightbulb,
  FileEdit,
  GraduationCap,
} from "lucide-react";
import { getApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  LearningAssistantCitation,
  LearningAssistantMessage,
  LearningAssistantRequest,
  LearningAssistantResponse,
} from "@open-sunsama/types";
import { learningKeys } from "@/lib/query-keys";

interface AiLearningAssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialResourceId?: string | null;
  initialNoteId?: string | null;
  initialSubjectId?: string | null;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: LearningAssistantCitation[];
  grounded?: boolean;
  provider?: string;
}

export function AiLearningAssistantDrawer({
  open,
  onOpenChange,
  initialResourceId,
  initialNoteId,
  initialSubjectId,
}: AiLearningAssistantDrawerProps) {
  const { toast } = useToast();
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your StudyOS Learning Assistant. I can help explain difficult concepts, summarize attached resources, or generate practice questions based on your notes.",
    },
  ]);
  const [inputText, setInputText] = React.useState("");
  const [attachedResourceId, setAttachedResourceId] = React.useState<string>(
    initialResourceId || ""
  );
  const [attachedNoteId, setAttachedNoteId] = React.useState<string>(
    initialNoteId || ""
  );

  const scrollRef = React.useRef<HTMLDivElement>(null);

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

  React.useEffect(() => {
    if (initialResourceId) setAttachedResourceId(initialResourceId);
    if (initialNoteId) setAttachedNoteId(initialNoteId);
  }, [initialResourceId, initialNoteId]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (req: LearningAssistantRequest) =>
      getApi().ai.assistantChat(req),
    onSuccess: (res: LearningAssistantResponse) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.content,
          citations: res.citations,
          grounded: res.grounded,
          provider: `${res.provider} • ${res.model}`,
        },
      ]);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Assistant error",
        description: err instanceof Error ? err.message : "Try again",
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I could not complete that request. Please verify your AI provider keys in Settings -> AI.",
        },
      ]);
    },
  });

  const handleSend = (actionOverride?: LearningAssistantRequest["action"]) => {
    const text = inputText.trim();
    if (!text && !actionOverride) return;

    const userMsg = text || (actionOverride === "summarize" ? "Summarize this material" : "Explain this topic");
    setInputText("");

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: userMsg },
    ];
    setMessages(newMessages);

    chatMutation.mutate({
      action: actionOverride || "chat",
      message: userMsg,
      context: {
        resourceId: attachedResourceId || undefined,
        noteId: attachedNoteId || undefined,
        subjectId: initialSubjectId || undefined,
      },
      history: messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <SheetTitle className="text-base">StudyOS Learning Assistant</SheetTitle>
              <SheetDescription className="text-xs">
                Contextual tutor grounded in your study material
              </SheetDescription>
            </div>
          </div>

          {/* Context Picker */}
          <div className="pt-2 flex items-center gap-2">
            <Select
              value={attachedResourceId || "none"}
              onValueChange={(val) => setAttachedResourceId(val === "none" ? "" : val)}
            >
              <SelectTrigger className="h-8 text-[11px] flex-1">
                <SelectValue placeholder="Attach Resource" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Resource</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.type === "youtube" ? "▶ " : "📄 "}
                    {r.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={attachedNoteId || "none"}
              onValueChange={(val) => setAttachedNoteId(val === "none" ? "" : val)}
            >
              <SelectTrigger className="h-8 text-[11px] flex-1">
                <SelectValue placeholder="Attach Note" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Note</SelectItem>
                {notes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    📝 {n.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        {/* Chat Thread */}
        <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`p-3 rounded-lg max-w-[88%] leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border"
                }`}
              >
                {msg.content}
              </div>

              {msg.provider && (
                <span className="text-[10px] text-muted-foreground mt-1 px-1">
                  {msg.provider}
                </span>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 max-w-[88%]">
                  {msg.citations.map((c, cIdx) => (
                    <Badge
                      key={cIdx}
                      variant="outline"
                      className="text-[10px] font-mono text-muted-foreground"
                    >
                      📎 {c.reference || c.title || "Grounded Source"}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>Thinking and cross-referencing study material...</span>
            </div>
          )}
        </div>

        {/* Quick Action Chips */}
        <div className="p-2 border-t bg-muted/20 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] shrink-0"
            onClick={() => handleSend("explain")}
          >
            <Lightbulb className="h-3 w-3 mr-1" /> Explain Simply
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] shrink-0"
            onClick={() => handleSend("summarize")}
          >
            <BookOpen className="h-3 w-3 mr-1" /> Summarize
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] shrink-0"
            onClick={() => handleSend("revision_notes")}
          >
            <FileEdit className="h-3 w-3 mr-1" /> Revision Notes
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[11px] shrink-0"
            onClick={() => handleSend("practice")}
          >
            <GraduationCap className="h-3 w-3 mr-1" /> Practice Drill
          </Button>
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t bg-background flex items-center gap-2">
          <Input
            placeholder="Ask a question about your subject or notes..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="text-xs h-9"
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            disabled={!inputText.trim() || chatMutation.isPending}
            onClick={() => handleSend()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
