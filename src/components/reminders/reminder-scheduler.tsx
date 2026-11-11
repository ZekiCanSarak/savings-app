import { useReminderScheduler } from '@/hooks/use-reminder-scheduler';

/** Invisible: keeps the scheduled reminder in sync with the user's data. */
export function ReminderScheduler() {
  useReminderScheduler();
  return null;
}
