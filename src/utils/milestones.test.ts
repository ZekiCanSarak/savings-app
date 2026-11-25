import { describe, expect, it } from '@jest/globals';

import { crossedMilestone, percentOf } from '@/utils/milestones';

describe('crossedMilestone', () => {
  it('spots each milestone as it is passed', () => {
    expect(crossedMilestone(20, 25)).toBe(25);
    expect(crossedMilestone(45, 52)).toBe(50);
    expect(crossedMilestone(70, 80)).toBe(75);
  });

  it('counts only the highest when a big saving passes several', () => {
    expect(crossedMilestone(10, 60)).toBe(50);
    expect(crossedMilestone(0, 99)).toBe(75);
  });

  it('ignores staying put, going down and reaching 100%', () => {
    expect(crossedMilestone(30, 40)).toBeNull();
    expect(crossedMilestone(60, 40)).toBeNull();
    expect(crossedMilestone(50, 50)).toBeNull();
    expect(crossedMilestone(70, 100)).toBeNull();
  });
});

describe('percentOf', () => {
  it('rounds down and stays between 0 and 100', () => {
    expect(percentOf(499, 1000)).toBe(49);
    expect(percentOf(1500, 1000)).toBe(100);
    expect(percentOf(-10, 1000)).toBe(0);
    expect(percentOf(10, 0)).toBe(0);
  });
});
