import type { CurrencyCode } from '@/types/models';

/** Quick-save buttons in whole units of each currency. £5 is a small step; ₹5 isn't worth a tap. */
const STEPS: Partial<Record<CurrencyCode, number[]>> = {
  INR: [100, 250, 500],
  TRY: [50, 100, 250],
};
const DEFAULT_STEPS = [5, 10, 20];

/**
 * The one-tap amounts (minor units) offered for a goal with `remaining` left.
 * Steps bigger than what's left are replaced by one "finish it" amount, so a
 * quick save never takes a goal past its target. Nothing left: no buttons.
 */
export function quickSaveAmounts(remaining: number, currency: CurrencyCode): number[] {
  if (remaining <= 0) return [];
  const steps = (STEPS[currency] ?? DEFAULT_STEPS).map((unit) => unit * 100);
  const amounts = steps.filter((amount) => amount < remaining);
  if (amounts.length < steps.length) amounts.push(remaining);
  return amounts;
}

/** The note on a contribution logged with a quick-save button. */
export const QUICK_SAVE_NOTE = 'Quick save';
