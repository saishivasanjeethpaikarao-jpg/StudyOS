import { Linking, Platform } from 'react-native';

/**
 * Sets a real alarm in the Android device's built-in Clock application
 * (Google Clock, Samsung Clock, Xiaomi Clock, etc.) using the official
 * android.intent.action.SET_ALARM intent.
 */
export async function openClockAlarm(
  startAt: Date | string,
  label: string,
  timezone?: string
): Promise<'opened' | 'unsupported'> {
  if (Platform.OS !== 'android') return 'unsupported';
  const date = typeof startAt === 'string' ? new Date(startAt) : startAt;
  if (!(date instanceof Date) || isNaN(date.getTime())) return 'unsupported';

  let hour: number;
  let minutes: number;
  if (timezone) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
      }).formatToParts(date);
      const hStr = parts.find((p) => p.type === 'hour')?.value ?? '0';
      const mStr = parts.find((p) => p.type === 'minute')?.value ?? '0';
      hour = parseInt(hStr, 10) % 24;
      minutes = parseInt(mStr, 10);
    } catch {
      hour = date.getHours();
      minutes = date.getMinutes();
    }
  } else {
    hour = date.getHours();
    minutes = date.getMinutes();
  }

  const cleanLabel = (label || 'Study Session').slice(0, 100);
  const url = `intent:#Intent;action=android.intent.action.SET_ALARM;S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(cleanLabel)};i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minutes};B.android.intent.extra.alarm.SKIP_UI=false;end`;
  try {
    await Linking.openURL(url);
    return 'opened';
  } catch {
    return 'unsupported';
  }
}

/**
 * Sets a real countdown timer in the Android device's built-in Clock app
 * using android.intent.action.SET_TIMER.
 */
export async function setCountdownTimer(
  minutes: number,
  label: string
): Promise<'opened' | 'unsupported'> {
  if (Platform.OS !== 'android') return 'unsupported';
  const seconds = Math.max(60, minutes * 60);
  const cleanLabel = (label || 'Study Focus Timer').slice(0, 100);
  const url = `intent:#Intent;action=android.intent.action.SET_TIMER;S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(cleanLabel)};i.android.intent.extra.alarm.LENGTH=${seconds};B.android.intent.extra.alarm.SKIP_UI=false;end`;
  try {
    await Linking.openURL(url);
    return 'opened';
  } catch {
    return 'unsupported';
  }
}

/**
 * Opens the device's clock app to view existing alarms.
 */
export async function openClock(): Promise<'opened' | 'unsupported'> {
  if (Platform.OS !== 'android') return 'unsupported';
  const url = 'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end';
  try {
    await Linking.openURL(url);
    return 'opened';
  } catch {
    return 'unsupported';
  }
}
