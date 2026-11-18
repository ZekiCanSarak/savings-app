import type {
  AboutYou,
  BudgetStyle,
  EmergencyFundStatus,
  GuidanceLevel,
  PayFrequency,
  ReminderSettings,
  SavingFocus,
  SavingsGoal,
} from '@/types/models';

/**
 * Personalisation from the "About you" answers. Pure functions (no React).
 * Each answer must visibly change something; this file says what.
 */

export const DEFAULT_ABOUT: AboutYou = {
  focus: null,
  payFrequency: null,
  payday: null,
  emergencyFund: null,
  budgetStyle: '50-30-20',
  guidance: null,
  celebrations: true,
  askedAt: null,
  emergencyPromptDismissed: false,
};

type FocusInfo = {
  label: string;
  emoji: string;
  /** Finishes "£340 closer to …" on Home. */
  closerTo: string;
  /** Suggested first goal on an empty Home screen. */
  goalName: string;
};

export const FOCUS_INFO: Record<SavingFocus, FocusInfo> = {
  emergency: { label: 'An emergency fund', emoji: '🛟', closerTo: 'your safety net', goalName: 'Emergency fund' },
  purchase: { label: 'A big purchase', emoji: '💻', closerTo: 'your next big buy', goalName: 'Big purchase' },
  travel: { label: 'Travel', emoji: '✈️', closerTo: 'your next trip', goalName: 'Holiday' },
  home: { label: 'A home', emoji: '🏠', closerTo: 'your new home', goalName: 'Home deposit' },
  debt: { label: 'Paying off debt', emoji: '💳', closerTo: 'being debt-free', goalName: 'Pay off debt' },
  habit: { label: 'Building the habit', emoji: '🌱', closerTo: 'a solid saving habit', goalName: 'Rainy day savings' },
};

/** 💳 isn't one of the goal emojis, so the debt goal uses 💰. */
export function goalEmojiForFocus(focus: SavingFocus): string {
  return focus === 'debt' ? '💰' : focus === 'habit' ? '🎯' : FOCUS_INFO[focus].emoji;
}

export const PAY_INFO: Record<PayFrequency, { label: string; description: string }> = {
  monthly: { label: 'Monthly', description: 'Once a month, on about the same day' },
  'four-weekly': { label: 'Every 4 weeks', description: '13 paydays a year' },
  weekly: { label: 'Weekly', description: 'Every week' },
  irregular: { label: 'It varies', description: 'Freelance, shifts, student loan or similar' },
};

export const EMERGENCY_INFO: Record<EmergencyFundStatus, { label: string; description: string }> = {
  covered: { label: 'Yes, 3+ months’ worth', description: 'Enough to cover essentials for a while' },
  some: { label: 'A little', description: 'Something, but not much yet' },
  none: { label: 'Not yet', description: 'Nothing set aside right now' },
};

export const BUDGET_STYLE_INFO: Record<
  BudgetStyle,
  { label: string; name: string; description: string; shares: { needs: number; wants: number; savings: number } }
> = {
  '50-30-20': {
    label: '50/30/20',
    name: 'Balanced',
    description: 'Half on needs, 30% on wants, 20% saved. The classic starting point.',
    shares: { needs: 50, wants: 30, savings: 20 },
  },
  '60-20-20': {
    label: '60/20/20',
    name: 'High rent or bills',
    description: 'More room for essentials, still saving 20%.',
    shares: { needs: 60, wants: 20, savings: 20 },
  },
  '70-20-10': {
    label: '70/20/10',
    name: 'Tight month to month',
    description: 'Essentials first, saving 10% to keep the habit going.',
    shares: { needs: 70, wants: 20, savings: 10 },
  },
};

export const GUIDANCE_INFO: Record<GuidanceLevel, { label: string; description: string }> = {
  guided: { label: 'I’m new to this', description: 'Explain things as I go' },
  brief: { label: 'I know the basics', description: 'Keep it short' },
};

/** Treat "skipped" as wanting explanations: safer for someone who didn't say. */
export function wantsGuidance(about: AboutYou): boolean {
  return about.guidance !== 'brief';
}

/**
 * A monthly amount expressed per payday, for people paid weekly or every
 * 4 weeks: "about £12 a week". Null when monthly or unknown.
 */
export function perPayPeriod(
  monthlyAmount: number,
  frequency: PayFrequency | null,
): { amount: number; per: string } | null {
  if (frequency === 'weekly') return { amount: Math.round((monthlyAmount * 12) / 52), per: 'a week' };
  if (frequency === 'four-weekly') return { amount: Math.round((monthlyAmount * 12) / 13), per: 'every 4 weeks' };
  return null;
}

/**
 * Sensible reminder schedule for how the user is paid: the day after payday
 * for monthly pay, otherwise weekly. Reminder days stop at 28 (so every month
 * has one), so paydays from the 28th on remind on the 1st, just after.
 */
export function reminderDefaultsFor(about: AboutYou): Partial<ReminderSettings> {
  if (about.payFrequency === 'monthly' && about.payday !== null) {
    return { frequency: 'monthly', dayOfMonth: about.payday >= 28 ? 1 : about.payday + 1 };
  }
  if (about.payFrequency === 'weekly' || about.payFrequency === 'four-weekly') {
    return { frequency: 'weekly' };
  }
  return {};
}

/** Three months of essentials, from the "needs" part of the budget. */
export function emergencyFundTarget(monthlyNeeds: number): number {
  return monthlyNeeds * 3;
}

/** Whether any goal already looks like an emergency fund. */
export function hasEmergencyGoal(goals: SavingsGoal[]): boolean {
  return goals.some((g) => /emergency|rainy|safety/i.test(g.name) || g.emoji === '🛟');
}

/** Show Home's "Start an emergency fund" card? */
export function shouldSuggestEmergencyFund(about: AboutYou, goals: SavingsGoal[]): boolean {
  return (
    (about.emergencyFund === 'none' || about.emergencyFund === 'some') &&
    !about.emergencyPromptDismissed &&
    !hasEmergencyGoal(goals)
  );
}
