/**
 * Interest on a goal's pot, from the yearly rate the user's own bank pays
 * (`SavingsGoal.interestRate`, in hundredths of a percent: 4.25% → 425).
 * Goalpot holds no money; these are estimates for the plan and the planner.
 * Pure functions; amounts in minor units.
 *
 * Model: the rate is an AER (yearly, with compounding), so the monthly rate
 * is (1 + AER)^(1/12) − 1. Like the rest of the app, this month counts as the
 * first payment: each payment goes in at the start of a month, and the pot
 * grows at the end of every month.
 */

/** Highest rate accepted (in hundredths of a percent), to catch typos like 45 for 4.5. */
export const MAX_INTEREST_RATE = 2000;

export function monthlyRate(rate: number): number {
  return Math.pow(1 + rate / 10_000, 1 / 12) - 1;
}

/** What the pot holds after `months`, starting from `saved` and adding `monthly` each month. */
export function potAfter(saved: number, monthly: number, months: number, rate: number): number {
  const r = monthlyRate(rate);
  if (r === 0) return saved + monthly * months;
  const growth = Math.pow(1 + r, months);
  return saved * growth + (monthly * (1 + r) * (growth - 1)) / r;
}

/**
 * The monthly amount that reaches `target` in `months`, with interest. Never
 * negative: 0 means interest alone gets there.
 */
export function monthlyNeededWithInterest(saved: number, target: number, months: number, rate: number): number {
  if (months <= 0) return Math.max(0, target - saved);
  const r = monthlyRate(rate);
  if (r === 0) return Math.max(0, Math.ceil((target - saved) / months));
  const growth = Math.pow(1 + r, months);
  const needed = ((target - saved * growth) * r) / ((1 + r) * (growth - 1));
  return Math.max(0, Math.ceil(needed));
}

/** How many monthly payments reach `target`, with interest (null if it would take over 100 years). */
export function monthsToReach(saved: number, target: number, monthly: number, rate: number): number | null {
  if (saved >= target) return 0;
  const r = monthlyRate(rate);
  let pot = saved;
  for (let month = 1; month <= 1200; month++) {
    pot = (pot + monthly) * (1 + r);
    if (pot >= target) return month;
  }
  return null;
}

/** Roughly how much of the pot after `months` is interest rather than money put in. */
export function interestEarned(saved: number, monthly: number, months: number, rate: number): number {
  if (months <= 0) return 0;
  return Math.max(0, Math.round(potAfter(saved, monthly, months, rate) - saved - monthly * months));
}

/** '4%', '4.25%'. */
export function formatRate(rate: number): string {
  return `${(rate / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })}%`;
}
