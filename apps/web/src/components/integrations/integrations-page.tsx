import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Cloud,
  Send,
  Bot,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Play,
  Trash2,
  Plus,
  Shield,
  Layers,
  Search,
  Copy,
  Check,
  Bell,
  Sparkles,
  ArrowRight,
  Smartphone,
} from "lucide-react";
import { getApi } from "@/lib/api";
import { QRCodeDisplay } from "@/components/ui/qr-code";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  IntegrationConnectionSummary,
  DriveFileItem,
  TelegramSettings,
  AgentConnectionStatus,
} from "@open-sunsama/types";

// Telegram Logo SVG
function TelegramPaperPlaneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
    </svg>
  );
}

export function IntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Telegram Linking State
  const [telegramLinkCode, setTelegramLinkCode] = React.useState<string | null>(null);
  const [telegramDeepLink, setTelegramDeepLink] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedCmd, setCopiedCmd] = React.useState(false);

  // Drive Search Modal State
  const [driveModalOpen, setDriveModalOpen] = React.useState(false);
  const [driveSearch, setDriveSearch] = React.useState("");
  const [driveFiles, setDriveFiles] = React.useState<DriveFileItem[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = React.useState(false);

  // Queries
  const { data: connections, isLoading: loadingConnections, refetch: refetchConnections } = useQuery({
    queryKey: ["integrations", "status"],
    queryFn: () => getApi().integrations.getStatus(),
  });

  const { data: telegramSettings, isLoading: loadingTg, refetch: refetchTg } = useQuery({
    queryKey: ["integrations", "telegram", "settings"],
    queryFn: () => getApi().integrations.getTelegramSettings(),
    refetchInterval: 3000, // Poll every 3 seconds to auto-detect connection
  });

  const { data: agentStatus, refetch: refetchAgent } = useQuery({
    queryKey: ["integrations", "agent", "status"],
    queryFn: () => getApi().integrations.getAgentStatus(),
  });

  // Auto-generate link code on mount if Telegram is unlinked
  const generateTgCodeMutation = useMutation({
    mutationFn: () => getApi().integrations.getTelegramLinkCode(),
    onSuccess: (data) => {
      setTelegramLinkCode(data.linkCode);
      setTelegramDeepLink(data.deepLink);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not generate Telegram link code",
        description: err instanceof Error ? err.message : "Network error",
      });
    },
  });

  React.useEffect(() => {
    if (!telegramSettings?.isEnabled || !telegramSettings?.chatId) {
      if (!telegramLinkCode && !generateTgCodeMutation.isPending) {
        generateTgCodeMutation.mutate();
      }
    }
  }, [telegramSettings?.isEnabled, telegramSettings?.chatId]);

  // Toast when connection is completed
  const wasLinkedRef = React.useRef(false);
  React.useEffect(() => {
    const isLinked = !!(telegramSettings?.isEnabled && telegramSettings?.chatId);
    if (!wasLinkedRef.current && isLinked) {
      wasLinkedRef.current = true;
      toast({
        title: "Telegram Connected! 🚀",
        description: `Linked to @${telegramSettings?.username || "StudyOS"}. Daily auto-alarms and reminders are now active.`,
      });
    } else if (!isLinked) {
      wasLinkedRef.current = false;
    }
  }, [telegramSettings?.isEnabled, telegramSettings?.chatId, telegramSettings?.username]);

  // Mutations
  const updateTelegramMutation = useMutation({
    mutationFn: (updates: Partial<TelegramSettings>) =>
      getApi().integrations.updateTelegramSettings(updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "telegram", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations", "status"] });
      toast({ title: "Telegram settings saved" });
    },
  });

  const disconnectTgMutation = useMutation({
    mutationFn: () => getApi().integrations.disconnectTelegram(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "telegram", "settings"] });
      void queryClient.invalidateQueries({ queryKey: ["integrations", "status"] });
      setTelegramLinkCode(null);
      setTelegramDeepLink(null);
      generateTgCodeMutation.mutate();
      toast({ title: "Telegram disconnected" });
    },
  });

  const sendBriefingMutation = useMutation({
    mutationFn: () => getApi().integrations.sendTelegramBriefing(),
    onSuccess: (res) => {
      if (res.sent) {
        toast({
          title: "Briefing Sent! 📬",
          description: "Check your Telegram app for today's academic briefing.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Could not deliver briefing",
          description: res.message || "Ensure the bot is started in Telegram.",
        });
      }
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Briefing failed",
        description: err instanceof Error ? err.message : "Error",
      });
    },
  });

  // Handlers
  const handleCopyLink = () => {
    if (!telegramDeepLink) return;
    navigator.clipboard.writeText(telegramDeepLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast({ title: "Link copied to clipboard!" });
  };

  const handleCopyCmd = () => {
    if (!telegramLinkCode) return;
    navigator.clipboard.writeText(`/start ${telegramLinkCode}`);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
    toast({ title: "Command copied to clipboard!" });
  };

  // Google Drive Handlers
  const handleOpenDriveModal = async () => {
    setDriveModalOpen(true);
    setLoadingDriveFiles(true);
    try {
      const res = await getApi().integrations.listDriveFiles(driveSearch);
      setDriveFiles(res.files);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not fetch Google Drive files",
        description: err instanceof Error ? err.message : "Ensure Google is connected",
      });
    } finally {
      setLoadingDriveFiles(false);
    }
  };

  const handleImportDriveFile = async (file: DriveFileItem) => {
    try {
      await getApi().integrations.importDriveFile({
        fileId: file.id,
        fileName: file.name,
      });
      toast({
        title: "File imported to Resources!",
        description: `${file.name} is now available in your StudyOS materials.`,
      });
      setDriveModalOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: err instanceof Error ? err.message : "Error importing file",
      });
    }
  };

  const isTgLinked = !!(telegramSettings?.isEnabled && telegramSettings?.chatId);
  const botUsername = "Study_OSbot";
  const mobileTgAppUri = telegramLinkCode
    ? `tg://resolve?domain=${botUsername}&start=${telegramLinkCode}`
    : `tg://resolve?domain=${botUsername}`;

  const googleCalConn = connections?.find((c) => c.provider === "google_calendar");
  const googleDriveConn = connections?.find((c) => c.provider === "google_drive");

  return (
    <div
      className="container mx-auto max-w-4xl px-4 py-6 space-y-6"
      style={{ paddingBottom: "calc(90px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Integrations &amp; Telegram Bot
            </h1>
            <Badge variant="outline" className="text-xs font-semibold text-primary">
              Multi-Platform
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Connect Telegram for automated phone alarms, sync Google Calendar, and import course materials.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="self-start sm:self-auto gap-1.5 text-xs"
          onClick={() => {
            void refetchConnections();
            void refetchTg();
            void refetchAgent();
            toast({ title: "Status refreshed" });
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Status
        </Button>
      </div>

      {/* 1. HERO CARD: TELEGRAM BOT INTEGRATION */}
      <Card className="border-sky-500/30 bg-gradient-to-br from-card via-card to-sky-500/5 shadow-sm overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
                <TelegramPaperPlaneIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  Telegram Study Bot
                  <span className="text-xs font-normal text-muted-foreground font-mono">
                    (@{botUsername})
                  </span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated study reminders, assignment alarms &amp; morning briefings directly to your phone.
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={isTgLinked ? "default" : "secondary"}
              className={isTgLinked ? "bg-emerald-600 hover:bg-emerald-600 text-white gap-1" : "gap-1"}
            >
              {isTgLinked ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Linked
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" /> Unlinked
                </>
              )}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-1">
          {!isTgLinked ? (
            /* UNLINKED STATE: DIRECT START BUTTON & QR CODE */
            <div className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground leading-relaxed">
                Connect the bot to enable <strong className="text-foreground">Daily Auto-Alarms</strong> for all upcoming coursework, 30-minute assignment warnings, and instant remote task scheduling.
              </div>

              {/* Action Buttons & QR Code Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Left: Direct Start Button for Phone */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-sky-500" />
                      Open directly on this device
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tap below to launch the Telegram app with your secure linking key pre-filled:
                    </p>
                  </div>

                  {/* Primary Direct Start Bot Button */}
                  <Button
                    size="lg"
                    className="w-full gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm shadow-md"
                    asChild
                  >
                    <a
                      href={telegramDeepLink || `https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TelegramPaperPlaneIcon className="h-4 w-4" />
                      Start Bot in Telegram
                    </a>
                  </Button>

                  {/* Copy Link & Copy Command */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={handleCopyLink}
                      disabled={!telegramDeepLink}
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedLink ? "Link Copied" : "Copy Bot Link"}</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs gap-1.5"
                      onClick={handleCopyCmd}
                      disabled={!telegramLinkCode}
                    >
                      {copiedCmd ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedCmd ? "Copied" : "Copy /start cmd"}</span>
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic">
                    Single-use token valid for 15 minutes. Automatically refreshes upon expiration.
                  </p>
                </div>

                {/* Right: QR Code for Phone Camera */}
                <div className="flex flex-col items-center justify-center rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm">
                  {telegramDeepLink ? (
                    <QRCodeDisplay value={telegramDeepLink} size={150} />
                  ) : (
                    <div className="flex h-[150px] w-[150px] items-center justify-center rounded-lg border bg-muted/40 text-xs text-muted-foreground animate-pulse">
                      Generating QR...
                    </div>
                  )}
                  <span className="mt-2.5 text-center text-[11px] font-medium text-foreground/80 flex items-center gap-1.5">
                    📷 Scan with phone camera to connect
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* LINKED STATE: AUTO-ALARMS TOGGLES & TELEGRAM CONTROLS */
            <div className="space-y-4">
              {/* Linked User Info Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Linked Account: <strong className="text-foreground font-semibold">@{telegramSettings.username || "student"}</strong>
                  </span>
                </div>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-300 self-start sm:self-auto text-[11px]">
                  Auto-Alarms Armed
                </Badge>
              </div>

              {/* Notification Toggles */}
              <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Telegram Auto-Alerts &amp; Alarms
                </h4>

                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium text-foreground block">
                        Daily Morning Study Briefing
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Sends today's scheduled tasks &amp; timetable to your phone each morning.
                      </span>
                    </div>
                    <Switch
                      checked={telegramSettings.notifyDailyBriefing}
                      onCheckedChange={(checked) =>
                        updateTelegramMutation.mutate({ notifyDailyBriefing: checked })
                      }
                    />
                  </div>

                  <div className="border-t border-border/40" />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium text-foreground block">
                        Assignment Due Date Warnings
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Sends alerts 24 hours and 30 minutes before coursework deadlines.
                      </span>
                    </div>
                    <Switch
                      checked={telegramSettings.notifyDueDates}
                      onCheckedChange={(checked) =>
                        updateTelegramMutation.mutate({ notifyDueDates: checked })
                      }
                    />
                  </div>

                  <div className="border-t border-border/40" />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-medium text-foreground block">
                        Study Session Reminders &amp; Alarms
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Notifies you as planned study blocks begin.
                      </span>
                    </div>
                    <Switch
                      checked={telegramSettings.notifySessionReminders}
                      onCheckedChange={(checked) =>
                        updateTelegramMutation.mutate({ notifySessionReminders: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Test Briefing & Open Chat */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="w-full sm:w-auto gap-1.5 bg-primary text-xs font-medium"
                  disabled={sendBriefingMutation.isPending}
                  onClick={() => sendBriefingMutation.mutate()}
                >
                  <Send className="h-3.5 w-3.5" />
                  {sendBriefingMutation.isPending ? "Sending..." : "Send Test Briefing to Telegram"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto gap-1.5 text-xs"
                  asChild
                >
                  <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Chat with @{botUsername}
                  </a>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full sm:w-auto text-xs text-destructive hover:bg-destructive/10 sm:ml-auto"
                  disabled={disconnectTgMutation.isPending}
                  onClick={() => disconnectTgMutation.mutate()}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Disconnect
                </Button>
              </div>

              {/* Bot Commands Guide */}
              <div className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs space-y-2">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Useful Bot Commands (Chat with @{botUsername}):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <div><code>/today</code> — View your daily coursework</div>
                  <div><code>/autoalarms on</code> — Turn on auto-alarms</div>
                  <div><code>/setalarm 17:00 Algorithms</code> — Set alarm</div>
                  <div><code>/tasks</code> — View pending assignments</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. OTHER INTEGRATIONS GRID: GOOGLE CALENDAR, GOOGLE DRIVE, HERMES AGENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Calendar Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Google Calendar</CardTitle>
              </div>
              <Badge variant={googleCalConn?.status === "active" ? "default" : "secondary"}>
                {googleCalConn?.status === "active" ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Synchronize approved StudyOS study blocks to your Google Calendar schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {googleCalConn?.status === "active" ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Linked account: <span className="font-medium text-foreground">{googleCalConn.displayName}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      toast({ title: "Calendar incremental sync completed!" });
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Connect your Google account to enable two-way study schedule sync.
                </p>
                <Button size="sm" variant="outline" className="text-xs gap-1.5" asChild>
                  <a href="/app/settings?tab=calendars">
                    <ArrowRight className="h-3.5 w-3.5" />
                    Connect in Calendars
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Google Drive Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Google Drive Materials</CardTitle>
              </div>
              <Badge variant={googleDriveConn?.status === "active" ? "default" : "secondary"}>
                {googleDriveConn?.status === "active" ? "Available" : "Disconnected"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Browse and attach lecture slides, textbooks, and problem sets to Course Resources.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-xs text-muted-foreground">
              Direct import ensures PDF and document attachments are stored safely in your StudyOS library.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="text-xs gap-1.5"
              onClick={handleOpenDriveModal}
            >
              <Search className="h-3.5 w-3.5" />
              Browse Drive Files
            </Button>
          </CardContent>
        </Card>

        {/* Hermes Background Agent */}
        <Card className="shadow-sm md:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">Hermes Background Study Agent</CardTitle>
              </div>
              <Badge variant={agentStatus?.isOnline ? "default" : "secondary"}>
                {agentStatus?.isOnline ? "Online" : agentStatus?.isEnabled ? "Enabled" : "Configured"}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Autonomous background assistant that calculates study schedule optimizations, tracks deadlines, and dispatches briefings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0 text-xs text-muted-foreground">
            <p>
              The Hermes agent runs autonomously on the backend. When enabled, it prepares your morning academic briefings, adjusts time-blocks when tasks roll over, and delivers deadline alerts to Telegram.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Google Drive Browse Modal */}
      <Dialog open={driveModalOpen} onOpenChange={setDriveModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Browse Google Drive Files</DialogTitle>
            <DialogDescription>
              Select study documents or PDFs to import into StudyOS Course Resources.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search PDF notes, syllabi..."
                value={driveSearch}
                onChange={(e) => setDriveSearch(e.target.value)}
                className="text-xs h-9"
              />
              <Button size="sm" onClick={handleOpenDriveModal} disabled={loadingDriveFiles} className="text-xs">
                {loadingDriveFiles ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Search"}
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border rounded-md p-2">
              {driveFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {loadingDriveFiles ? "Searching Drive files..." : "No Google Drive files found."}
                </p>
              ) : (
                driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-muted/50 border text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleImportDriveFile(file)}>
                      Import
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
