import type { ReminderSettings } from '@/types/models';
import type { ReminderMessage } from '@/utils/reminders';

/**
 * Web version of services/notifications.ts, with the same exports.
 *
 * The web app (Goalpot, added to the home screen) doesn't send notifications:
 * reminders are shown on the Home tab instead. Keeping expo-notifications out
 * of the web bundle also avoids its "not supported on web" warnings.
 * Keep the exports in sync with notifications.ts.
 */

export const notificationsSupported = false;

export type PermissionState = 'granted' | 'undetermined' | 'denied' | 'unsupported';

export function configureNotifications() {}

export async function getPermissionState(): Promise<PermissionState> {
  return 'unsupported';
}

export async function requestPermission(): Promise<PermissionState> {
  return 'unsupported';
}

export async function scheduleReminder(_settings: ReminderSettings, _message: ReminderMessage) {}

export async function cancelReminder() {}

export async function cancelAllReminders() {}

export async function sendTestReminder(_message: ReminderMessage, _seconds = 5) {}

export function onReminderTapped(_onOpenGoal: (goalId: string) => void): () => void {
  return () => {};
}
