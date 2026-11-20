import { describe, expect, it } from '@jest/globals';

import type { AboutYou, SavingsGoal } from '@/types/models';
import { createBackup, parseBackup, shouldRemindBackup } from '@/utils/backup';
import { lastPayday, nthWeekdayOfMonth, paydaysInMonth } from '@/utils/payday';
import { DEFAULT_ABOUT } from '@/utils/personal';
import {
  dueRepeatingSavings,
  nextRepeatingDate,
  skippedRepeatingDates,
  skipNextRepeating,
  undoSkipRepeating,
} from '@/utils/repeating';
import { currentStreak } from '@/utils/streaks';

const TODAY = '2026-11-20';

const goal = (overrides: Partial<SavingsGoal> = {}): SavingsGoal => ({
  id: 'g',
  name: 'Holiday',
  emoji: '✈️',
  targetAmount: 200_000,
  targetDate: null,
  createdAt: '2026-06-01T09:00:00.000Z',
  ...overrides,
});

describe('paydays', () => {
  it('finds the last Friday of a month', () => {
    // Weekdays use expo's numbering: 6 = Friday.
    expect(nthWeekdayOfMonth(2026, 10, -1, 6)).toBe('2026-11-27');
  });

  it('moves the 31st to the end of a short month', () => {
    expect(paydaysInMonth({ kind: 'dates', days: [15, 31] }, 2027, 1)).toEqual(['2027-02-15', '2027-02-28']);
  });

  it('knows the latest monthly payday', () => {
    const about: AboutYou = { ...DEFAULT_ABOUT, payFrequency: 'monthly', payday: 25 };
    expect(lastPayday(about, TODAY)).toBe('2026-10-25');
  });
});

describe('repeating savings', () => {
  const repeating = { amount: 10_000, dayOfMonth: 5, loggedThrough: '2026-08-05' };

  it('catches up on missed months, each on its own day', () => {
    const due = dueRepeatingSavings([goal({ repeating })], [], TODAY);
    expect(due.contributions.map((c) => c.date)).toEqual(['2026-09-05', '2026-10-05', '2026-11-05']);
    expect(due.loggedThrough.g).toBe('2026-11-05');
  });

  it('stops at the target, with a smaller last payment', () => {
    const due = dueRepeatingSavings([goal({ targetAmount: 15_000, repeating })], [], TODAY);
    expect(due.contributions.map((c) => c.amount)).toEqual([10_000, 5_000]);
    expect(due.loggedThrough.g).toBe('2026-11-05');
  });

  it('pauses archived goals without backfilling later', () => {
    const due = dueRepeatingSavings([goal({ repeating, archivedAt: '2026-08-10T10:00:00.000Z' })], [], TODAY);
    expect(due.contributions).toEqual([]);
    expect(due.loggedThrough.g).toBe('2026-11-05');
  });

  it('clamps the 31st in short months', () => {
    expect(nextRepeatingDate(31, '2027-01-31')).toBe('2027-02-28');
  });

  it('skips the next payment and undoes the skip', () => {
    const current = { amount: 10_000, dayOfMonth: 5, loggedThrough: '2026-11-05' };
    const skipped = skipNextRepeating(current, TODAY);
    expect(skippedRepeatingDates(skipped, TODAY)).toEqual(['2026-12-05']);
    const undone = undoSkipRepeating(skipped, TODAY);
    expect(skippedRepeatingDates(undone, TODAY)).toEqual([]);
    expect(undone.loggedThrough <= TODAY).toBe(true);
  });
});

describe('streaks', () => {
  it('counts months in a row, and last month’s run before saving this month', () => {
    const c = (date: string) => ({ id: date, goalId: 'g', amount: 1000, date });
    expect(currentStreak([c('2026-09-03'), c('2026-10-03'), c('2026-11-03')], TODAY).months).toBe(3);
    expect(currentStreak([c('2026-09-03'), c('2026-10-03')], TODAY).months).toBe(2);
  });
});

describe('backups', () => {
  it('keep repeating savings, interest rates and archived goals', () => {
    const goals = [
      goal({
        repeating: { amount: 5000, dayOfMonth: 1, loggedThrough: '2026-11-01' },
        interestRate: 425,
        archivedAt: '2026-11-02T10:00:00.000Z',
      }),
    ];
    const file = createBackup({
      profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 200_000 },
      goals,
      contributions: [],
      about: DEFAULT_ABOUT,
    });
    const parsed = parseBackup(file);
    expect(parsed.ok && parsed.value.goals[0]).toMatchObject({
      repeating: { amount: 5000, dayOfMonth: 1 },
      interestRate: 425,
      archivedAt: '2026-11-02T10:00:00.000Z',
    });
  });

  it('reminds once a month, only when there’s something to keep', () => {
    const now = new Date('2026-11-20T12:00:00Z');
    const base = { lastBackupAt: null, snoozedAt: null, startedAt: '2026-10-01T12:00:00Z', hasSavings: true, demo: false };
    expect(shouldRemindBackup(base, now)).toBe(true);
    expect(shouldRemindBackup({ ...base, lastBackupAt: '2026-11-10T12:00:00Z' }, now)).toBe(false);
    expect(shouldRemindBackup({ ...base, hasSavings: false }, now)).toBe(false);
    expect(shouldRemindBackup({ ...base, demo: true }, now)).toBe(false);
  });
});
