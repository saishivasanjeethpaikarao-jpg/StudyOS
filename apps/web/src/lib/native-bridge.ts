/**
 * Native bridge communication for mobile (Android / iOS) and desktop shells.
 * Dispatches commands to Android Alarm Manager / Clock app when running inside the app container.
 */

declare global {
  interface Window {
    __STUDYOS_NATIVE__?: boolean;
    __STUDYOS_PLATFORM__?: string;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    StudyOSNative?: {
      setAlarm?: (startAt: Date | string, label: string, timezone?: string) => void;
      setTimer?: (minutes: number, label: string) => void;
      openClock?: () => void;
      scheduleNotification?: (title: string, body: string, date: Date | string, reminderId?: string) => void;
      cancelReminderNotification?: (reminderId: string) => void;
      setToken?: (token: string) => void;
      startGoogleAuth?: (url: string) => void;
      getAppVersionName?: () => string;
      installApkUpdate?: (apkUrl?: string) => void;
      logout?: () => void;
    };
  }
}

export function isNativeMobile(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    window.StudyOSNative ||
    window.__STUDYOS_NATIVE__ ||
    window.ReactNativeWebView ||
    ((window as any).Capacitor?.isNativePlatform?.())
  );
}

export const isNativePlatform = isNativeMobile;

export function getGoogleAuthStartUrl(
  apiBaseUrl: string,
  nativeMobile = isNativeMobile()
): string {
  const url = new URL("/auth/google/start", apiBaseUrl);
  if (nativeMobile) {
    url.searchParams.set("mobile_redirect_uri", "studyos://auth/callback");
  }
  return url.toString();
}

export function startGoogleAuth(apiBaseUrl: string): void {
  const url = getGoogleAuthStartUrl(apiBaseUrl);
  if (typeof window === "undefined") return;
  if (window.StudyOSNative?.startGoogleAuth) {
    window.StudyOSNative.startGoogleAuth(url);
    return;
  }
  window.location.assign(url);
}

export function notifyNativeTokenChanged(token: string): void {
  if (typeof window === "undefined") return;
  if (window.StudyOSNative?.setToken) {
    window.StudyOSNative.setToken(token);
    return;
  }
  window.ReactNativeWebView?.postMessage(
    JSON.stringify({ type: "SET_TOKEN", token })
  );
}

export function triggerNativeAlarm(
  startAt: Date | string,
  label: string,
  timezone?: string
): boolean {
  if (typeof window === "undefined") return false;
  const scheduledAt =
    startAt instanceof Date
      ? Number.isNaN(startAt.getTime())
        ? null
        : startAt.toISOString()
      : startAt;
  if (!scheduledAt) return false;
  if (window.StudyOSNative?.setAlarm) {
    window.StudyOSNative.setAlarm(scheduledAt, label, timezone);
    return true;
  }
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "SET_ALARM",
        startAt: scheduledAt,
        label,
        timezone,
      })
    );
    return true;
  }
  return false;
}

export function triggerNativeTimer(minutes: number, label: string): boolean {
  if (typeof window === "undefined") return false;
  if (window.StudyOSNative?.setTimer) {
    window.StudyOSNative.setTimer(minutes, label);
    return true;
  }
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "SET_TIMER",
        minutes,
        label,
      })
    );
    return true;
  }
  return false;
}

export function openNativeClock(): boolean {
  if (typeof window === "undefined") return false;
  if (window.StudyOSNative?.openClock) {
    window.StudyOSNative.openClock();
    return true;
  }
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "OPEN_CLOCK",
      })
    );
    return true;
  }
  return false;
}

export function scheduleNativeNotification(
  title: string,
  body: string,
  date: Date | string,
  reminderId?: string
): boolean {
  if (typeof window === "undefined") return false;
  const scheduledDate =
    date instanceof Date
      ? Number.isNaN(date.getTime())
        ? null
        : date.toISOString()
      : date;
  if (!scheduledDate) return false;
  if (window.StudyOSNative?.scheduleNotification) {
    window.StudyOSNative.scheduleNotification(
      title,
      body,
      scheduledDate,
      reminderId
    );
    return true;
  }
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "SCHEDULE_NOTIFICATION",
        title,
        body,
        date: scheduledDate,
        reminderId,
      })
    );
    return true;
  }
  return false;
}

export function cancelNativeReminderNotification(reminderId: string): void {
  if (typeof window === "undefined") return;
  if (window.StudyOSNative?.cancelReminderNotification) {
    window.StudyOSNative.cancelReminderNotification(reminderId);
    return;
  }
  window.ReactNativeWebView?.postMessage(
    JSON.stringify({ type: "CANCEL_REMINDER_NOTIFICATION", reminderId })
  );
}

export function notifyNativeLogout(): void {
  if (typeof window === "undefined") return;
  if (window.StudyOSNative?.logout) {
    window.StudyOSNative.logout();
    return;
  }
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "LOGOUT",
      })
    );
  }
}
