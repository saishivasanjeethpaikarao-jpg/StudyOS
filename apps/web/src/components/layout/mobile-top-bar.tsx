import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAiAssistant } from "@/hooks/useAiAssistant";
import { useSearch } from "@/hooks/useSearch";
import { useTasks } from "@/hooks/useTasks";
import type { Task } from "@open-sunsama/types";
import { triggerNativeAlarm, scheduleNativeNotification } from "@/lib/native-bridge";
import { toast } from "@/hooks/use-toast";
import { Button, Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { getAvatarUrl } from "@/lib/utils";

export function MobileTopBar() {
  const { user } = useAuth();
  const { openAssistant } = useAiAssistant();
  const { openSearch } = useSearch();

  const todayStr = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: todayTasks = [] } = useTasks({ scheduledDate: todayStr });

  const pendingTask = React.useMemo(() => {
    return Array.isArray(todayTasks)
      ? (todayTasks as Task[]).find((t) => !t.completedAt)
      : undefined;
  }, [todayTasks]);

  const userInitials = React.useMemo(() => {
    if (!user?.name) return user?.email?.charAt(0).toUpperCase() ?? "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  const handleQuickAlarm = () => {
    // Quick schedule native alarm & notification with specific study topic note
    const now = new Date();
    const alarmTime = new Date(now.getTime() + 30 * 60 * 1000);
    const timeStr = alarmTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const studySubjectNote = pendingTask
      ? `Study: ${pendingTask.title}`
      : "Study: Academic Focus Block";
    
    scheduleNativeNotification(
      `⏰ ${studySubjectNote}`,
      `Stay focused! Study session for "${pendingTask?.title ?? "academic goals"}" is underway.`,
      alarmTime,
      "mobile-top-alarm"
    );
    triggerNativeAlarm(alarmTime, studySubjectNote);
    toast({
      title: "Study Alarm Scheduled",
      description: `Alarm set for ${timeStr} with note: "${studySubjectNote}"`,
    });
  };

  return (
    <header
      className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 8px)",
      }}
    >
      <div className="flex h-11 items-center justify-between px-3 sm:px-4">
        {/* Left: StudyOS Logo & Title */}
        <Link to="/app" className="flex items-center gap-2">
          <img
            src="/studyos-symbol.svg"
            alt="StudyOS"
            className="h-6 w-6 rounded-lg object-cover"
          />
          <span className="text-[14px] font-bold tracking-tight text-foreground">
            Study<span className="text-primary">OS</span>
          </span>
        </Link>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Alarm Trigger */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleQuickAlarm}
            title="Set Quick Study Alarm"
          >
            <Bell className="h-4 w-4 text-orange-500 fill-orange-500/20" />
            <span className="sr-only">Quick Alarm</span>
          </Button>

          {/* AI Learning Assistant */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-primary hover:text-primary/90"
            onClick={openAssistant}
            title="Open AI Learning Assistant"
          >
            <Sparkles className="h-4 w-4" />
            <span className="sr-only">AI Assistant</span>
          </Button>

          {/* Search / Command palette */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={openSearch}
            title="Search"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>

          {/* User profile avatar link */}
          <Link to="/app/settings" className="ml-1">
            <Avatar className="h-7 w-7 ring-1 ring-border">
              {user?.avatarUrl && (
                <AvatarImage
                  src={getAvatarUrl(user.avatarUrl)}
                  alt={user?.name ?? "User"}
                />
              )}
              <AvatarFallback className="text-[10px] font-medium bg-muted">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
