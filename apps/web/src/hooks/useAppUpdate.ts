/**
 * Hook for desktop app auto-updates
 * 
 * Checks for updates on mount (desktop only) and provides
 * state + actions for the update UI.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { isDesktop } from '@/lib/desktop';
import { isNativeMobile } from '@/lib/native-bridge';
import {
  checkForUpdate,
  downloadAndInstallUpdate,
  type UpdateInfo,
  type UpdateProgress,
} from '@/lib/updater';

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error';

export interface AppUpdateState {
  status: UpdateStatus;
  update: UpdateInfo | null;
  progress: UpdateProgress | null;
  error: string | null;
  checkForUpdate: () => void;
  installUpdate: () => void;
  dismiss: () => void;
}

const CURRENT_APP_VERSION = "1.1.0";

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function checkMobileUpdate(): Promise<UpdateInfo | null> {
  if (typeof window === "undefined") return null;
  try {
    const currentVer = window.StudyOSNative?.getAppVersionName?.() || CURRENT_APP_VERSION;
    const res = await fetch("https://api.github.com/repos/saishivasanjeethpaikarao-jpg/StudyOS/releases/latest", {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: string; published_at?: string; body?: string };
    const latestTag = (data.tag_name || "").replace(/^v/, "");
    if (latestTag && compareSemver(latestTag, currentVer) > 0) {
      return {
        version: latestTag,
        currentVersion: currentVer,
        date: data.published_at ?? null,
        body: data.body ?? "New version with the latest features and fixes.",
      };
    }
  } catch {
    // network or rate-limit
  }
  return null;
}

export function useAppUpdate(): AppUpdateState {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const hasCheckedRef = useRef(false);

  const doCheck = useCallback(async () => {
    const desktop = isDesktop();
    const mobile = isNativeMobile() || (typeof window !== "undefined" && window.__STUDYOS_PLATFORM__ === "android");

    if (!desktop && !mobile) return;

    setStatus('checking');
    setError(null);

    try {
      if (desktop) {
        const result = await checkForUpdate();
        if (result) {
          setUpdate(result);
          setStatus('available');
          setDismissed(false);
        } else {
          setStatus('idle');
        }
      } else if (mobile) {
        const result = await checkMobileUpdate();
        if (result) {
          setUpdate(result);
          setStatus('available');
          setDismissed(false);
        } else {
          setStatus('idle');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err || 'Failed to check for updates'));
      setStatus('error');
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const desktop = isDesktop();
    const mobile = isNativeMobile() || (typeof window !== "undefined" && window.__STUDYOS_PLATFORM__ === "android");

    if (desktop) {
      setStatus('downloading');
      setProgress(null);
      setError(null);

      try {
        await downloadAndInstallUpdate((p) => {
          setProgress(p);
        });
        setStatus('installing');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err || 'Failed to install update'));
        setStatus('error');
      }
    } else if (mobile) {
      setStatus('installing');
      if (typeof window !== "undefined" && window.StudyOSNative?.installApkUpdate) {
        window.StudyOSNative.installApkUpdate("https://studyos-web-8ruc.onrender.com/downloads/StudyOS.apk");
      } else if (typeof window !== "undefined") {
        window.location.assign("/downloads/StudyOS.apk");
      }
      setTimeout(() => setStatus('idle'), 4000);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Check on mount (once)
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    // Delay check by 3s to not block app startup
    const timer = setTimeout(doCheck, 3000);
    return () => clearTimeout(timer);
  }, [doCheck]);

  // If dismissed, report as idle
  const effectiveStatus = dismissed && status === 'available' ? 'idle' : status;

  return {
    status: effectiveStatus,
    update,
    progress,
    error,
    checkForUpdate: doCheck,
    installUpdate,
    dismiss,
  };
}
