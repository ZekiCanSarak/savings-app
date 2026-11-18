import type { Contribution, IsoDate } from '@/types/models';
import { addMonths, todayIsoDate, yearMonthOf, type YearMonth } from '@/utils/dates';
import { signedAmount } from '@/utils/goals';

/**
 * Saving streaks and month-by-month history (Home and Budget).
 * A month "counts" when at least some money was saved in it (money taken out
 * doesn't break a streak, but doesn't count as saving either).
 */

export type MonthSummary = {
  /** 'YYYY-MM' */
  key: string;
  month: YearMonth;
  /** Money saved minus money taken out that month (can be negative). */
  net: number;
  /** Money saved that month, ignoring withdrawals. */
  saved: number;
};

// YearMonth months are 0–11, like JavaScript's Date.
const keyOf = ({ year, month }: YearMonth) => `${year}-${String(month + 1).padStart(2, '0')}`;

/** Every month from the first saving to the current month, oldest first. Empty when nothing's saved. */
export function monthlyHistory(contributions: Contribution[], today: IsoDate = todayIsoDate()): MonthSummary[] {
  const deposits = contributions.filter((c) => !c.withdrawal);
  if (deposits.length === 0) return [];
  const first = deposits.reduce((min, c) => (c.date < min ? c.date : min), deposits[0].date);
  const months: MonthSummary[] = [];
  let current = yearMonthOf(first);
  const end = yearMonthOf(today);
  while (current.year < end.year || (current.year === end.year && current.month <= end.month)) {
    const key = keyOf(current);
    const inMonth = contributions.filter((c) => c.date.startsWith(key));
    months.push({
      key,
      month: current,
      net: inMonth.reduce((sum, c) => sum + signedAmount(c), 0),
      saved: inMonth.filter((c) => !c.withdrawal).reduce((sum, c) => sum + c.amount, 0),
    });
    current = addMonths(current, 1);
  }
  return months;
}

export type Streak = {
  /** Months in a row with some saving. */
  months: number;
  /** False when the streak ends last month: nothing saved yet this month. */
  includesThisMonth: boolean;
};

/**
 * The current streak. If nothing is saved yet this month, the streak up to
 * last month still counts (there's time to keep it going).
 */
export function currentStreak(contributions: Contribution[], today: IsoDate = todayIsoDate()): Streak {
  const history = monthlyHistory(contributions, today);
  const savedThisMonth = (history.at(-1)?.saved ?? 0) > 0;
  let months = 0;
  for (let i = history.length - (savedThisMonth ? 1 : 2); i >= 0 && history[i].saved > 0; i--) {
    months += 1;
  }
  return { months, includesThisMonth: savedThisMonth };
}

/** Longest run of months with some saving within a list of months. */
export function longestStreak(history: MonthSummary[]): number {
  let best = 0;
  let run = 0;
  for (const month of history) {
    run = month.saved > 0 ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}
