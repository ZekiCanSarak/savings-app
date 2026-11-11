import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Platform } from 'react-native';

import type { ReminderSettings } from '@/types/models';
import type { ReminderMessage } from '@/utils/reminders';

/**
 * The only file that talks to expo-notifications. Screens and hooks use these
 * functions so the rules (channel first, one reminder at a time, no web) live
 * in one place.
 *
 * Everything here is LOCAL: notifications are scheduled on the phone itself,
 * with no server or push tokens.
 */

/** expo-notifications doesn't schedule notifications in a web browser. */
export const notificationsSupported = Platform.OS !== 'web';

/** Fixed id, so scheduling again replaces the old reminder instead of adding a second. */
const REMINDER_ID = 'savings-reminder';
const TEST_ID = 'savings-reminder-test';
const CHANNEL_ID = 'savings-reminders';

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'unsupported';

/** Call once at startup. Decides how notifications look while the app is open. */
export function configureNotifications() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Android 13+ only shows the permission prompt once a channel exists, so this
 * must run before asking. Channels are also what users see in Android settings.
 */
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Savings reminders',
    description: 'Gentle reminders about your savings goals',
    importance: AndroidImportance.DEFAULT,
  });
}

function toPermissionState(status: Notifications.NotificationPermissionsStatus): PermissionState {
  if (status.granted) return 'granted';
  // iOS "provisional" = delivered quietly to Notification Centre; still counts as allowed.
  if (status.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  if (status.status === 'undetermined' || status.canAskAgain) return 'undetermined';
  return 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  return toPermissionState(await Notifications.getPermissionsAsync());
}

/** Shows the system prompt (if the phone still allows asking). Only call after explaining why. */
export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  await ensureAndroidChannel();
  return toPermissionState(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: true },
    }),
  );
}

function triggerFor(settings: ReminderSettings): Notifications.NotificationTriggerInput {
  const { hour, minute } = settings;
  return settings.frequency === 'weekly'
    ? {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: settings.weekday,
        hour,
        minute,
        channelId: CHANNEL_ID,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: settings.dayOfMonth,
        hour,
        minute,
        channelId: CHANNEL_ID,
      };
}

function contentFor(message: ReminderMessage): Notifications.NotificationContentInput {
  return {
    title: message.title,
    body: message.body,
    data: message.goalId ? { goalId: message.goalId } : {},
  };
}

/** Replaces the repeating reminder with this message and schedule. */
export async function scheduleReminder(settings: ReminderSettings, message: ReminderMessage) {
  if (!notificationsSupported) return;
  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: contentFor(message),
    trigger: triggerFor(settings),
  });
}

export async function cancelReminder() {
  if (!notificationsSupported) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
}

/** Sends one reminder in a few seconds, so the user can see what it looks like. */
export async function sendTestReminder(message: ReminderMessage, seconds = 5) {
  if (!notificationsSupported) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    identifier: TEST_ID,
    content: contentFor(message),
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: CHANNEL_ID,
    },
  });
}

/** Calls `onOpenGoal` when the user taps a reminder that's about a goal. Returns an unsubscribe. */
export function onReminderTapped(onOpenGoal: (goalId: string) => void): () => void {
  if (!notificationsSupported) return () => {};
  const open = (response: Notifications.NotificationResponse | null) => {
    const goalId = response?.notification.request.content.data?.goalId;
    if (typeof goalId === 'string') onOpenGoal(goalId);
  };
  // Covers the app being opened from a tap while it was fully closed.
  const last = Notifications.getLastNotificationResponse();
  if (last) {
    open(last);
    Notifications.clearLastNotificationResponse();
  }
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}
