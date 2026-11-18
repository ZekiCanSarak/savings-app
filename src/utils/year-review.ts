import type { Contribution, IsoDate, SavingsGoal } from '@/types/models';
import { todayIsoDate } from '@/utils/dates';
import { signedAmount } from '@/utils/goals';
import { longestStreak, monthlyHistory, type MonthSummary } from '@/utils/streaks';

/**
 * "Year in review": a summary of one calendar year. Pure functions.
 */

/** The date a goal first reached its target, or null if it never has. */
export function goalReachedOn(goal: SavingsGoal, contributions: Contribution[]): IsoDate | null {
  const entries = contributions
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  let running = 0;
  for (const entry of entries) {
    running += signedAmount(entry);
    if (running >= goal.targetAmount) return entry.date;
  }
  return null;
}

export type YearReview = {
  year: number;
  /** Money saved minus money taken out during the year. */
  netSaved: number;
  /** How many times money was put aside. */
  savingCount: number;
  goalsReached: { goal: SavingsGoal; date: IsoDate }[];
  goalsStarted: number;
  bestMonth: MonthSummary | null;
  longestStreak: number;
};

export function yearReview(year: number, goals: SavingsGoal[], contributions: Contribution[]): YearReview {
  const prefix = `${year}-`;
  const inYear = contributions.filter((c) => c.date.startsWith(prefix));
  const history = monthlyHistory(contributions, `${year}-12-31`).filter((m) => m.month.year === year);
  const bestMonth = history.reduce<MonthSummary | null>(
    (best, m) => (m.saved > 0 && (!best || m.saved > best.saved) ? m : best),
    null,
  );
  return {
    year,
    netSaved: inYear.reduce((sum, c) => sum + signedAmount(c), 0),
    savingCount: inYear.filter((c) => !c.withdrawal).length,
    goalsReached: goals
      .map((goal) => ({ goal, date: goalReachedOn(goal, contributions) }))
      .filter((x): x is { goal: SavingsGoal; date: IsoDate } => x.date?.startsWith(prefix) ?? false)
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
    goalsStarted: goals.filter((g) => g.createdAt.startsWith(prefix)).length,
    bestMonth,
    longestStreak: longestStreak(history),
  };
}

/**
 * Which year Home's review card is about: this year during December, last
 * year during January. Null the rest of the year.
 */
export function reviewYearToShow(today: IsoDate = todayIsoDate()): number | null {
  const [year, month] = today.split('-').map(Number);
  if (month === 12) return year;
  if (month === 1) return year - 1;
  return null;
}

/** The year Settings' "Year in review" opens: last year in January, otherwise this year. */
export function defaultReviewYear(today: IsoDate = todayIsoDate()): number {
  const [year, month] = today.split('-').map(Number);
  return month === 1 ? year - 1 : year;
}
