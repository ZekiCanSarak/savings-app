import { describe, expect, it } from '@jest/globals';

import { quickSaveAmounts } from '@/utils/quick-save';

describe('quickSaveAmounts', () => {
  it('offers £5, £10 and £20 when plenty is left', () => {
    expect(quickSaveAmounts(50_000, 'GBP')).toEqual([500, 1000, 2000]);
  });

  it('replaces steps bigger than what is left with one amount that finishes the goal', () => {
    expect(quickSaveAmounts(1500, 'GBP')).toEqual([500, 1000, 1500]);
    expect(quickSaveAmounts(700, 'GBP')).toEqual([500, 700]);
    expect(quickSaveAmounts(340, 'GBP')).toEqual([340]);
  });

  it('never offers a step equal to what is left twice', () => {
    expect(quickSaveAmounts(1000, 'GBP')).toEqual([500, 1000]);
  });

  it('offers nothing once a goal is reached', () => {
    expect(quickSaveAmounts(0, 'GBP')).toEqual([]);
  });

  it('uses bigger steps for currencies with small units', () => {
    expect(quickSaveAmounts(10_000_000, 'INR')).toEqual([10_000, 25_000, 50_000]);
    expect(quickSaveAmounts(10_000_000, 'TRY')).toEqual([5_000, 10_000, 25_000]);
  });
});
