import type { CurrencyCode } from '@/types/models';

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP';

/** Currencies offered in Settings, in display order. */
export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: 'GBP', symbol: '£', name: 'British pound' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'CAD', symbol: '$', name: 'Canadian dollar' },
  { code: 'AUD', symbol: '$', name: 'Australian dollar' },
  { code: 'NZD', symbol: '$', name: 'New Zealand dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss franc' },
  { code: 'INR', symbol: '₹', name: 'Indian rupee' },
  { code: 'TRY', symbol: '₺', name: 'Turkish lira' },
];
