import { Linking, Platform } from 'react-native';

type ClockActionResult = 'opened' | 'invalid-input' | 'unsupported';

function clockParts(startAt: Date | string, timezone?: string): { hour: number; minutes: number } | null {
  const date = typeof startAt === 'string' ? new Date(startAt) : startAt;
  if (!(date instanceof Date) || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
    return null;
  }
  const effectiveTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: effectiveTimezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const rawHour = parseInt(parts.find((part) => part.type === 'hour')?.value ?? '0', 10);
    const hour = rawHour === 24 ? 0 : rawHour % 24;
    const minutes = parseInt(parts.find((part) => part.type === 'minute')?.value ?? '0', 10);
    return { hour, minutes };
  } catch {
    return { hour: date.getHours(), minutes: date.getMinutes() };
  }
}

async function sendAndroidIntent(
  action: string,
  extras: Array<{ key: string; value: string | number | boolean }>,
): Promise<ClockActionResult> {
  if (Platform.OS !== 'android') return 'unsupported';
  try {
    await Linking.sendIntent(action, extras);
    return 'opened';
  } catch {
    return 'unsupported';
  }
}

export async function openClockAlarm(
  startAt: Date | string,
  label: string,
  timezone?: string,
  skipUi = false,
): Promise<ClockActionResult> {
  const parts = clockParts(startAt, timezone);
  if (!parts) return 'invalid-input';
  const { hour, minutes } = parts;
  return sendAndroidIntent('android.intent.action.SET_ALARM', [
    { key: 'android.intent.extra.alarm.HOUR', value: hour },
    { key: 'android.intent.extra.alarm.MINUTES', value: minutes },
    { key: 'android.intent.extra.alarm.MESSAGE', value: (label || 'Study session').slice(0, 100) },
    { key: 'android.intent.extra.alarm.SKIP_UI', value: Boolean(skipUi) },
  ]);
}

export async function setCountdownTimer(
  minutes: number,
  label: string,
): Promise<ClockActionResult> {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'invalid-input';
  return sendAndroidIntent('android.intent.action.SET_TIMER', [
    { key: 'android.intent.extra.alarm.LENGTH', value: Math.max(60, Math.round(minutes * 60)) },
    { key: 'android.intent.extra.alarm.MESSAGE', value: (label || 'Study focus').slice(0, 100) },
    { key: 'android.intent.extra.alarm.SKIP_UI', value: false },
  ]);
}

export async function openClock(): Promise<ClockActionResult> {
  return sendAndroidIntent('android.intent.action.SHOW_ALARMS', []);
}
