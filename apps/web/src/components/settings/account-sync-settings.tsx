import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  Monitor,
  Smartphone,
  Laptop,
  RotateCw,
  ShieldCheck,
  Link2,
  LogOut,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { getApi, API_BASE_URL } from "@/lib/api";
import { useAccountSync } from "@/hooks/useAccountSync";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const API_URL = API_BASE_URL;
const deviceIcon = (platform: string) =>
  platform === "android" || platform === "ios"
    ? Smartphone
    : platform === "desktop"
      ? Laptop
      : Monitor;

export function AccountSyncSettings() {
  const { user, logout } = useAuth();
  const {
    state,
    error,
    devices,
    clientDeviceId,
    syncNow,
    revokeDevice,
    pendingMutationCount,
    hasConflicts,
    clearConflicts,
  } = useAccountSync();
  const { data: identities = [] } = useQuery({
    queryKey: ["account", "identities"],
    queryFn: () => getApi().account.identities(),
  });
  const isGoogleLinked = identities.some(
    (identity) => identity.provider === "google"
  );
  const activeDevices = devices.filter((device) => !device.revokedAt);

  const handleRevoke = async (id: string) => {
    try {
      await revokeDevice(id);
      toast({
        title: "Device disconnected",
        description: "Its StudyOS sessions have been signed out.",
      });
    } catch (cause) {
      toast({
        variant: "destructive",
        title: "Couldn't disconnect device",
        description: cause instanceof Error ? cause.message : "Try again.",
      });
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>StudyOS account</CardTitle>
          <CardDescription>
            Your StudyOS data belongs to this account and is available when you
            sign in on another device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {user?.name || user?.email}
            </p>
            {user?.name && (
              <p className="truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {isGoogleLinked
                    ? "Google account connected"
                    : "Google sign-in"}
                </p>
                <p className="break-all text-xs text-muted-foreground">
                  {isGoogleLinked
                    ? identities.find(
                        (identity) => identity.provider === "google"
                      )?.emailAtLink
                    : "Connect Google to use the same StudyOS account on your devices."}
                </p>
              </div>
            </div>
            {!isGoogleLinked && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() =>
                  window.location.assign(`${API_URL}/auth/google/link`)
                }
              >
                <Link2 className="mr-2 h-4 w-4" />
                Connect Google
              </Button>
            )}
          </div>
          <Button type="button" variant="outline" onClick={() => void logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Sync status
            </CardTitle>
            <CardDescription>
              StudyOS saves changes to your account and checks for updates from
              your other devices.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={state === "syncing" || state === "starting"}
            onClick={() => void syncNow()}
          >
            <RotateCw
              className={`mr-2 h-4 w-4 ${state === "syncing" ? "animate-spin" : ""}`}
            />
            Sync now
          </Button>
        </CardHeader>
        <CardContent>
          <p role="status" aria-live="polite" className="text-sm">
            {pendingMutationCount > 0
              ? `${pendingMutationCount} change${pendingMutationCount === 1 ? "" : "s"} waiting to sync`
              : state === "idle"
                ? "Connected — up to date"
                : state === "syncing" || state === "starting"
                  ? "Connecting this device…"
                  : state === "offline"
                    ? "Offline — reconnect to sync changes"
                    : "Sync needs attention"}
          </p>
          {error && state === "error" && (
            <p className="mt-1 text-sm text-destructive">{error}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Task, Subject and Assignment changes made offline are saved in this
            browser and retried when you reconnect. Other changes still require
            an active connection.
          </p>
          {hasConflicts && (
            <div className="mt-3 flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
              <span>Some offline changes conflict with newer data on the server.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={clearConflicts}
              >
                Discard conflicting changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected devices</CardTitle>
          <CardDescription>
            Devices signed in to this StudyOS account. Disconnect a device to
            end its sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeDevices.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No active devices yet.
            </p>
          )}
          {activeDevices.map((device) => {
            const Icon = deviceIcon(device.platform);
            const isCurrent = device.clientDeviceId === clientDeviceId;
            return (
              <div
                key={device.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {device.displayName}
                      {isCurrent ? " · This device" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {device.lastSuccessfulSyncAt
                        ? `Synced ${formatDistanceToNow(new Date(device.lastSuccessfulSyncAt), { addSuffix: true })}`
                        : "Syncing for the first time"}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isCurrent}
                  onClick={() => void handleRevoke(device.id)}
                >
                  {isCurrent ? "Current" : "Disconnect"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
