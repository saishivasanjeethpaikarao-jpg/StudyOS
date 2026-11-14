import * as React from "react";
import { Bell, Clock, Smartphone, Sparkles } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Switch,
  Skeleton,
} from "@/components/ui";
import { toast } from "@/hooks/use-toast";
import { TaskReminderDialog, EmailNotificationsDialog } from "@/components/settings";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  requestNotificationPermission,
  getNotificationPermissionStatus,
} from "@/hooks/useNotificationPreferences";
import { getAutoAlarmsEnabled, setAutoAlarmsEnabled, LAST_SYNC_STORAGE_KEY } from "@/hooks/useAutoAlarmsSync";
import { triggerNativeAlarm, scheduleNativeNotification, isNativePlatform } from "@/lib/native-bridge";

/** Get task reminders status text */
function getTaskReminderStatus(preferences: { taskRemindersEnabled: boolean; reminderTiming: number } | undefined) {
  if (!preferences) return "";
  if (!preferences.taskRemindersEnabled) return "Disabled";
  const timing = preferences.reminderTiming;
  if (timing === 60) return "1 hour before";
  if (timing === 120) return "2 hours before";
  return `${timing} min before`;
}

/** Get email status text */
function getEmailStatus(preferences: { emailNotificationsEnabled: boolean; dailySummaryEnabled: boolean } | undefined) {
  if (!preferences) return "";
  if (!preferences.emailNotificationsEnabled) return "Disabled";
  if (preferences.dailySummaryEnabled) return "Daily summary";
  return "Enabled";
}

/**
 * Notification settings component for managing notification preferences
 */
export function NotificationSettings() {
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const [taskReminderDialogOpen, setTaskReminderDialogOpen] = React.useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = React.useState(false);
  const [pushLoading, setPushLoading] = React.useState(false);
  const [autoAlarms, setAutoAlarms] = React.useState<boolean>(() => getAutoAlarmsEnabled());
  const isNative = React.useMemo(() => isNativePlatform(), []);
  const permissionStatus = React.useMemo(() => getNotificationPermissionStatus(), []);

  const handleToggleAutoAlarms = (checked: boolean) => {
    setAutoAlarms(checked);
    setAutoAlarmsEnabled(checked);
    if (checked) {
      localStorage.removeItem(LAST_SYNC_STORAGE_KEY);
      toast({
        title: "Auto-Alarms Enabled",
        description: "StudyOS will automatically schedule daily phone alarms and alerts for your study sessions and assignments.",
      });
    } else {
      toast({
        title: "Auto-Alarms Paused",
        description: "Automatic phone alarm scheduling has been turned off.",
      });
    }
  };

  const handleTestAlarm = () => {
    const testDate = new Date(Date.now() + 5000);
    scheduleNativeNotification(
      "⏰ StudyOS Test Alert",
      "Native bridge and background notifications are operating perfectly!",
      testDate,
      "test-alarm"
    );
    triggerNativeAlarm(new Date(Date.now() + 60000), "StudyOS Test Alarm");
    toast({
      title: "Test Alarm Triggered",
      description: "Notification queued and Android Clock alarm opened for 1 min from now.",
    });
  };

  const handleTaskReminderSave = async (taskRemindersEnabled: boolean, reminderTiming: number) => {
    await updatePreferences.mutateAsync({ taskRemindersEnabled, reminderTiming });
    toast({ title: "Task reminders updated", description: "Your task reminder settings have been saved." });
  };

  const handleEmailSave = async (emailNotificationsEnabled: boolean, dailySummaryEnabled: boolean) => {
    await updatePreferences.mutateAsync({ emailNotificationsEnabled, dailySummaryEnabled });
    toast({ title: "Email notifications updated", description: "Your email notification settings have been saved." });
  };

  const handlePushToggle = async () => {
    if (!permissionStatus.supported) {
      toast({ variant: "destructive", title: "Not supported", description: "Browser notifications are not supported in this browser." });
      return;
    }
    const currentEnabled = preferences?.pushNotificationsEnabled ?? false;
    setPushLoading(true);
    try {
      if (!currentEnabled) {
        const permission = await requestNotificationPermission();
        if (permission === "granted") {
          await updatePreferences.mutateAsync({ pushNotificationsEnabled: true });
          toast({ title: "Browser notifications enabled", description: "You will now receive browser notifications." });
        } else if (permission === "denied") {
          toast({ variant: "destructive", title: "Permission denied", description: "Please enable notifications in your browser settings." });
        }
      } else {
        await updatePreferences.mutateAsync({ pushNotificationsEnabled: false });
        toast({ title: "Browser notifications disabled", description: "You will no longer receive browser notifications." });
      }
    } finally {
      setPushLoading(false);
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-destructive text-[13px]">Failed to load notification preferences</p>
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure how you receive notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Task Reminders */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium">Task Reminders</p>
                <p className="text-xs text-muted-foreground">Get notified before scheduled tasks</p>
                {isLoading ? (
                  <Skeleton className="h-3 w-20 mt-1" />
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Status: {getTaskReminderStatus(preferences)}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setTaskReminderDialogOpen(true)} disabled={isLoading}>
                Configure
              </Button>
            </div>
            <Separator />
            {/* Email Notifications */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium">Email Notifications</p>
                <p className="text-xs text-muted-foreground">Receive daily summary emails</p>
                {isLoading ? (
                  <Skeleton className="h-3 w-16 mt-1" />
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-0.5">Status: {getEmailStatus(preferences)}</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} disabled={isLoading}>
                Configure
              </Button>
            </div>
            <Separator />
            {/* Browser Notifications */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium">Browser Notifications</p>
                <p className="text-xs text-muted-foreground">Get notifications in your browser</p>
                {!permissionStatus.supported && (
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-0.5">Your browser doesn't support notifications</p>
                )}
                {permissionStatus.supported && permissionStatus.permission === "denied" && (
                  <p className="text-[10px] text-yellow-600 dark:text-yellow-500 mt-0.5">Notifications are blocked in browser settings</p>
                )}
              </div>
              {isLoading ? (
                <Skeleton className="h-5 w-9" />
              ) : (
                <Switch
                  checked={preferences?.pushNotificationsEnabled ?? false}
                  onCheckedChange={handlePushToggle}
                  disabled={pushLoading || !permissionStatus.supported || permissionStatus.permission === "denied"}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Set Phone Alarms & Reminders Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-orange-500" />
            <CardTitle>Phone Alarms & Daily Reminders</CardTitle>
          </div>
          <CardDescription>
            Automatically wake up native Android Clock alarms and high-priority heads-up alerts for today's study blocks and assignment deadlines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium">Auto-Set Daily Alarms & Alerts</p>
                <p className="text-xs text-muted-foreground">
                  Synchronize native phone alarms and background notifications automatically whenever you open StudyOS or new tasks are scheduled.
                </p>
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-1">
                  {autoAlarms ? "Active · Automatically protects your daily study flow" : "Paused · Manual alarm buttons only"}
                </p>
              </div>
              <Switch
                checked={autoAlarms}
                onCheckedChange={handleToggleAutoAlarms}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium">Native Device Bridge</p>
                <p className="text-xs text-muted-foreground">
                  {isNative
                    ? "Connected to Android Clock & Notification Manager"
                    : "Running in web browser mode (alarms use browser notifications)"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={handleTestAlarm}
              >
                <Bell className="h-3.5 w-3.5 text-orange-500" />
                Test Alarm Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <TaskReminderDialog
        open={taskReminderDialogOpen}
        onOpenChange={setTaskReminderDialogOpen}
        taskRemindersEnabled={preferences?.taskRemindersEnabled ?? true}
        reminderTiming={preferences?.reminderTiming ?? 15}
        onSave={handleTaskReminderSave}
        isLoading={isLoading}
      />
      <EmailNotificationsDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        emailNotificationsEnabled={preferences?.emailNotificationsEnabled ?? false}
        dailySummaryEnabled={preferences?.dailySummaryEnabled ?? false}
        onSave={handleEmailSave}
        isLoading={isLoading}
      />
    </>
  );
}

export default NotificationSettings;
