import type { CurrencyCode } from '@/types/models';

/**
 * Saving tips shown on the Budget tab (all that match) and on Home (one per day).
 *
 * ── How to add a tip ────────────────────────────────────────────────
 * Copy any block in TIPS below, give it a new unique `id`, and choose which
 * income levels it's for in `for`. That's it. Keep tips:
 *   • practical — something the reader can do this week
 *   • short — a title plus one or two sentences
 *   • general — no specific products, providers or tax rules, as these vary
 *     by country and change over time
 * ────────────────────────────────────────────────────────────────────
 */

/** Rough income level, from monthly income after tax (see INCOME_BANDS below). */
export type IncomeLevel = 'lower' | 'middle' | 'higher';

export type Tip = {
  /** Unique and never reused. Changing an id changes which day it shows on Home. */
  id: string;
  title: string;
  body: string;
  /** Which income levels see this tip. */
  for: IncomeLevel[];
};

const ALL: IncomeLevel[] = ['lower', 'middle', 'higher'];

export const TIPS: Tip[] = [
  // ── Everyone ──
  {
    id: 'pay-yourself-first',
    title: 'Pay yourself first',
    body: 'Set up an automatic transfer to savings on payday, before you spend anything. Saving what’s left at the end of the month rarely works.',
    for: ALL,
  },
  {
    id: 'track-a-month',
    title: 'Track one month of spending',
    body: 'Write down everything you spend for a month. Most people find at least one surprise, and that’s often the easiest thing to cut.',
    for: ALL,
  },
  {
    id: 'subscription-audit',
    title: 'Check your subscriptions',
    body: 'Look through your bank statement for regular payments. Cancel anything you haven’t used in the last month; you can always sign up again.',
    for: ALL,
  },
  {
    id: 'twenty-four-hour-rule',
    title: 'Try the 24-hour rule',
    body: 'For any non-essential purchase, wait a day before buying. If you still want it tomorrow, fine. Often you won’t.',
    for: ALL,
  },
  {
    id: 'sinking-funds',
    title: 'Save a little for yearly costs',
    body: 'Add up costs that come once a year (insurance, car service, gifts), divide by 12, and put that aside each month so they never catch you out.',
    for: ALL,
  },
  {
    id: 'high-interest-debt',
    title: 'Tackle expensive debt first',
    body: 'If you have credit card or other high-interest debt, paying it off is often the best “return” you can get, usually better than saving at a lower rate.',
    for: ALL,
  },
  {
    id: 'windfalls',
    title: 'Save part of any windfall',
    body: 'When you get unexpected money (a refund, a gift, a bonus), decide on a share to save straight away, before it blends into everyday spending.',
    for: ALL,
  },
  {
    id: 'meal-plan',
    title: 'Plan meals before you shop',
    body: 'Plan the week’s meals and shop with a list. It cuts food waste and impulse buys, and food is one of the easiest costs to bring down.',
    for: ALL,
  },

  // ── Lower incomes: build a buffer and cut fixed costs ──
  {
    id: 'starter-emergency-fund',
    title: 'Start a small emergency fund',
    body: 'Aim for a first buffer of a few hundred, even if you build it slowly. It stops a surprise bill from turning into debt.',
    for: ['lower'],
  },
  {
    id: 'cut-fixed-costs',
    title: 'Cut a fixed cost once, save every month',
    body: 'Phone, broadband, energy and insurance are often cheaper if you switch or ask for a better deal. One phone call can save you money every month.',
    for: ['lower', 'middle'],
  },
  {
    id: 'check-support',
    title: 'Check what support you can get',
    body: 'Look up whether you qualify for benefits, discounts or lower-cost “social” tariffs on bills. Many people who qualify never claim.',
    for: ['lower'],
  },
  {
    id: 'small-amounts-count',
    title: 'Small amounts count',
    body: 'Saving even a small amount every week builds the habit, and 52 small amounts add up to something real. Start small and increase it when you can.',
    for: ['lower'],
  },
  {
    id: 'avoid-bnpl',
    title: 'Be careful with “buy now, pay later”',
    body: 'Splitting payments makes things feel cheaper than they are, and missed payments can bring fees. Use it only for things you’d buy anyway.',
    for: ['lower', 'middle'],
  },

  // ── Middle incomes ──
  {
    id: 'three-months-buffer',
    title: 'Grow your emergency fund to 3 months',
    body: 'Once you have a starter buffer, build it towards three months of essential costs, kept somewhere easy to reach that still earns some interest.',
    for: ['middle', 'higher'],
  },
  {
    id: 'pension-match',
    title: 'Don’t miss free money from your employer',
    body: 'If your employer matches pension contributions, paying in enough to get the full match is usually worth it. It’s part of your pay.',
    for: ['middle', 'higher'],
  },
  {
    id: 'raise-one-percent',
    title: 'Raise your savings by 1% at a time',
    body: 'Every few months, increase your automatic saving by 1% of your income. Small steps are easy to adjust to and add up quickly.',
    for: ['middle', 'higher'],
  },

  // ── Higher incomes: savings rate and lifestyle creep ──
  {
    id: 'lifestyle-creep',
    title: 'Watch out for lifestyle creep',
    body: 'When your pay goes up, spending tends to follow. Save at least half of every pay rise before you get used to having it.',
    for: ['higher'],
  },
  {
    id: 'savings-rate',
    title: 'Aim higher than 20%',
    body: 'The 50/30/20 rule is a starting point. With a higher income, saving 25–30% or more can bring big goals much closer.',
    for: ['higher'],
  },
  {
    id: 'long-term-goals',
    title: 'Give long-term goals a job',
    body: 'Once your emergency fund is in place, think about longer-term goals (a home, retirement) and whether some savings should be invested for growth. A regulated adviser can help.',
    for: ['higher'],
  },
  {
    id: 'big-purchases',
    title: 'Plan big purchases as goals',
    body: 'For anything large (a car, a holiday), create a goal here and save for it ahead of time instead of paying on credit.',
    for: ['middle', 'higher'],
  },
];

/**
 * Monthly income after tax (whole units) that marks each level, per currency:
 * below `middleFrom` is "lower", `higherFrom` and above is "higher".
 *
 * These are ROUGH figures based on typical take-home pay in each currency's
 * main countries (around the lower and upper quarters), not exact statistics.
 * Adjust them freely; they only decide which tips are shown.
 */
export const INCOME_BANDS: Record<CurrencyCode, { middleFrom: number; higherFrom: number }> = {
  GBP: { middleFrom: 1_800, higherFrom: 3_500 },
  EUR: { middleFrom: 1_800, higherFrom: 3_800 },
  USD: { middleFrom: 3_000, higherFrom: 6_000 },
  CAD: { middleFrom: 3_200, higherFrom: 6_500 },
  AUD: { middleFrom: 4_000, higherFrom: 8_000 },
  NZD: { middleFrom: 3_600, higherFrom: 7_000 },
  CHF: { middleFrom: 4_500, higherFrom: 8_500 },
  INR: { middleFrom: 35_000, higherFrom: 125_000 },
  TRY: { middleFrom: 30_000, higherFrom: 100_000 },
};
