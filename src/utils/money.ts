import type { CurrencyCode } from '@/types/models';

const formatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats minor units for display: formatMoney(90000, 'GBP') → '£900.00'.
 * Pass `{ wholeUnits: true }` to drop the pence: '£900'.
 */
export function formatMoney(
  minorUnits: number,
  currency: CurrencyCode,
  options: { wholeUnits?: boolean } = {},
): string {
  const key = `${currency}-${options.wholeUnits ? 0 : 2}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: options.wholeUnits ? 0 : 2,
      maximumFractionDigits: options.wholeUnits ? 0 : 2,
    });
    formatters.set(key, formatter);
  }
  return formatter.format(minorUnits / 100);
}

/**
 * Turns what the user typed into minor units: '9.99' → 999, '£1,200' → 120000.
 * A lone comma followed by 1–2 digits is treated as a decimal point ('12,50' → 1250),
 * because many phone keyboards show ',' instead of '.'.
 * Returns null if it isn't a valid non-negative amount with at most 2 decimals.
 */
export function parseMoneyInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.includes('-')) return null;
  const decimalComma = /^[^.,]*\d,\d{1,2}$/.test(trimmed);
  const normalised = decimalComma ? trimmed.replace(',', '.') : trimmed;
  const cleaned = normalised.replace(/[^\d.]/g, '');
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
}
