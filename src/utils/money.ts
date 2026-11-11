import { currencyInfo } from '@/constants/currencies';
import type { CurrencyCode } from '@/types/models';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: CurrencyCode, decimals: 0 | 2): Intl.NumberFormat {
  const key = `${currency}-${decimals}`;
  let f = formatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(currencyInfo(currency).locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      // Very old devices may lack a locale; British formatting is a safe fallback.
      f = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    }
    formatters.set(key, f);
  }
  return f;
}

/**
 * Formats minor units for display, in the currency's own style.
 *
 * By default whole amounts drop the pence and others keep two decimals:
 * 34000 → '£340', 34050 → '£340.50', for TRY 123450 → '₺1.234,50'.
 * - `{ decimals: 'always' }` → always 2 decimals ('£340.00'), e.g. for columns
 * - `{ decimals: 'never' }` → rounded to whole units ('£341')
 */
export function formatMoney(
  minorUnits: number,
  currency: CurrencyCode,
  options: { decimals?: 'auto' | 'always' | 'never' } = {},
): string {
  const mode = options.decimals ?? 'auto';
  const whole = minorUnits % 100 === 0;
  const decimals = mode === 'never' || (mode === 'auto' && whole) ? 0 : 2;
  return formatter(currency, decimals).format(minorUnits / 100);
}

/**
 * Turns what the user typed into minor units: '9.99' → 999, '£1,200' → 120000.
 * Commas work as a decimal point too, because many phone keyboards show ','
 * instead of '.': '12,50' → 1250, and '1.234,56' → 123456.
 * Returns null if it isn't a valid non-negative amount with at most 2 decimals.
 */
export function parseMoneyInput(text: string): number | null {
  const trimmed = text.trim().replace(/[\s'’]/g, '');
  if (trimmed.includes('-')) return null;

  let normalised = trimmed;
  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  if (lastComma > lastDot && /,\d{1,2}$/.test(trimmed) && (lastDot !== -1 || !/,\d{3}/.test(trimmed))) {
    // Comma is the decimal point ('12,50' or '1.234,56'); dots are thousands.
    normalised = trimmed.replace(/\./g, '').replace(',', '.');
  }
  const cleaned = normalised.replace(/[^\d.]/g, '');
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
}
