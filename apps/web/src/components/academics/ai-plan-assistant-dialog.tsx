import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Calendar,
  AlertCircle,
  RefreshCw,
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
import { Badge } from "@/components/ui/badge";
import type { Assignment } from "@open-sunsama/types";
import type { EnhancedStudyPlanSuggestionResult } from "@open-sunsama/api-client";
import { useConfirmStudyPlan } from "@/hooks/useStudySessions";

interface AiPlanAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: Assignment | null;
}

export function AiPlanAssistantDialog({
  open,
  onOpenChange,
  assignment,
}: AiPlanAssistantDialogProps) {
  const { toast } = useToast();
  const confirmStudyPlan = useConfirmStudyPlan();

  const [suggestion, setSuggestion] = React.useState<EnhancedStudyPlanSuggestionResult | null>(null);

  const suggestMutation = useMutation({
    mutationFn: async () => {
      if (!assignment) throw new Error("No assignment selected");
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      return getApi().ai.suggestPlan({
        assignmentId: assignment.id,
        timezone: tz,
      });
    },
    onSuccess: (data) => {
      setSuggestion(data);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not generate planning recommendation",
        description: err instanceof Error ? err.message : "Try again",
      });
    },
  });

  const handleApplyPlan = async () => {
    if (!assignment || !suggestion) return;
    try {
      await confirmStudyPlan.mutateAsync({
        assignmentId: assignment.id,
        input: {
          clientMutationId: crypto.randomUUID(),
          assignmentRevision: suggestion.preview.assignmentRevision,
          availabilityFingerprint: suggestion.preview.availabilityFingerprint,
          normalizedInput: suggestion.preview.normalizedInput,
          proposedSlots: suggestion.preview.proposedSlots,
        },
      });

      toast({
        title: "Study plan applied to calendar!",
        description: `Scheduled ${suggestion.preview.proposedSlots.length} study sessions.`,
      });
      onOpenChange(false);
      setSuggestion(null);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not apply plan",
        description: err instanceof Error ? err.message : "Schedule conflict detected",
      });
    }
  };

  React.useEffect(() => {
    if (open && assignment) {
      setSuggestion(null);
      suggestMutation.mutate();
    }
  }, [open, assignment]);

  const formatSlotTime = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>AI Study Plan Assistant</DialogTitle>
              <DialogDescription>
                Balanced session allocation powered by AI recommendations &amp; deterministic scheduling.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {suggestMutation.isPending && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Analyzing Schedule &amp; Deadlines...</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Evaluating assignment effort, existing commitments, and spaced retention intervals.
              </p>
            </div>
          </div>
        )}

        {suggestion && assignment && (
          <div className="space-y-4 pt-2">
            {/* Header info */}
            <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 border">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{assignment.title}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {suggestion.provider} • {suggestion.model}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{suggestion.summary}</p>
            </div>

            {/* AI Explanation / Rationale */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 space-y-1">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                Planning Rationale
              </span>
              <p className="text-xs text-foreground/90 leading-relaxed">
                {suggestion.explanation}
              </p>
            </div>

            {/* Day by Day Suggested Distribution */}
            {suggestion.suggestedDistribution.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Suggested Breakdown
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {suggestion.suggestedDistribution.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 border rounded-md flex items-center justify-between text-xs bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{item.date}</span>
                        <span className="text-muted-foreground">— {item.reason}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-[11px]">
                        {item.minutes}m
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deterministic Slots Preview */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Deterministic Schedule Preview ({suggestion.preview.proposedSlots.length} sessions)
                </h4>
                <span className="text-[11px] text-muted-foreground">
                  Exact calendar placement
                </span>
              </div>

              {suggestion.preview.proposedSlots.length === 0 ? (
                <div className="p-3 text-xs text-amber-600 bg-amber-500/10 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No open time blocks available between now and the assignment deadline.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestion.preview.proposedSlots.map((slot, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-2 border rounded-md text-xs bg-muted/20 flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <span className="font-medium">{slot.localDate}</span>
                        <p className="text-[11px] text-muted-foreground">
                          {formatSlotTime(slot.startAt)} – {formatSlotTime(slot.endAt)}
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {slot.plannedMinutes}m
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground italic pt-1">
              * Schedule changes are only applied when you click &quot;Apply Plan&quot;. Existing sessions and calendar blocks will not be modified.
            </p>

            <DialogFooter className="pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={confirmStudyPlan.isPending || suggestion.preview.proposedSlots.length === 0}
                onClick={handleApplyPlan}
              >
                {confirmStudyPlan.isPending ? "Applying..." : "Apply Plan to Calendar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
