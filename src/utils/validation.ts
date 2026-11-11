import { parseMoneyInput } from '@/utils/money';

/**
 * Form validation. Each validator returns either the cleaned-up value or a
 * user-facing error message, so screens can show the message under the field.
 */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const NAME_MAX_LENGTH = 40;

/** Largest monthly income we accept, in whole units (a sanity check against typos). */
const MAX_MONTHLY_INCOME = 10_000_000;

export function validateName(text: string): ValidationResult<string> {
  const name = text.trim().replace(/\s+/g, ' ');
  if (!name) return { ok: false, error: 'Please enter your name.' };
  if (name.length > NAME_MAX_LENGTH) {
    return { ok: false, error: `Please keep it under ${NAME_MAX_LENGTH} characters.` };
  }
  return { ok: true, value: name };
}

/** Validates monthly income. Returns minor units (pence) on success. */
export function validateIncome(text: string): ValidationResult<number> {
  if (!text.trim()) return { ok: false, error: 'Please enter your monthly income.' };
  if (text.includes('-')) return { ok: false, error: "Income can't be negative." };
  const amount = parseMoneyInput(text);
  if (amount === null) {
    return { ok: false, error: 'Please enter a number, like 1850 or 1850.50.' };
  }
  if (amount === 0) return { ok: false, error: 'Please enter an amount greater than 0.' };
  if (amount > MAX_MONTHLY_INCOME * 100) {
    return { ok: false, error: 'That looks too high — please check the amount.' };
  }
  return { ok: true, value: amount };
}

/** Shows a stored amount in an input box: 185050 → '1850.50', 185000 → '1850'. */
export function amountToInputText(minorUnits: number | null): string {
  if (minorUnits === null) return '';
  const whole = Math.floor(minorUnits / 100);
  const fraction = minorUnits % 100;
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`;
}
