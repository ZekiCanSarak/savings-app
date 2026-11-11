import type { Contribution, IsoDate, SavingsGoal } from '@/types/models';
import { addDays, parseIsoDate, toIsoDate, todayIsoDate } from '@/utils/dates';
import { amountRemaining, percentComplete, totalSaved } from '@/utils/goals';

/**
 * Data preparation for charts. Pure functions (no React), amounts in minor units.
 */

export type SavingsPoint = { date: IsoDate; total: number };

/** Most points we draw on the savings line; longer histories are sampled evenly. */
const MAX_POINTS = 60;

function daysBetween(from: IsoDate, to: IsoDate): number {
  const ms = parseIsoDate(to).getTime() - parseIsoDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Running total saved toward a goal, from when saving started up to today.
 *
 * The chart library spaces points evenly, so to keep time honest we sample on
 * evenly spaced dates (daily for up to 60 days, otherwise 60 even steps) rather
 * than one point per contribution. The first point is always 0 at the start.
 * Returns [] when nothing has been saved yet.
 */
export function savingsOverTime(
  goal: SavingsGoal,
  contributions: Contribution[],
  today: IsoDate = todayIsoDate(),
): SavingsPoint[] {
  const entries = contributions
    .filter((c) => c.goalId === goal.id)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (entries.length === 0) return [];

  const created = toIsoDate(new Date(goal.createdAt));
  const start = entries[0].date < created ? entries[0].date : created;
  const end = entries[entries.length - 1].date > today ? entries[entries.length - 1].date : today;
  const span = Math.max(0, daysBetween(start, end));

  const sampleCount = Math.min(span + 1, MAX_POINTS);
  const sampleDates: IsoDate[] =
    sampleCount <= 1
      ? [end]
      : Array.from({ length: sampleCount }, (_, i) =>
          addDays(start, Math.round((i * span) / (sampleCount - 1))),
        );

  const points: SavingsPoint[] = [{ date: start, total: 0 }];
  let index = 0;
  let running = 0;
  for (const date of sampleDates) {
    while (index < entries.length && entries[index].date <= date) {
      running += entries[index].amount;
      index += 1;
    }
    points.push({ date, total: running });
  }
  return points;
}

/**
 * A clean axis: the smallest "nice" maximum that fits `value`, split into
 * `sections` equal steps of 1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 × 10ⁿ.
 * The finer list keeps headroom small (900 → axis to 1,200, not 2,000).
 */
export function niceAxis(value: number, sections = 4): { max: number; step: number } {
  // Axes are in whole units, so tiny targets still get whole-number steps (£1, £2…).
  if (value <= sections) return { max: sections, step: 1 };
  const rawStep = value / sections;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? rawStep;
  return { max: step * sections, step };
}

/** Short money label for axes: 0 → '£0', 250 → '£250', 1500 → '£1.5K', 2000000 → '£2M'. */
export function formatCompactMoney(wholeUnits: number, symbol: string): string {
  const abs = Math.abs(wholeUnits);
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (abs >= 1_000_000) return `${symbol}${trim(wholeUnits / 1_000_000)}M`;
  if (abs >= 1_000) return `${symbol}${trim(wholeUnits / 1_000)}K`;
  // Keep a decimal for in-between steps like 2.5, rather than rounding to a wrong label.
  return `${symbol}${trim(wholeUnits)}`;
}

export type GoalProgressRow = {
  goal: SavingsGoal;
  saved: number;
  percent: number;
};

export type GoalsSummary = {
  totalSaved: number;
  /** Sum of what's left on each goal; extra saved on one goal doesn't reduce another. */
  totalRemaining: number;
  completedCount: number;
  /** Every goal, most complete first (ties: larger amount saved first). */
  ranked: GoalProgressRow[];
};

export function summariseGoals(goals: SavingsGoal[], contributions: Contribution[]): GoalsSummary {
  const ranked = goals
    .map((goal) => ({
      goal,
      saved: totalSaved(goal.id, contributions),
      percent: percentComplete(goal, contributions),
    }))
    .sort((a, b) => b.percent - a.percent || b.saved - a.saved);

  return {
    totalSaved: ranked.reduce((sum, row) => sum + row.saved, 0),
    totalRemaining: goals.reduce((sum, goal) => sum + amountRemaining(goal, contributions), 0),
    completedCount: goals.filter((goal) => amountRemaining(goal, contributions) === 0).length,
    ranked,
  };
}
