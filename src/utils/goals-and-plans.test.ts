import { describe, expect, it } from '@jest/globals';

import type { Contribution, SavingsGoal } from '@/types/models';
import { activeGoals, monthlyAmountNeeded, totalSaved } from '@/utils/goals';
import {
  formatRate,
  monthlyNeededWithInterest,
  monthsToReach,
  potAfter,
} from '@/utils/interest';
import { whatIf } from '@/utils/planner';
import { splitByNeed, splitEvenly } from '@/utils/split';

const TODAY = '2026-11-20';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 'g',
  name: 'House',
  emoji: '🏠',
  targetAmount: 1_000_000,
  targetDate: '2028-10-31',
  createdAt: '2026-06-01T09:00:00.000Z',
  ...overrides,
});
const saved = (amount: number, extra: Partial<Contribution> = {}): Contribution => ({
  id: `c${amount}`,
  goalId: 'g',
  amount,
  date: '2026-10-01',
  ...extra,
});

describe('totalSaved', () => {
  it('subtracts money taken out, never going below 0', () => {
    expect(totalSaved('g', [saved(5000), saved(2000, { id: 'w', withdrawal: true })])).toBe(3000);
    expect(totalSaved('g', [saved(1000), saved(5000, { id: 'w', withdrawal: true })])).toBe(0);
  });
});

describe('monthlyAmountNeeded', () => {
  it('shares what’s left evenly, counting this month', () => {
    // £8,000 left over 24 months (Nov 2026 to Oct 2028) → £333.34, rounded up.
    expect(monthlyAmountNeeded(goal(), [saved(200_000)], TODAY)).toBe(33_334);
  });

  it('needs less with interest from the bank', () => {
    const withInterest = monthlyAmountNeeded(goal({ interestRate: 400 }), [saved(200_000)], TODAY);
    expect(withInterest).toBeLessThan(33_334);
    expect(withInterest).toBeGreaterThan(30_000);
  });

  it('is null without a target date and 0 once reached', () => {
    expect(monthlyAmountNeeded(goal({ targetDate: null }), [], TODAY)).toBeNull();
    expect(monthlyAmountNeeded(goal(), [saved(1_000_000)], TODAY)).toBe(0);
  });
});

describe('activeGoals', () => {
  it('leaves out archived goals', () => {
    const goals = [goal({ id: 'a' }), goal({ id: 'b', archivedAt: '2026-11-01T10:00:00.000Z' })];
    expect(activeGoals(goals).map((g) => g.id)).toEqual(['a']);
  });
});

describe('interest', () => {
  it('adds up exactly without interest', () => {
    expect(potAfter(1000, 100, 10, 0)).toBe(2000);
  });

  it('finds the smallest monthly amount that reaches the target', () => {
    const monthly = monthlyNeededWithInterest(200_000, 1_000_000, 24, 400);
    expect(potAfter(200_000, monthly, 24, 400)).toBeGreaterThanOrEqual(1_000_000);
    expect(potAfter(200_000, monthly - 1, 24, 400)).toBeLessThan(1_000_000);
  });

  it('is 0 when interest alone gets there', () => {
    expect(monthlyNeededWithInterest(990_000, 1_000_000, 24, 500)).toBe(0);
  });

  it('counts months to the target', () => {
    expect(monthsToReach(0, 1000, 100, 0)).toBe(10);
    // £1,000 at £10 a month takes 100 months; 10% a year shortens that noticeably.
    expect(monthsToReach(0, 100_000, 1000, 1000)).toBeLessThan(90);
  });

  it('formats rates', () => {
    expect(formatRate(400)).toBe('4%');
    expect(formatRate(425)).toBe('4.25%');
  });
});

describe('whatIf', () => {
  it('finishes earlier with interest', () => {
    const plain = whatIf(800_000, 30_000, '2028-10-31', TODAY);
    const grown = whatIf(800_000, 30_000, '2028-10-31', TODAY, { saved: 200_000, rate: 400 });
    expect(plain?.months).toBe(27);
    expect(grown!.months).toBeLessThan(plain!.months);
  });
});

describe('splitting a lump sum', () => {
  it('shares evenly and adds up exactly', () => {
    const shares = splitEvenly(1000, ['a', 'b', 'c']);
    expect(Object.values(shares).reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('never gives a goal more than it needs', () => {
    const goals = [goal({ id: 'a', targetAmount: 1000 }), goal({ id: 'b', targetAmount: 100_000 })];
    const shares = splitByNeed(50_000, goals, []);
    expect(shares.a).toBeLessThanOrEqual(1000);
    expect(shares.a + shares.b).toBe(50_000);
  });
});
