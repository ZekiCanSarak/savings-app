import type { CurrencyCode } from '@/types/models';

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

export type CurrencyInfo = {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /**
   * Locale used to format amounts the way people in that currency's main
   * country expect: '₹12,34,567.50', '₺1.234,50', 'CHF 1’234.50'.
   */
  locale: string;
};

/** Currencies offered in Settings, in display order. */
export const CURRENCIES: CurrencyInfo[] = [
  { code: 'GBP', symbol: '£', name: 'British pound', locale: 'en-GB' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'en-IE' },
  { code: 'USD', symbol: '$', name: 'US dollar', locale: 'en-US' },
  { code: 'CAD', symbol: '$', name: 'Canadian dollar', locale: 'en-CA' },
  { code: 'AUD', symbol: '$', name: 'Australian dollar', locale: 'en-AU' },
  { code: 'NZD', symbol: '$', name: 'New Zealand dollar', locale: 'en-NZ' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss franc', locale: 'de-CH' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee', locale: 'en-IN' },
  { code: 'TRY', symbol: '₺', name: 'Turkish lira', locale: 'tr-TR' },
];

export function currencyInfo(code: CurrencyCode): CurrencyInfo {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}
