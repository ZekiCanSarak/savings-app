import type {
  Contribution,
  CurrencyCode,
  IsoDate,
  ReminderSettings,
  SavingsGoal,
} from '@/types/models';
import { formatMonthYear, parseIsoDate, savingMonthsLeft, toIsoDate, todayIsoDate } from '@/utils/dates';
import { amountRemaining, monthlyAmountNeeded, percentComplete, totalSaved } from '@/utils/goals';
import { formatMoney } from '@/utils/money';

/**
 * Reminder messages, shared by notifications and the Home tab.
 * Pure functions (no React, no notification APIs).
 */

export type ReminderMessage = {
  goalId: string | null;
  /** e.g. "You have £340.00 left to save for New laptop 💻" */
  title: string;
  /** e.g. "Saving £68.00 a month gets you there by March 2027." */
  body: string;
};

/**
 * How far behind schedule a goal is, as a share of its target (higher = further behind).
 *
 * "On schedule" means saving evenly from the day the goal was created to its
 * target date. 0.25 means 25% of the target behind; negative means ahead.
 * A goal whose date has passed counts as behind by everything left, plus 1,
 * so it always ranks first. Returns null for goals without a target date.
 */
export function behindSchedule(
  goal: SavingsGoal,
  contributions: Contribution[],
  today: IsoDate = todayIsoDate(),
): number | null {
  if (!goal.targetDate || goal.targetAmount <= 0) return null;
  const saved = totalSaved(goal.id, contributions);
  if (goal.targetDate < today) return 1 + amountRemaining(goal, contributions) / goal.targetAmount;

  const start = parseIsoDate(toIsoDate(new Date(goal.createdAt))).getTime();
  const end = parseIsoDate(goal.targetDate).getTime();
  const now = parseIsoDate(today).getTime();
  const elapsedShare = end > start ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 1;
  return (goal.targetAmount * elapsedShare - saved) / goal.targetAmount;
}

/**
 * Unfinished goals, the one that most needs attention first:
 * goals with a target date, furthest behind schedule first, then goals
 * without a date, least progress first.
 */
export function goalsNeedingAttention(
  goals: SavingsGoal[],
  contributions: Contribution[],
  today: IsoDate = todayIsoDate(),
): SavingsGoal[] {
  const unfinished = goals.filter((g) => amountRemaining(g, contributions) > 0);
  const dated = unfinished
    .map((goal) => ({ goal, behind: behindSchedule(goal, contributions, today) }))
    .filter((x): x is { goal: SavingsGoal; behind: number } => x.behind !== null)
    .sort((a, b) => b.behind - a.behind)
    .map((x) => x.goal);
  const undated = unfinished
    .filter((g) => !g.targetDate)
    .sort((a, b) => percentComplete(a, contributions) - percentComplete(b, contributions));
  return [...dated, ...undated];
}

export function reminderForGoal(
  goal: SavingsGoal,
  contributions: Contribution[],
  currency: CurrencyCode,
  today: IsoDate = todayIsoDate(),
): ReminderMessage {
  const money = (amount: number) => formatMoney(amount, currency);
  const remaining = amountRemaining(goal, contributions);
  const title = `You have ${money(remaining)} left to save for ${goal.name} ${goal.emoji}`;

  let body: string;
  if (goal.targetDate && savingMonthsLeft(goal.targetDate, today) === 0) {
    body = `Your target date (${formatMonthYear(goal.targetDate)}) has passed. Open the app to pick a new one.`;
  } else if (goal.targetDate) {
    const monthly = monthlyAmountNeeded(goal, contributions, today) ?? remaining;
    body = `Saving ${money(monthly)} a month gets you there by ${formatMonthYear(goal.targetDate)}.`;
  } else {
    const percent = percentComplete(goal, contributions);
    body =
      percent > 0
        ? `You’re ${percent}% of the way there. Keep it up!`
        : 'Every little helps. Add your first saving when you can.';
  }
  return { goalId: goal.id, title, body };
}

/** Messages for the goals that most need attention, most urgent first. */
export function reminderMessages(
  goals: SavingsGoal[],
  contributions: Contribution[],
  currency: CurrencyCode,
  today: IsoDate = todayIsoDate(),
  limit = 3,
): ReminderMessage[] {
  return goalsNeedingAttention(goals, contributions, today)
    .slice(0, limit)
    .map((goal) => reminderForGoal(goal, contributions, currency, today));
}

/** What the scheduled notification says: the most urgent goal, or a friendly fallback. */
export function notificationMessage(
  goals: SavingsGoal[],
  contributions: Contribution[],
  currency: CurrencyCode,
  today: IsoDate = todayIsoDate(),
): ReminderMessage {
  const [first] = reminderMessages(goals, contributions, currency, today, 1);
  if (first) return first;
  if (goals.length === 0) {
    return {
      goalId: null,
      title: 'Ready to start saving? 🌱',
      body: 'Set up your first goal and we’ll help you get there.',
    };
  }
  return {
    goalId: null,
    title: 'All your goals are complete 🎉',
    body: 'Brilliant work. Fancy setting a new one?',
  };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 1 → '1st', 2 → '2nd', 23 → '23rd', 11 → '11th'. */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** 24-hour time like '18:00', matching UK phones' default. */
export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function weekdayName(weekday: number): string {
  return WEEKDAYS[(weekday - 1 + 7) % 7];
}

/** 'Every Sunday at 18:00' or 'On the 1st of every month at 18:00'. */
export function describeSchedule(settings: ReminderSettings): string {
  const time = formatTime(settings.hour, settings.minute);
  return settings.frequency === 'weekly'
    ? `Every ${weekdayName(settings.weekday)} at ${time}`
    : `On the ${ordinal(settings.dayOfMonth)} of every month at ${time}`;
}
