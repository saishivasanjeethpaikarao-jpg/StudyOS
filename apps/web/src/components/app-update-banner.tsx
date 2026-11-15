/**
 * App update banner & modal - shown when a new mobile or desktop version is available
 * 
 * Provides an automatic interactive dialog prompt and persistent banner
 * allowing students to update StudyOS directly with one tap.
 */

import * as React from 'react';
import { Download, X, RefreshCw, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Badge,
} from '@/components/ui';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { cn } from '@/lib/utils';

export function AppUpdateBanner() {
  const { status, update, progress, installUpdate, dismiss } = useAppUpdate();
  const [modalOpen, setModalOpen] = React.useState(false);

  // Automatically pop up the update modal when an update becomes available
  React.useEffect(() => {
    if (status === 'available') {
      setModalOpen(true);
    }
  }, [status]);

  if (status === 'idle' || status === 'checking' || status === 'error') {
    return null;
  }

  const progressPercent =
    progress?.contentLength && progress.contentLength > 0
      ? Math.round((progress.downloaded / progress.contentLength) * 100)
      : null;

  return (
    <>
      {/* Top Banner */}
      <div className="relative flex items-center justify-center gap-3 bg-primary px-4 py-1.5 text-primary-foreground text-xs shadow-sm">
        {status === 'available' && (
          <>
            <RefreshCw className="h-3 w-3 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
            <span className="truncate">
              New StudyOS update <span className="font-semibold">v{update?.version}</span> is ready!
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="h-5 px-2.5 text-[11px] font-semibold cursor-pointer"
              onClick={installUpdate}
            >
              <Download className="mr-1 h-3 w-3" />
              Update now
            </Button>
            <button
              onClick={dismiss}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-primary-foreground/20 transition-colors cursor-pointer"
              title="Dismiss banner"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        )}

        {(status === 'downloading' || status === 'installing') && (
          <>
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
            <span className="truncate">
              {status === 'installing'
                ? 'Installing update...'
                : progressPercent !== null
                  ? `Downloading update... ${progressPercent}%`
                  : 'Downloading update...'}
            </span>
            {progressPercent !== null && (
              <div className="h-1 w-24 rounded-full bg-primary-foreground/20 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full bg-primary-foreground transition-all duration-300'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Direct Interactive Update Prompt Dialog */}
      <Dialog open={modalOpen && status === 'available'} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">New StudyOS Update Ready</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="default" className="text-[10px] px-2 py-0">
                    Version v{update?.version}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Current: v{update?.currentVersion}</span>
                </div>
              </div>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-3">
              {update?.body || "A new update of StudyOS with Telegram bot auto-alarms, schedule sync, FocusTube video study sessions, and performance improvements is ready to install."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setModalOpen(false);
              }}
            >
              Remind me later
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 font-semibold"
              onClick={() => {
                setModalOpen(false);
                void installUpdate();
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Update Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
