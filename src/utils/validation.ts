import type { IsoDate } from '@/types/models';
import { todayIsoDate } from '@/utils/dates';
import { parseMoneyInput } from '@/utils/money';

/**
 * Form validation. Each validator returns either the cleaned-up value or a
 * user-facing error message, so screens can show the message under the field.
 */
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const NAME_MAX_LENGTH = 40;
export const GOAL_NAME_MAX_LENGTH = 40;

/** Largest amounts we accept, in whole units (a sanity check against typos). */
const MAX_MONTHLY_INCOME = 10_000_000;
const MAX_GOAL_TARGET = 100_000_000;

function validateText(
  text: string,
  { emptyError, maxLength }: { emptyError: string; maxLength: number },
): ValidationResult<string> {
  const value = text.trim().replace(/\s+/g, ' ');
  if (!value) return { ok: false, error: emptyError };
  if (value.length > maxLength) {
    return { ok: false, error: `Please keep it under ${maxLength} characters.` };
  }
  return { ok: true, value };
}

/** Checks a money amount typed by the user. Returns minor units (pence) on success. */
function validateAmount(
  text: string,
  { emptyError, negativeError, max }: { emptyError: string; negativeError: string; max: number },
): ValidationResult<number> {
  if (!text.trim()) return { ok: false, error: emptyError };
  if (text.includes('-')) return { ok: false, error: negativeError };
  const amount = parseMoneyInput(text);
  if (amount === null) {
    return { ok: false, error: 'Please enter a number, like 900 or 899.99.' };
  }
  if (amount === 0) return { ok: false, error: 'Please enter an amount greater than 0.' };
  if (amount > max * 100) {
    return { ok: false, error: 'That looks too high — please check the amount.' };
  }
  return { ok: true, value: amount };
}

export function validateName(text: string): ValidationResult<string> {
  return validateText(text, { emptyError: 'Please enter your name.', maxLength: NAME_MAX_LENGTH });
}

export function validateIncome(text: string): ValidationResult<number> {
  return validateAmount(text, {
    emptyError: 'Please enter your monthly income.',
    negativeError: "Income can't be negative.",
    max: MAX_MONTHLY_INCOME,
  });
}

export function validateGoalName(text: string): ValidationResult<string> {
  return validateText(text, {
    emptyError: 'Please give your goal a name.',
    maxLength: GOAL_NAME_MAX_LENGTH,
  });
}

export function validateGoalTarget(text: string): ValidationResult<number> {
  return validateAmount(text, {
    emptyError: 'Please enter how much you want to save.',
    negativeError: "The target can't be negative.",
    max: MAX_GOAL_TARGET,
  });
}

/** A target date is optional, but if set it can't already be in the past. */
export function validateGoalTargetDate(
  date: IsoDate | null,
  today: IsoDate = todayIsoDate(),
): ValidationResult<IsoDate | null> {
  if (date !== null && date < today) {
    return { ok: false, error: 'That date has passed — please pick this month or later.' };
  }
  return { ok: true, value: date };
}

/** Shows a stored amount in an input box: 185050 → '1850.50', 185000 → '1850'. */
export function amountToInputText(minorUnits: number | null): string {
  if (minorUnits === null) return '';
  const whole = Math.floor(minorUnits / 100);
  const fraction = minorUnits % 100;
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0')}`;
}
