import type { IsoDate } from '@/types/models';
import { monthsToReach } from '@/utils/interest';
import { addMonths, compareYearMonth, endOfMonthIsoDate, todayIsoDate, yearMonthOf } from '@/utils/dates';

/**
 * The goal page's "What if" planner: how long a goal takes at a chosen
 * monthly amount. Pure functions; amounts in minor units.
 */

export type WhatIfResult = {
  /** Monthly payments needed, counting this month as the first. */
  months: number;
  /** Last day of the month the goal would be reached in. */
  finishDate: IsoDate;
  /**
   * Compared with the target date: positive = months early, negative = months
   * late, 0 = right on time. Null when the goal has no target date.
   */
  monthsEarly: number | null;
};

export function whatIf(
  remaining: number,
  monthly: number,
  targetDate: IsoDate | null,
  today: IsoDate = todayIsoDate(),
  /** The pot's interest (from the user's bank), so what's saved grows too. */
  interest?: { saved: number; rate: number },
): WhatIfResult | null {
  if (remaining <= 0 || monthly <= 0) return null;
  const months = interest?.rate
    ? monthsToReach(interest.saved, interest.saved + remaining, monthly, interest.rate)
    : Math.ceil(remaining / monthly);
  if (months === null) return null;
  const finish = addMonths(yearMonthOf(today), months - 1);
  let monthsEarly: number | null = null;
  if (targetDate) {
    const target = yearMonthOf(targetDate);
    monthsEarly = (target.year - finish.year) * 12 + (target.month - finish.month);
    if (compareYearMonth(finish, target) === 0) monthsEarly = 0;
  }
  return { months, finishDate: endOfMonthIsoDate(finish), monthsEarly };
}

/**
 * Step for the planner's ‹ › buttons: a round amount (in minor units) that
 * suits the size of the goal, e.g. £5 for small goals, £50 for big ones.
 */
export function plannerStep(remaining: number): number {
  const whole = remaining / 100;
  if (whole <= 300) return 500;
  if (whole <= 1_500) return 1_000;
  if (whole <= 6_000) return 2_500;
  if (whole <= 20_000) return 5_000;
  return 10_000;
}

/** A sensible starting amount: what's needed for the date, or a twelfth of what's left, rounded to the step. */
export function plannerStart(remaining: number, monthlyNeeded: number | null): number {
  const step = plannerStep(remaining);
  const base = monthlyNeeded && monthlyNeeded > 0 ? monthlyNeeded : remaining / 12;
  return Math.max(step, Math.ceil(base / step) * step);
}
