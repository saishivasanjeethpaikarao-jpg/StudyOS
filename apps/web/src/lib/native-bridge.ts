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
      logout?: () => void;
    };
  }
}

export function isNativeMobile(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.__STUDYOS_NATIVE__ || window.ReactNativeWebView);
}

export function triggerNativeAlarm(
  startAt: Date | string,
  label: string,
  timezone?: string
): boolean {
  if (typeof window === "undefined") return false;
  if (window.StudyOSNative?.setAlarm) {
    window.StudyOSNative.setAlarm(startAt, label, timezone);
    return true;
  }
  if (window.ReactNativeWebView?.postMessage) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "SET_ALARM",
        startAt: typeof startAt === "string" ? startAt : startAt.toISOString(),
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
