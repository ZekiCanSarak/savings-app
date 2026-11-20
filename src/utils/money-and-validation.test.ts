import { describe, expect, it } from '@jest/globals';

import { formatMoney, parseMoneyInput } from '@/utils/money';
import {
  validateContributionAmount,
  validateIncome,
  validateInterestRate,
} from '@/utils/validation';

describe('formatMoney', () => {
  it('drops pence on whole amounts and keeps them otherwise', () => {
    expect(formatMoney(34000, 'GBP')).toBe('£340');
    expect(formatMoney(34050, 'GBP')).toBe('£340.50');
    expect(formatMoney(34000, 'GBP', { decimals: 'always' })).toBe('£340.00');
  });

  it('uses each currency’s own style', () => {
    expect(formatMoney(12345650, 'INR')).toBe('₹1,23,456.50');
    expect(formatMoney(123450, 'TRY')).toBe('₺1.234,50');
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['1,234.56', 123456],
    ['1.234,56', 123456],
    ['12,50', 1250],
    ['£12', 1200],
    ["1'234.50", 123450],
  ])('reads %s', (text, expected) => {
    expect(parseMoneyInput(text)).toBe(expected);
  });

  it.each(['12abc34', '1e5', '-5', ''])('rejects %s', (text) => {
    expect(parseMoneyInput(text)).toBeNull();
  });
});

describe('validators', () => {
  it('allows an income of 0 but not a saving of 0', () => {
    expect(validateIncome('0')).toEqual({ ok: true, value: 0 });
    expect(validateContributionAmount('0').ok).toBe(false);
  });

  it('reads interest rates in hundredths of a percent', () => {
    expect(validateInterestRate('4')).toEqual({ ok: true, value: 400 });
    expect(validateInterestRate('4,25%')).toEqual({ ok: true, value: 425 });
    expect(validateInterestRate('')).toEqual({ ok: true, value: null });
    expect(validateInterestRate('0')).toEqual({ ok: true, value: null });
    expect(validateInterestRate('45').ok).toBe(false);
    expect(validateInterestRate('abc').ok).toBe(false);
  });
});
