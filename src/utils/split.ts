import type { Contribution, SavingsGoal } from '@/types/models';
import { amountRemaining } from '@/utils/goals';

/**
 * Splitting one lump sum across several goals ("Split money").
 * Amounts in minor units; every result adds up exactly to `amount`.
 */

/** Equal shares; leftover pennies go to the first goals. */
export function splitEvenly(amount: number, goalIds: string[]): Record<string, number> {
  if (goalIds.length === 0) return {};
  const share = Math.floor(amount / goalIds.length);
  let leftover = amount - share * goalIds.length;
  return Object.fromEntries(
    goalIds.map((id) => {
      const extra = leftover > 0 ? 1 : 0;
      leftover -= extra;
      return [id, share + extra];
    }),
  );
}

/**
 * Shares in proportion to what each goal still needs, never more than a goal
 * needs. Anything beyond what all the goals need is split evenly on top.
 */
export function splitByNeed(
  amount: number,
  goals: SavingsGoal[],
  contributions: Contribution[],
): Record<string, number> {
  const needs = goals.map((g) => ({ id: g.id, need: amountRemaining(g, contributions) }));
  const totalNeed = needs.reduce((sum, n) => sum + n.need, 0);
  if (totalNeed === 0) return splitEvenly(amount, goals.map((g) => g.id));

  const toShare = Math.min(amount, totalNeed);
  const shares: Record<string, number> = {};
  let given = 0;
  for (const { id, need } of needs) {
    shares[id] = Math.floor((toShare * need) / totalNeed);
    given += shares[id];
  }
  // Rounding leftovers go to the goals with the most room left.
  let leftover = toShare - given;
  for (const { id, need } of [...needs].sort((a, b) => b.need - a.need)) {
    if (leftover === 0) break;
    if (shares[id] < need) {
      shares[id] += 1;
      leftover -= 1;
    }
  }
  const extra = splitEvenly(amount - toShare, goals.map((g) => g.id));
  for (const id of Object.keys(shares)) shares[id] += extra[id] ?? 0;
  return shares;
}
