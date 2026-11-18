import type { AboutYou, Contribution, IsoDate, SavingsGoal, UserProfile } from '@/types/models';
import { addMonths, endOfMonthIsoDate, toIsoDate, todayIsoDate, yearMonthOf } from '@/utils/dates';
import { DEFAULT_ABOUT } from '@/utils/personal';

/**
 * Sample data for "Try the demo": a made-up saver with a few months of
 * history, so every screen (charts, streaks, reached goals, year in review)
 * has something to show. Dates are built from today so it always looks current.
 * Edit freely; amounts are in pence.
 */

export type DemoData = {
  profile: UserProfile;
  about: AboutYou;
  goals: SavingsGoal[];
  contributions: Contribution[];
};

type DemoGoal = Omit<SavingsGoal, 'createdAt' | 'targetDate'> & {
  createdMonthsAgo: number;
  /** Months from now to the target month; null = no date. */
  targetInMonths: number | null;
  /** [months ago, day of month, pounds, note?]; negative pounds = money taken out. */
  savings: [number, number, number, string?][];
};

const GOALS: DemoGoal[] = [
  {
    id: 'demo-japan',
    name: 'Japan trip',
    emoji: '✈️',
    targetAmount: 250000,
    createdMonthsAgo: 7,
    targetInMonths: 9,
    savings: [
      [6, 26, 200],
      [5, 26, 200],
      [4, 26, 250, 'Birthday money'],
      [3, 26, 150],
      [2, 26, 200],
      [1, 26, 250],
      [0, 2, 200, 'Payday'],
    ],
  },
  {
    id: 'demo-emergency',
    name: 'Emergency fund',
    emoji: '🛟',
    targetAmount: 360000,
    createdMonthsAgo: 10,
    targetInMonths: 14,
    savings: [
      [9, 27, 200],
      [8, 27, 200],
      [7, 27, 250],
      [6, 27, 200],
      [5, 27, 200],
      [4, 12, -150, 'Car repair'],
      [4, 27, 200],
      [3, 27, 200],
      [2, 27, 250],
      [1, 27, 150],
      [0, 2, 200],
    ],
  },
  {
    id: 'demo-laptop',
    name: 'New laptop',
    emoji: '💻',
    targetAmount: 90000,
    createdMonthsAgo: 8,
    targetInMonths: -2,
    savings: [
      [7, 26, 150],
      [6, 26, 150],
      [5, 26, 150],
      [4, 26, 150],
      [3, 26, 150],
      [2, 20, 150, 'Done!'],
    ],
  },
  {
    id: 'demo-festival',
    name: 'Festival tickets',
    emoji: '🎟️',
    targetAmount: 40000,
    createdMonthsAgo: 3,
    targetInMonths: 5,
    savings: [
      [2, 28, 70],
      [1, 28, 70],
      [0, 3, 80],
    ],
  },
];

export function demoData(today: IsoDate = todayIsoDate()): DemoData {
  const thisMonth = yearMonthOf(today);
  // A day in an earlier month, never later than today (contributions can't be in the future).
  const dateIn = (monthsAgo: number, day: number): IsoDate => {
    const { year, month } = addMonths(thisMonth, -monthsAgo);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const date = toIsoDate(new Date(year, month, Math.min(day, lastDay)));
    return date > today ? today : date;
  };

  const goals: SavingsGoal[] = GOALS.map(({ savings: _savings, createdMonthsAgo, targetInMonths, ...goal }) => ({
    ...goal,
    targetDate: targetInMonths === null ? null : endOfMonthIsoDate(addMonths(thisMonth, targetInMonths)),
    createdAt: `${dateIn(createdMonthsAgo, 1)}T09:00:00.000Z`,
  }));

  const contributions: Contribution[] = GOALS.flatMap((goal) =>
    goal.savings.map(([monthsAgo, day, pounds, note], i) => ({
      id: `${goal.id}-${i}`,
      goalId: goal.id,
      amount: Math.abs(pounds) * 100,
      date: dateIn(monthsAgo, day),
      ...(pounds < 0 ? { withdrawal: true as const } : {}),
      ...(note ? { note } : {}),
    })),
  );

  return {
    profile: { name: 'Alex', currency: 'GBP', monthlyIncome: 240000 },
    about: {
      ...DEFAULT_ABOUT,
      focus: 'travel',
      payFrequency: 'monthly',
      payday: 25,
      emergencyFund: 'some',
      guidance: 'guided',
      askedAt: `${today}T09:00:00.000Z`,
    },
    goals,
    contributions,
  };
}
