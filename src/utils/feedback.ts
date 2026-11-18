import type { IsoTimestamp } from '@/types/models';

/**
 * Home's one-time "What do you think?" card: shown once the user has had the
 * app for a few days, never in the demo, and never again after an answer.
 */
export function shouldAskForFeedback(
  {
    startedAt,
    dismissed,
    demo,
    hasFeedbackLink,
  }: { startedAt: IsoTimestamp | null; dismissed: boolean; demo: boolean; hasFeedbackLink: boolean },
  days: number,
  now: Date = new Date(),
): boolean {
  if (!hasFeedbackLink || dismissed || demo || !startedAt) return false;
  return now.getTime() - Date.parse(startedAt) >= days * 24 * 60 * 60 * 1000;
}
