import type { Contribution, IsoDate, RepeatingSaving, SavingsGoal } from '@/types/models';
import { addDays, addMonths, todayIsoDate, yearMonthOf } from '@/utils/dates';
import { totalSaved } from '@/utils/goals';
import { dayInMonth } from '@/utils/payday';

/**
 * Repeating savings ("£100 on the 1st of every month"). Pure functions.
 *
 * Each goal's `repeating.loggedThrough` is the latest day already handled.
 * Every month's day after it, up to today, becomes a real contribution, so
 * totals, charts, streaks and backups need no special cases. Deleting one of
 * those entries doesn't bring it back, because `loggedThrough` has moved on.
 */

export const REPEATING_NOTE = 'Repeating';

/** At most this many months are caught up at once (e.g. after a long time away). */
const MAX_CATCH_UP = 24;

/** The first day a repeating saving goes in after `after` (the 29th–31st clamp to short months). */
export function nextRepeatingDate(dayOfMonth: number, after: IsoDate): IsoDate {
  const start = yearMonthOf(after);
  for (let i = 0; i < 2; i++) {
    const { year, month } = addMonths(start, i);
    const date = dayInMonth(year, month, dayOfMonth);
    if (date > after) return date;
  }
  // Unreachable: next month's date is always later than any day this month.
  const { year, month } = addMonths(start, 2);
  return dayInMonth(year, month, dayOfMonth);
}

/** A new repeating saving whose first payment is on its next day from today (today included). */
export function newRepeatingSaving(amount: number, dayOfMonth: number, today: IsoDate = todayIsoDate()): RepeatingSaving {
  return { amount, dayOfMonth, loggedThrough: addDays(today, -1) };
}

/**
 * Changes an existing repeating saving. Anything already logged stays logged,
 * so the next payment is never earlier than today.
 */
export function updatedRepeatingSaving(
  current: RepeatingSaving,
  amount: number,
  dayOfMonth: number,
  today: IsoDate = todayIsoDate(),
): RepeatingSaving {
  const yesterday = addDays(today, -1);
  return {
    amount,
    dayOfMonth,
    loggedThrough: current.loggedThrough > yesterday ? current.loggedThrough : yesterday,
  };
}

/** The repeating saving with its next payment skipped. */
export function skipNextRepeating(repeating: RepeatingSaving, today: IsoDate = todayIsoDate()): RepeatingSaving {
  const from = repeating.loggedThrough > addDays(today, -1) ? repeating.loggedThrough : addDays(today, -1);
  return { ...repeating, loggedThrough: nextRepeatingDate(repeating.dayOfMonth, from) };
}

/** When the next payment goes in, or null when the goal is already reached. */
export function nextRepeatingPayment(
  goal: SavingsGoal,
  contributions: Contribution[],
  today: IsoDate = todayIsoDate(),
): IsoDate | null {
  if (!goal.repeating) return null;
  if (totalSaved(goal.id, contributions) >= goal.targetAmount) return null;
  const from = goal.repeating.loggedThrough > addDays(today, -1) ? goal.repeating.loggedThrough : addDays(today, -1);
  return nextRepeatingDate(goal.repeating.dayOfMonth, from);
}

export type DueRepeating = {
  /** New savings to log, dated on each month's day. */
  contributions: Omit<Contribution, 'id'>[];
  /** New `loggedThrough` for each goal that moved on. */
  loggedThrough: Record<string, IsoDate>;
};

/**
 * Every repeating payment that has fallen due up to today and isn't logged yet.
 * A payment never takes a goal past its target (the last one is smaller), and
 * once a goal is reached its payments stop but `loggedThrough` still moves on,
 * so raising the target later doesn't log the months in between.
 */
export function dueRepeatingSavings(
  goals: SavingsGoal[],
  contributions: Contribution[],
  today: IsoDate = todayIsoDate(),
): DueRepeating {
  const due: DueRepeating = { contributions: [], loggedThrough: {} };
  for (const goal of goals) {
    const repeating = goal.repeating;
    if (!repeating) continue;
    let remaining = goal.targetAmount - totalSaved(goal.id, contributions);
    let cursor = repeating.loggedThrough;
    for (let i = 0; i < MAX_CATCH_UP; i++) {
      const date = nextRepeatingDate(repeating.dayOfMonth, cursor);
      if (date > today) break;
      cursor = date;
      const amount = Math.min(repeating.amount, remaining);
      if (amount <= 0) continue;
      remaining -= amount;
      due.contributions.push({ goalId: goal.id, amount, date, note: REPEATING_NOTE });
    }
    // After a very long gap, skip whatever is left beyond the catch-up limit.
    if (nextRepeatingDate(repeating.dayOfMonth, cursor) <= today) cursor = today;
    if (cursor !== repeating.loggedThrough) due.loggedThrough[goal.id] = cursor;
  }
  return due;
}
