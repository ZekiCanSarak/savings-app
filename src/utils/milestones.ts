/** Progress points worth a small celebration on the way to 100% (which has its own). */
export const MILESTONES = [25, 50, 75] as const;
export type Milestone = (typeof MILESTONES)[number];

/**
 * The milestone passed when progress goes from `before` to `after` percent,
 * or null. If a big saving jumps several at once, the highest counts; reaching
 * 100% isn't a milestone (the goal celebration covers it).
 */
export function crossedMilestone(before: number, after: number): Milestone | null {
  if (after >= 100 || after <= before) return null;
  let crossed: Milestone | null = null;
  for (const m of MILESTONES) if (before < m && after >= m) crossed = m;
  return crossed;
}

export const MILESTONE_INFO: Record<Milestone, { emoji: string; title: string; short: string }> = {
  25: { emoji: '🌱', title: 'A quarter of the way!', short: 'A quarter of the way! 🌱' },
  50: { emoji: '🎉', title: 'Halfway there!', short: 'You’re halfway! 🎉' },
  75: { emoji: '🔥', title: 'Three quarters done!', short: 'Three quarters done! 🔥' },
};

/** Whole percent saved, as goals show it (rounded down, 0–100). */
export function percentOf(saved: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.floor((saved / target) * 100)));
}
