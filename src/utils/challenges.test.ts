import { describe, expect, it } from '@jest/globals';

import { sanitizeChallenges } from '@/storage/sanitize';
import type { Challenge, Contribution } from '@/types/models';
import { createBackup, parseBackup } from '@/utils/backup';
import {
  challengeNote,
  challengeProgress,
  challengeTotal,
  challengeUnits,
  doneSteps,
  nextStep,
  stepAmount,
} from '@/utils/challenges';

const challenge = (extra: Partial<Challenge> = {}): Challenge => ({
  id: 'ch',
  kind: '52-week',
  goalId: 'g',
  unit: 100,
  startedAt: '2026-11-01T10:00:00.000Z',
  steps: {},
  ...extra,
});
const saving = (id: string, amount: number): Contribution => ({
  id,
  goalId: 'g',
  amount,
  date: '2026-11-02',
});

describe('challenge amounts', () => {
  it('52-week: week n saves n × the step, £1,378 in all at £1', () => {
    expect(stepAmount('52-week', 3, 100)).toBe(300);
    expect(challengeTotal('52-week', 100)).toBe(137_800);
    expect(challengeTotal('52-week', 50)).toBe(68_900);
  });

  it('100 envelopes: £505 in all at 10p', () => {
    expect(stepAmount('100-envelopes', 100, 10)).toBe(1000);
    expect(challengeTotal('100-envelopes', 10)).toBe(50_500);
  });

  it('30-day: the same every day', () => {
    expect(stepAmount('daily', 17, 200)).toBe(200);
    expect(challengeTotal('daily', 200)).toBe(6000);
  });

  it('scales the steps for currencies with small units', () => {
    expect(challengeUnits('52-week', 'GBP')).toEqual([50, 100, 200]);
    expect(challengeUnits('52-week', 'INR')).toEqual([1000, 2000, 4000]);
  });
});

describe('challenge progress', () => {
  const c = challenge({ steps: { '1': 'a', '2': 'b', '3': 'gone' } });
  const contributions = [saving('a', 100), saving('b', 200)];

  it('counts only steps whose saving still exists', () => {
    expect(doneSteps(c, contributions)).toEqual([1, 2]);
    expect(challengeProgress(c, contributions)).toMatchObject({
      done: 2,
      steps: 52,
      saved: 300,
      total: 137_800,
    });
  });

  it('suggests the first step not done (none for any-order challenges)', () => {
    expect(nextStep(c, contributions)).toBe(3);
    expect(nextStep(challenge({ kind: '100-envelopes' }), contributions)).toBeNull();
  });

  it('is finished when every step is done', () => {
    const steps = Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [String(i + 1), `d${i + 1}`]),
    );
    const all = Array.from({ length: 30 }, (_, i) => saving(`d${i + 1}`, 200));
    expect(challengeProgress(challenge({ kind: 'daily', unit: 200, steps }), all)).toMatchObject({
      finished: true,
      percent: 100,
      saved: 6000,
    });
  });

  it('labels the saving it logs', () => {
    expect(challengeNote('52-week', 3)).toBe('52-week challenge · Week 3');
  });
});

describe('saved challenges', () => {
  const goals = [
    {
      id: 'g',
      name: 'Holiday',
      emoji: '✈️',
      targetAmount: 100000,
      targetDate: null,
      createdAt: '2026-06-01T09:00:00.000Z',
    },
  ];
  const contributions = [saving('a', 100)];
  const saved = [
    {
      id: 'ok',
      kind: '52-week',
      goalId: 'g',
      unit: 100,
      startedAt: '2026-11-01T10:00:00.000Z',
      steps: { '1': 'a', '2': 'missing', '99': 'a' },
    },
    {
      id: 'no-goal',
      kind: '52-week',
      goalId: 'gone',
      unit: 100,
      startedAt: '2026-11-01T10:00:00.000Z',
      steps: {},
    },
    {
      id: 'bad-kind',
      kind: 'weekly',
      goalId: 'g',
      unit: 100,
      startedAt: '2026-11-01T10:00:00.000Z',
      steps: {},
    },
  ];

  it('keeps valid challenges and only real ticked steps', () => {
    const result = sanitizeChallenges(saved, new Set(['g']), new Set(['a']));
    expect(result.map((c) => c.id)).toEqual(['ok']);
    expect(result[0].steps).toEqual({ '1': 'a' });
  });

  it('travels in backups, and older backups import with none', () => {
    const challenges = sanitizeChallenges(saved, new Set(['g']), new Set(['a']));
    const parsed = parseBackup(
      createBackup({
        profile: { name: 'Sam', currency: 'GBP', monthlyIncome: null },
        goals,
        contributions,
        challenges,
      }),
    );
    expect(parsed.ok && parsed.value.challenges).toEqual(challenges);
    const old = parseBackup(
      JSON.stringify({
        app: 'goalpot',
        version: 1,
        exportedAt: '2026-01-01T00:00:00.000Z',
        data: { profile: {}, goals, contributions },
      }),
    );
    expect(old.ok && old.value.challenges).toEqual([]);
  });
});
