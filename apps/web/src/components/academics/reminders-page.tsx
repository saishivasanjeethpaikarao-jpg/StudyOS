import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import type { StudyReminder } from "@open-sunsama/types";
import { getApi } from "@/lib/api";
import { showNotification } from "@/lib/desktop";
import { learningKeys } from "@/lib/query-keys";
import { useSubjects } from "@/hooks/useSubjects";
import { toast } from "@/hooks/use-toast";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from "@/components/ui";

export function RemindersPage() {
  const client = useQueryClient();
  const { data: activeSubjects = [] } = useSubjects({ archived: false });
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // Form state
  const [title, setTitle] = React.useState("");
  const [remindDate, setRemindDate] = React.useState(
    () => format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm")
  );
  const [targetSubjectId, setTargetSubjectId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { data: pendingReminders = [], isLoading } = useQuery({
    queryKey: [...learningKeys.reminders, "pending"],
    queryFn: () => getApi().reminders.list("pending"),
    refetchInterval: 30_000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (reminder: StudyReminder) => {
      await getApi().reminders.dismiss(reminder.id, reminder.revision);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: learningKeys.reminders });
      toast({ title: "Reminder dismissed" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not dismiss reminder",
        description: err instanceof Error ? err.message : "Try again.",
      });
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindDate) return;
    setIsSubmitting(true);
    try {
      const dateIso = new Date(remindDate).toISOString();
      await getApi().reminders.create({
        title: title.trim(),
        remindAt: dateIso,
        subjectId: targetSubjectId || null,
      });
      await client.invalidateQueries({ queryKey: learningKeys.reminders });
      toast({ title: "Reminder scheduled" });
      setIsAddOpen(false);
      setTitle("");
      setTargetSubjectId("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not create reminder",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await showNotification({
        title: "StudyOS Notification Test",
        body: "Windows desktop notifications are working properly!",
      });
      toast({ title: "Notification dispatched" });
    } catch {
      toast({
        variant: "destructive",
        title: "Notification failed",
        description: "Check system notification permissions in Windows Settings.",
      });
    }
  };

  const subjectMap = React.useMemo(
    () => new Map(activeSubjects.map((s) => [s.id, s])),
    [activeSubjects]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Study Reminders</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage scheduled study alerts, assignment deadlines, and Windows desktop notifications.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleTestNotification}>
            <Send className="mr-2 h-4 w-4" /> Test Notification
          </Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Set Study Reminder</DialogTitle>
                  <DialogDescription>
                    Schedule an alert for upcoming review sessions or coursework deadlines.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="rem-title">Reminder Title</Label>
                    <Input
                      id="rem-title"
                      placeholder="e.g., Review Chemistry Chapter 4 flashcards"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rem-date">Alert Date & Time</Label>
                    <Input
                      id="rem-date"
                      type="datetime-local"
                      value={remindDate}
                      onChange={(e) => setRemindDate(e.target.value)}
                      required
                    />
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
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !title.trim()}>
                    {isSubmitting ? "Scheduling..." : "Schedule Reminder"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : pendingReminders.length === 0 ? (
          <Card className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-lg font-medium text-foreground">No upcoming reminders</h3>
            <p className="text-sm mt-1 max-w-sm">
              All caught up! Schedule a reminder to keep track of assignments or revision sessions.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Schedule reminder
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingReminders.map((reminder) => {
              const remindTime = new Date(reminder.remindAt);
              const overdue = isPast(remindTime);
              const subject = reminder.subjectId
                ? subjectMap.get(reminder.subjectId)
                : null;

              return (
                <Card
                  key={reminder.id}
                  className={`flex flex-col justify-between transition-colors ${
                    overdue ? "border-amber-500/50 bg-amber-500/5" : ""
                  }`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <BellRing
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            overdue ? "text-amber-500 animate-pulse" : "text-primary"
                          }`}
                        />
                        <div>
                          <h4 className="text-sm font-semibold">{reminder.title}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(remindTime, "MMM d, h:mm a")} (
                              {formatDistanceToNow(remindTime, { addSuffix: true })})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {subject && (
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{
                          borderColor: subject.color || undefined,
                          color: subject.color || undefined,
                        }}
                      >
                        {subject.name}
                      </Badge>
                    )}
                  </CardContent>

                  <div className="flex items-center justify-end border-t px-4 py-2 bg-muted/20">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => dismissMutation.mutate(reminder)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" /> Dismiss
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
