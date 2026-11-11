import type { Contribution, IsoDate, SavingsGoal } from '@/types/models';
import { savingMonthsLeft, todayIsoDate } from '@/utils/dates';

/**
 * Calculations for savings goals. All amounts are in minor units (pence).
 * These are plain functions (no React) so they're easy to reuse and test.
 */

/** All contributions for one goal, newest first. */
export function contributionsForGoal(goalId: string, contributions: Contribution[]): Contribution[] {
  return contributions
    .filter((c) => c.goalId === goalId)
    .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
}

/** Total saved toward a goal so far. */
export function totalSaved(goalId: string, contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => (c.goalId === goalId ? sum + c.amount : sum), 0);
}

/** How much is still left to save. Never below 0, even if the user saved extra. */
export function amountRemaining(goal: SavingsGoal, contributions: Contribution[]): number {
  return Math.max(0, goal.targetAmount - totalSaved(goal.id, contributions));
}

/** Progress from 0 to 100 (whole number, capped at 100). */
export function percentComplete(goal: SavingsGoal, contributions: Contribution[]): number {
  if (goal.targetAmount <= 0) return 100;
  const percent = (totalSaved(goal.id, contributions) / goal.targetAmount) * 100;
  return Math.min(100, Math.floor(percent));
}

export function isGoalComplete(goal: SavingsGoal, contributions: Contribution[]): boolean {
  return amountRemaining(goal, contributions) === 0;
}

/**
 * How much to save each month to hit the target date, rounded up to the next
 * penny so the goal is always reached.
 *
 * Counts this month and the target month (see `savingMonthsLeft`).
 * - null → the goal has no target date
 * - 0 → already complete
 * - if the target date has passed, returns the full remaining amount
 */
export function monthlyAmountNeeded(
  goal: SavingsGoal,
  contributions: Contribution[],
  today: IsoDate = todayIsoDate(),
): number | null {
  if (!goal.targetDate) return null;
  const remaining = amountRemaining(goal, contributions);
  if (remaining === 0) return 0;
  const months = savingMonthsLeft(goal.targetDate, today);
  return months <= 0 ? remaining : Math.ceil(remaining / months);
}
