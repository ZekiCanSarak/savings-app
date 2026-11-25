import type { Challenge, ChallengeKind, Contribution, CurrencyCode } from '@/types/models';

type ChallengeInfo = {
  name: string;
  emoji: string;
  /** How many steps (weeks, envelopes, days). */
  steps: number;
  /** "Week 3", "Envelope 3", "Day 3". */
  stepLabel: (step: number) => string;
  /** The amount for step n (1-based), in minor units, given the unit per step. */
  amount: (step: number, unit: number) => number;
  /** Units per step offered when starting (whole minor units, before any currency scaling). */
  units: number[];
  /** The step size suggested first. */
  defaultUnit: number;
  /** In any order (envelopes) or one after another (weeks, days)? */
  anyOrder: boolean;
  describe: (unitText: string, lastText: string) => string;
};

export const CHALLENGES: Record<ChallengeKind, ChallengeInfo> = {
  '52-week': {
    name: '52-week challenge',
    emoji: '📅',
    steps: 52,
    stepLabel: (n) => `Week ${n}`,
    amount: (n, unit) => n * unit,
    units: [50, 100, 200],
    defaultUnit: 100,
    anyOrder: false,
    describe: (unit, last) =>
      `Save ${unit} in week 1, twice that in week 2… up to ${last} in week 52.`,
  },
  '100-envelopes': {
    name: '100 envelopes',
    emoji: '✉️',
    steps: 100,
    stepLabel: (n) => `Envelope ${n}`,
    amount: (n, unit) => n * unit,
    units: [10, 50, 100],
    defaultUnit: 10,
    anyOrder: true,
    describe: (unit, last) =>
      `100 envelopes from ${unit} up to ${last}. Pick any one you can afford, in any order.`,
  },
  daily: {
    name: '30-day challenge',
    emoji: '🔥',
    steps: 30,
    stepLabel: (n) => `Day ${n}`,
    amount: (_n, unit) => unit,
    units: [100, 200, 500],
    defaultUnit: 200,
    anyOrder: false,
    describe: (unit) => `Save ${unit} every day for 30 days.`,
  },
};

export const CHALLENGE_KINDS = Object.keys(CHALLENGES) as ChallengeKind[];

/** Currencies whose units are small get bigger steps (₹1 a week isn't a challenge). */
const UNIT_SCALE: Partial<Record<CurrencyCode, number>> = { INR: 20, TRY: 10 };

/** The step sizes offered for a challenge in this currency (minor units). */
export function challengeUnits(kind: ChallengeKind, currency: CurrencyCode): number[] {
  const scale = UNIT_SCALE[currency] ?? 1;
  return CHALLENGES[kind].units.map((u) => u * scale);
}

export function defaultChallengeUnit(kind: ChallengeKind, currency: CurrencyCode): number {
  return CHALLENGES[kind].defaultUnit * (UNIT_SCALE[currency] ?? 1);
}

export function stepAmount(kind: ChallengeKind, step: number, unit: number): number {
  return CHALLENGES[kind].amount(step, unit);
}

/** Everything the challenge saves when finished. */
export function challengeTotal(kind: ChallengeKind, unit: number): number {
  let total = 0;
  for (let n = 1; n <= CHALLENGES[kind].steps; n++) total += stepAmount(kind, n, unit);
  return total;
}

/** Ticked steps whose saving still exists (one deleted from the goal's history no longer counts). */
export function doneSteps(challenge: Challenge, contributions: Contribution[]): number[] {
  const ids = new Set(contributions.map((c) => c.id));
  return Object.entries(challenge.steps)
    .filter(([, id]) => ids.has(id))
    .map(([step]) => Number(step))
    .sort((a, b) => a - b);
}

export type ChallengeProgress = {
  done: number;
  steps: number;
  saved: number;
  total: number;
  percent: number;
  finished: boolean;
};

export function challengeProgress(
  challenge: Challenge,
  contributions: Contribution[],
): ChallengeProgress {
  const info = CHALLENGES[challenge.kind];
  const done = doneSteps(challenge, contributions);
  const saved = done.reduce((sum, n) => sum + stepAmount(challenge.kind, n, challenge.unit), 0);
  const total = challengeTotal(challenge.kind, challenge.unit);
  return {
    done: done.length,
    steps: info.steps,
    saved,
    total,
    percent: Math.floor((done.length / info.steps) * 100),
    finished: done.length === info.steps,
  };
}

/** The step to do next: the first one not done (null once finished, or for any-order challenges). */
export function nextStep(challenge: Challenge, contributions: Contribution[]): number | null {
  if (CHALLENGES[challenge.kind].anyOrder) return null;
  const done = new Set(doneSteps(challenge, contributions));
  for (let n = 1; n <= CHALLENGES[challenge.kind].steps; n++) if (!done.has(n)) return n;
  return null;
}

/** The note on the saving a ticked step logs, e.g. "52-week challenge · Week 3". */
export function challengeNote(kind: ChallengeKind, step: number): string {
  return `${CHALLENGES[kind].name} · ${CHALLENGES[kind].stepLabel(step)}`;
}
