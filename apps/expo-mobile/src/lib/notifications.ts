import { Platform } from 'react-native';

interface LocalNotificationInput {
  title: string;
  body: string;
  date?: string;
  secondsFromNow?: number;
  reminderId?: string;
}

export type LocalNotificationResult = 'scheduled' | 'permission-denied' | 'unsupported';

let notificationHandlerConfigured = false;

export async function scheduleLocalNotification(
  input: LocalNotificationInput,
): Promise<LocalNotificationResult> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return 'unsupported';
  let trigger: { seconds: number } | { date: Date } | null = null;
  if (
    typeof input.secondsFromNow === 'number' &&
    Number.isFinite(input.secondsFromNow) &&
    input.secondsFromNow > 0
  ) {
    trigger = { seconds: Math.max(1, Math.floor(input.secondsFromNow)) };
  } else if (input.date) {
    const date = new Date(input.date);
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
      trigger = { date };
    }
  }
  if (!trigger) return 'unsupported';

  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('studyos', {
      name: 'StudyOS reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return 'permission-denied';

  const content = {
    title: input.title,
    body: input.body,
    sound: true,
    ...(input.reminderId ? { data: { studyReminderId: input.reminderId } } : {}),
  };
  try {
    if ('date' in trigger && trigger.date.getTime() <= Date.now()) {
      return 'unsupported';
    }
    if ('seconds' in trigger) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: trigger.seconds,
          ...(Platform.OS === 'android' ? { channelId: 'studyos' } : {}),
        },
      });
    } else {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: trigger.date,
          ...(Platform.OS === 'android' ? { channelId: 'studyos' } : {}),
        },
      });
    }
    return 'scheduled';
  } catch (error) {
    console.warn('Could not schedule local notification:', error);
    return 'unsupported';
  }
}

export async function cancelLocalReminderNotifications(reminderId: string): Promise<void> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;
  const Notifications = await import('expo-notifications');
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matches = scheduled.filter(
    (notification) => notification.content.data?.studyReminderId === reminderId,
  );
  await Promise.all(
    matches.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}
