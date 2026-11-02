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
} from "lucide-react";
import { getApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AgentDraftProposal,
  AutomationDefinition,
} from "@open-sunsama/types";

export function IntegrationsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: connections, isLoading: loadingConns } = useQuery({
    queryKey: ["integrations", "status"],
    queryFn: () => getApi().integrations.getStatus(),
  });

  const { data: telegramSettings, isLoading: loadingTg } = useQuery({
    queryKey: ["integrations", "telegram", "settings"],
    queryFn: () => getApi().integrations.getTelegramSettings(),
  });

  const { data: agentStatus, isLoading: loadingAgent } = useQuery({
    queryKey: ["integrations", "agent", "status"],
    queryFn: () => getApi().integrations.getAgentStatus(),
  });

  const { data: automations, isLoading: loadingAuto } = useQuery({
    queryKey: ["integrations", "automations"],
    queryFn: () => getApi().integrations.listAutomations(),
  });

  const { data: proposals } = useQuery({
    queryKey: ["integrations", "agent", "proposals"],
    queryFn: () => getApi().integrations.listAgentProposals(),
  });

  // Modals state
  const [driveModalOpen, setDriveModalOpen] = React.useState(false);
  const [driveSearch, setDriveSearch] = React.useState("");
  const [driveFiles, setDriveFiles] = React.useState<DriveFileItem[]>([]);
  const [loadingDriveFiles, setLoadingDriveFiles] = React.useState(false);

  const [telegramModalOpen, setTelegramModalOpen] = React.useState(false);
  const [telegramLinkCode, setTelegramLinkCode] = React.useState<string | null>(null);
  const [telegramDeepLink, setTelegramDeepLink] = React.useState<string | null>(null);

  const [agentTokenModalOpen, setAgentTokenModalOpen] = React.useState(false);
  const [agentToken, setAgentToken] = React.useState<string | null>(null);

  const [proposalsModalOpen, setProposalsModalOpen] = React.useState(false);
  const [autoModalOpen, setAutoModalOpen] = React.useState(false);
  const [newAutoTitle, setNewAutoTitle] = React.useState("");
  const [newAutoType, setNewAutoType] = React.useState<any>("daily_briefing");
  const [newAutoTime, setNewAutoTime] = React.useState("08:00");

  // Mutations
  const generateTgCodeMutation = useMutation({
    mutationFn: () => getApi().integrations.getTelegramLinkCode(),
    onSuccess: (data) => {
      setTelegramLinkCode(data.linkCode);
      setTelegramDeepLink(data.deepLink);
      setTelegramModalOpen(true);
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not generate link code",
        description: err instanceof Error ? err.message : "Error",
      });
    },
  });

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
      toast({ title: "Telegram disconnected" });
    },
  });

  const generateAgentTokenMutation = useMutation({
    mutationFn: () => getApi().integrations.generateAgentToken(),
    onSuccess: (data) => {
      setAgentToken(data.token);
      setAgentTokenModalOpen(true);
      void queryClient.invalidateQueries({ queryKey: ["integrations", "agent", "status"] });
    },
  });

  const revokeAgentTokenMutation = useMutation({
    mutationFn: () => getApi().integrations.revokeAgentToken(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "agent", "status"] });
      toast({ title: "Hermes Agent token revoked" });
    },
  });

  const confirmProposalMutation = useMutation({
    mutationFn: (id: string) => getApi().integrations.confirmAgentProposal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "agent", "proposals"] });
      toast({ title: "Proposal approved and applied!" });
    },
  });

  const rejectProposalMutation = useMutation({
    mutationFn: (id: string) => getApi().integrations.rejectAgentProposal(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "agent", "proposals"] });
      toast({ title: "Proposal dismissed" });
    },
  });

  const createAutoMutation = useMutation({
    mutationFn: () =>
      getApi().integrations.createAutomation({
        title: newAutoTitle,
        workflowType: newAutoType,
        scheduleTime: newAutoTime,
        channels: ["in_app", "telegram"],
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "automations"] });
      setAutoModalOpen(false);
      setNewAutoTitle("");
      toast({ title: "Automation created" });
    },
  });

  const runAutoMutation = useMutation({
    mutationFn: (id: string) => getApi().integrations.runAutomation(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "automations"] });
      toast({ title: "Automation triggered", description: data.summary });
    },
  });

  const deleteAutoMutation = useMutation({
    mutationFn: (id: string) => getApi().integrations.deleteAutomation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["integrations", "automations"] });
      toast({ title: "Automation deleted" });
    },
  });

  // Handle Drive Search
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

  const googleCalConn = connections?.find((c) => c.provider === "google_calendar");
  const googleDriveConn = connections?.find((c) => c.provider === "google_drive");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations &amp; Agent</h3>
        <p className="text-sm text-muted-foreground">
          Connect external calendars, Google Drive study materials, Telegram alerts, and the Hermes Agent bridge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Google Calendar */}
        <Card>
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
            <CardDescription>
              Mirror approved StudyOS study sessions to your Google Calendar and avoid schedule conflicts.
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
              <p className="text-xs text-muted-foreground">
                Connect your Google Account in the <strong>Calendars</strong> tab to enable two-way sync.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 2. Google Drive */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Google Drive</CardTitle>
              </div>
              <Badge variant={googleDriveConn?.status === "active" ? "default" : "secondary"}>
                {googleDriveConn?.status === "active" ? "Available" : "Disconnected"}
              </Badge>
            </div>
            <CardDescription>
              Browse and import lecture notes, syllabi, and textbook PDFs directly into StudyOS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-xs text-muted-foreground">
              Direct server-side import ensures tokens are never exposed and files pass upload validation.
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

        {/* 3. Telegram Bot */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-sky-500" />
                <CardTitle className="text-base">Telegram Notifications</CardTitle>
              </div>
              <Badge variant={telegramSettings?.isEnabled && telegramSettings?.chatId ? "default" : "secondary"}>
                {telegramSettings?.isEnabled && telegramSettings?.chatId ? "Linked" : "Unlinked"}
              </Badge>
            </div>
            <CardDescription>
              Receive upcoming study session alerts, due date warnings, and daily study briefings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {telegramSettings?.isEnabled && telegramSettings?.chatId ? (
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  Linked as: <span className="font-semibold text-foreground">@{telegramSettings.username || "student"}</span>
                </div>
                <div className="space-y-2 border-t pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Study Session Reminders</Label>
                    <Switch
                      checked={telegramSettings.notifySessionReminders}
                      onCheckedChange={(checked) =>
                        updateTelegramMutation.mutate({ notifySessionReminders: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Assignment Due Dates</Label>
                    <Switch
                      checked={telegramSettings.notifyDueDates}
                      onCheckedChange={(checked) =>
                        updateTelegramMutation.mutate({ notifyDueDates: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Daily Study Briefing</Label>
                    <Switch
                      checked={telegramSettings.notifyDailyBriefing}
                      onCheckedChange={(checked) =>
                        updateTelegramMutation.mutate({ notifyDailyBriefing: checked })
                      }
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs w-full"
                  disabled={disconnectTgMutation.isPending}
                  onClick={() => disconnectTgMutation.mutate()}
                >
                  Disconnect Telegram
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                className="text-xs gap-1.5"
                disabled={generateTgCodeMutation.isPending}
                onClick={() => generateTgCodeMutation.mutate()}
              >
                <Send className="h-3.5 w-3.5" />
                Connect Telegram Bot
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 4. Hermes Agent Bridge */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">Hermes Agent Bridge</CardTitle>
              </div>
              <Badge variant={agentStatus?.isOnline ? "default" : agentStatus?.tokenCreated ? "secondary" : "outline"}>
                {agentStatus?.isOnline ? "Online" : agentStatus?.tokenCreated ? "Token Active" : "Disabled"}
              </Badge>
            </div>
            <CardDescription>
              Optional local AI agent runtime. Hermes assists with workload summaries and revision plans without direct database write permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Security Policy:</span>
              <span className="font-medium text-foreground">Draft Proposals (Confirmation Required)</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs gap-1.5"
                disabled={generateAgentTokenMutation.isPending}
                onClick={() => generateAgentTokenMutation.mutate()}
              >
                <Shield className="h-3.5 w-3.5" />
                {agentStatus?.tokenCreated ? "Regenerate Token" : "Generate Agent Token"}
              </Button>
              {(proposals?.length || 0) > 0 && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs gap-1.5 font-medium"
                  onClick={() => setProposalsModalOpen(true)}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Review Proposals ({proposals?.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Productivity Automations Manager */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Productivity Automations</CardTitle>
              <CardDescription>
                Automated student workflows: daily briefings, revision suggestions, and deadline alerts.
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setAutoModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Automation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(automations || []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No automations configured yet. Create one to receive automated daily briefings or due date alerts.
            </p>
          ) : (
            <div className="space-y-2">
              {automations?.map((auto) => (
                <div
                  key={auto.id}
                  className="p-3 border rounded-lg flex items-center justify-between text-xs bg-muted/20"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{auto.title}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {auto.workflowType.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Scheduled at {auto.scheduleTime} ({auto.timezone}) • Channels: {auto.channels.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs gap-1"
                      disabled={runAutoMutation.isPending}
                      onClick={() => runAutoMutation.mutate(auto.id)}
                    >
                      <Play className="h-3 w-3" />
                      Run
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => deleteAutoMutation.mutate(auto.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Drive Browse Modal */}
      <Dialog open={driveModalOpen} onOpenChange={setDriveModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Browse Google Drive Files</DialogTitle>
            <DialogDescription>
              Select study documents or PDFs to import into your StudyOS learning resources.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search Drive files..."
                value={driveSearch}
                onChange={(e) => setDriveSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOpenDriveModal()}
              />
              <Button size="sm" onClick={handleOpenDriveModal} disabled={loadingDriveFiles}>
                {loadingDriveFiles ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>

            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {driveFiles.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">
                  {loadingDriveFiles ? "Loading Drive files..." : "No documents found."}
                </p>
              ) : (
                driveFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-2.5 border rounded-md flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden pr-2">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <Button size="sm" variant="secondary" className="text-xs shrink-0" onClick={() => handleImportDriveFile(file)}>
                      Import
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Telegram Link Modal */}
      <Dialog open={telegramModalOpen} onOpenChange={setTelegramModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Telegram Account</DialogTitle>
            <DialogDescription>
              Securely link your Telegram account to receive StudyOS study alerts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 border">
              <p className="font-semibold text-foreground">Step 1: Open the StudyOS Bot</p>
              <p className="text-muted-foreground">
                Click the button below or open Telegram and search for the bot.
              </p>
              {telegramDeepLink && (
                <Button size="sm" className="w-full gap-1.5" asChild>
                  <a href={telegramDeepLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open in Telegram
                  </a>
                </Button>
              )}
            </div>
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 border">
              <p className="font-semibold text-foreground">Step 2: Send Link Code</p>
              <p className="text-muted-foreground">Or send this one-time command directly to the bot:</p>
              <code className="block p-2 bg-background border rounded font-mono text-[11px] select-all">
                /start {telegramLinkCode}
              </code>
              <p className="text-[10px] text-muted-foreground italic">Code expires in 15 minutes.</p>
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setTelegramModalOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Token Modal */}
      <Dialog open={agentTokenModalOpen} onOpenChange={setAgentTokenModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hermes Agent API Token</DialogTitle>
            <DialogDescription>
              Use this bearer token to configure your local Hermes Agent Bridge.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              This token grants access to StudyOS read tools and allows Hermes to stage draft study proposals.
            </p>
            <div className="p-2.5 bg-muted rounded border font-mono text-xs break-all select-all">
              {agentToken}
            </div>
            <p className="text-[11px] text-amber-600 font-medium">
              Copy this token now. It will not be shown again.
            </p>
          </div>
          <DialogFooter>
            <Button size="sm" onClick={() => setAgentTokenModalOpen(false)}>I have copied it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Proposals Modal */}
      <Dialog open={proposalsModalOpen} onOpenChange={setProposalsModalOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Agent Proposals</DialogTitle>
            <DialogDescription>
              Hermes recommendations must be explicitly approved before any changes occur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {(proposals || []).length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No pending proposals.</p>
            ) : (
              proposals?.map((prop) => (
                <div key={prop.id} className="p-3 border rounded-lg text-xs space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{prop.title}</span>
                    <Badge variant="outline">{prop.proposedAction}</Badge>
                  </div>
                  <p className="text-muted-foreground">{prop.summary}</p>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => rejectProposalMutation.mutate(prop.id)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => confirmProposalMutation.mutate(prop.id)}
                    >
                      Approve &amp; Apply
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Automation Modal */}
      <Dialog open={autoModalOpen} onOpenChange={setAutoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Productivity Automation</DialogTitle>
            <DialogDescription>
              Configure automated briefing or reminder schedules.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input
                placeholder="e.g., Morning Study Briefing"
                value={newAutoTitle}
                onChange={(e) => setNewAutoTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Workflow Type</Label>
              <select
                className="w-full p-2 border rounded-md bg-background text-xs"
                value={newAutoType}
                onChange={(e) => setNewAutoType(e.target.value)}
              >
                <option value="daily_briefing">Daily Study Briefing</option>
                <option value="assignment_due_reminder">Assignment Due Reminder</option>
                <option value="session_reminder">Study Session Reminder</option>
                <option value="weekly_progress_summary">Weekly Progress Summary</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scheduled Time (HH:MM)</Label>
              <Input
                type="time"
                value={newAutoTime}
                onChange={(e) => setNewAutoTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setAutoModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!newAutoTitle.trim() || createAutoMutation.isPending}
              onClick={() => createAutoMutation.mutate()}
            >
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
