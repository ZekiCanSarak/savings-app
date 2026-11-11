import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useContributions, useCurrency, useGoals, useReminderSettings } from '@/hooks/use-app-data';
import {
  cancelReminder,
  getPermissionState,
  notificationsSupported,
  onReminderTapped,
  scheduleReminder,
} from '@/services/notifications';
import { notificationMessage } from '@/utils/reminders';

/** Wait this long after the last change before rescheduling, so bursts of edits only reschedule once. */
const DEBOUNCE_MS = 500;

/**
 * Keeps the scheduled reminder up to date. Mount it once, after onboarding
 * (see src/app/_layout.tsx).
 *
 * A scheduled notification's text is fixed when it's scheduled, so it's
 * rescheduled with fresh text whenever goals, contributions, currency or
 * reminder settings change, and each time the app comes to the foreground
 * (so "per month" amounts stay current as time passes).
 */
export function useReminderScheduler() {
  const goals = useGoals();
  const contributions = useContributions();
  const currency = useCurrency();
  const settings = useReminderSettings();
  // Bumped when the app returns to the foreground, to trigger a reschedule.
  const [foregroundCount, setForegroundCount] = useState(0);

  useEffect(() => {
    if (!notificationsSupported) return;
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setForegroundCount((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!notificationsSupported) return;
    const timer = setTimeout(async () => {
      try {
        if (!settings.enabled || (await getPermissionState()) !== 'granted') {
          await cancelReminder();
          return;
        }
        await scheduleReminder(settings, notificationMessage(goals, contributions, currency));
      } catch (error) {
        console.warn('Could not schedule reminder', error);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [goals, contributions, currency, settings, foregroundCount]);

  // Tapping a reminder opens that goal.
  useEffect(
    () => onReminderTapped((goalId) => router.push({ pathname: '/goals/[id]', params: { id: goalId } })),
    [],
  );
}
