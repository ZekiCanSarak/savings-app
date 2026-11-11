import { INCOME_BANDS, TIPS, type IncomeLevel, type Tip } from '@/data/tips';
import type { Contribution, CurrencyCode, IsoDate } from '@/types/models';
import { parseIsoDate, todayIsoDate } from '@/utils/dates';

/**
 * Budget calculations. Pure functions (no React); amounts in minor units.
 */

export type BudgetSplit = { needs: number; wants: number; savings: number };

/** The 50/30/20 shares, in display order. */
export const SPLIT_RULE = [
  { key: 'needs', share: 50 },
  { key: 'wants', share: 30 },
  { key: 'savings', share: 20 },
] as const;

/**
 * 50/30/20 split of monthly income. Rounded to whole pence; any rounding
 * remainder goes to needs, so the three always add up to the income exactly.
 */
export function budgetSplit(monthlyIncome: number): BudgetSplit {
  const savings = Math.round(monthlyIncome * 0.2);
  const wants = Math.round(monthlyIncome * 0.3);
  return { needs: monthlyIncome - wants - savings, wants, savings };
}

/** Total saved across all goals in the calendar month containing `today`. */
export function savedThisMonth(contributions: Contribution[], today: IsoDate = todayIsoDate()): number {
  const month = today.slice(0, 7); // 'YYYY-MM'
  return contributions.reduce((sum, c) => (c.date.startsWith(month) ? sum + c.amount : sum), 0);
}

/** Which tip group an income falls in. Income is in minor units. */
export function incomeLevel(monthlyIncome: number, currency: CurrencyCode): IncomeLevel {
  const bands = INCOME_BANDS[currency];
  const whole = monthlyIncome / 100;
  if (whole < bands.middleFrom) return 'lower';
  if (whole < bands.higherFrom) return 'middle';
  return 'higher';
}

/**
 * Tips for an income level. Tips written just for that level come first,
 * then the general ones, each group in the order of the data file.
 */
export function tipsFor(level: IncomeLevel, tips: Tip[] = TIPS): Tip[] {
  const matching = tips.filter((t) => t.for.includes(level));
  const specific = matching.filter((t) => t.for.length < 3);
  const general = matching.filter((t) => t.for.length >= 3);
  return [...specific, ...general];
}

/**
 * One tip per calendar day: the same all day, different tomorrow, cycling
 * through every matching tip before repeating.
 */
export function tipOfTheDay(level: IncomeLevel, today: IsoDate = todayIsoDate(), tips: Tip[] = TIPS): Tip | null {
  const options = tipsFor(level, tips);
  if (options.length === 0) return null;
  const dayNumber = Math.floor(parseIsoDate(today).getTime() / 86_400_000 + 0.5);
  return options[((dayNumber % options.length) + options.length) % options.length];
}

/** Text colour for a label drawn inside a coloured fill: near-black or white, whichever is clearer. */
export function labelColourOn(fillHex: string): '#0B0B0B' | '#FFFFFF' {
  const channel = (i: number) => {
    const v = parseInt(fillHex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? '#FFFFFF' : '#0B0B0B';
}
