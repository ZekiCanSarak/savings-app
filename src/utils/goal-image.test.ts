import { describe, expect, it } from '@jest/globals';

import { sanitizeGoals } from '@/storage/sanitize';
import { createBackup, parseBackup } from '@/utils/backup';
import { GOAL_IMAGE_PREFIX, isValidGoalImage, MAX_GOAL_IMAGE_LENGTH } from '@/utils/goal-image';

const photo = GOAL_IMAGE_PREFIX + 'A'.repeat(2000);
const goal = (extra: Record<string, unknown> = {}) => ({
  id: 'g',
  name: 'Ibiza',
  emoji: '🏖️',
  targetAmount: 50000,
  targetDate: null,
  createdAt: '2026-06-01T09:00:00.000Z',
  ...extra,
});

describe('goal photos', () => {
  it('accepts a small JPEG data URI', () => {
    expect(isValidGoalImage(photo)).toBe(true);
  });

  it('rejects other types, oversized pictures and junk', () => {
    expect(isValidGoalImage('data:image/png;base64,AAAA')).toBe(false);
    expect(isValidGoalImage(GOAL_IMAGE_PREFIX + 'A'.repeat(MAX_GOAL_IMAGE_LENGTH))).toBe(false);
    expect(isValidGoalImage(GOAL_IMAGE_PREFIX)).toBe(false);
    expect(isValidGoalImage(GOAL_IMAGE_PREFIX + '<script>')).toBe(false);
    expect(isValidGoalImage('https://example.com/a.jpg')).toBe(false);
    expect(isValidGoalImage(42)).toBe(false);
  });

  it('keeps a valid photo when loading saved data and drops an invalid one', () => {
    expect(sanitizeGoals([goal({ image: photo })])[0].image).toBe(photo);
    expect(sanitizeGoals([goal({ image: 'data:text/html,hi' })])[0]).not.toHaveProperty('image');
  });

  it('travels in backups', () => {
    const file = createBackup({
      profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 200000 },
      goals: sanitizeGoals([goal({ image: photo })]),
      contributions: [],
    });
    const parsed = parseBackup(file);
    expect(parsed.ok && parsed.value.goals[0].image).toBe(photo);
  });
});
