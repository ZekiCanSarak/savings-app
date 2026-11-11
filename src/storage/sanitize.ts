import { CURRENCIES, DEFAULT_CURRENCY } from '@/constants/currencies';
import { DEFAULT_GOAL_EMOJI } from '@/constants/goal-emojis';
import type {
  AppData,
  Contribution,
  CurrencyCode,
  ReminderSettings,
  SavingsGoal,
  UserProfile,
} from '@/types/models';

/**
 * Repairs data loaded from storage so a bad or outdated save can never crash
 * the app: unknown currencies fall back to GBP, impossible numbers are dropped,
 * savings for goals that no longer exist are removed, and reminder settings
 * are kept in range. Valid data passes through unchanged.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isPositiveWhole = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;
const clampWhole = (v: unknown, min: number, max: number, fallback: number) =>
  Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v as number))) : fallback;

function sanitizeCurrency(value: unknown): CurrencyCode {
  return CURRENCIES.some((c) => c.code === value) ? (value as CurrencyCode) : DEFAULT_CURRENCY;
}

function sanitizeProfile(value: unknown, fallback: UserProfile): UserProfile {
  if (!isObject(value)) return fallback;
  const income = value.monthlyIncome;
  return {
    name: typeof value.name === 'string' ? value.name : fallback.name,
    currency: sanitizeCurrency(value.currency),
    monthlyIncome: Number.isSafeInteger(income) && (income as number) >= 0 ? (income as number) : null,
  };
}

function sanitizeGoals(value: unknown): SavingsGoal[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap((g): SavingsGoal[] => {
    if (!isObject(g) || typeof g.id !== 'string' || seen.has(g.id)) return [];
    if (typeof g.name !== 'string' || !isPositiveWhole(g.targetAmount)) return [];
    seen.add(g.id);
    return [
      {
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        targetDate: typeof g.targetDate === 'string' && ISO_DATE.test(g.targetDate) ? g.targetDate : null,
        emoji: typeof g.emoji === 'string' && g.emoji ? g.emoji : DEFAULT_GOAL_EMOJI,
        createdAt:
          typeof g.createdAt === 'string' && !Number.isNaN(Date.parse(g.createdAt))
            ? g.createdAt
            : new Date().toISOString(),
      },
    ];
  });
}

function sanitizeContributions(value: unknown, goalIds: Set<string>): Contribution[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((c): Contribution[] => {
    if (!isObject(c) || typeof c.id !== 'string' || typeof c.goalId !== 'string') return [];
    // Savings for a deleted goal would otherwise still count in "saved this month".
    if (!goalIds.has(c.goalId)) return [];
    if (!isPositiveWhole(c.amount) || typeof c.date !== 'string' || !ISO_DATE.test(c.date)) return [];
    return [
      {
        id: c.id,
        goalId: c.goalId,
        amount: c.amount,
        date: c.date,
        ...(typeof c.note === 'string' && c.note ? { note: c.note } : {}),
      },
    ];
  });
}

function sanitizeReminders(value: unknown, fallback: ReminderSettings): ReminderSettings {
  if (!isObject(value)) return fallback;
  return {
    enabled: value.enabled === true,
    frequency: value.frequency === 'monthly' ? 'monthly' : 'weekly',
    weekday: clampWhole(value.weekday, 1, 7, fallback.weekday),
    dayOfMonth: clampWhole(value.dayOfMonth, 1, 28, fallback.dayOfMonth),
    hour: clampWhole(value.hour, 0, 23, fallback.hour),
    minute: clampWhole(value.minute, 0, 59, fallback.minute),
  };
}

export function sanitizeAppData(saved: unknown, defaults: AppData): AppData {
  if (!isObject(saved)) return defaults;
  const goals = sanitizeGoals(saved.goals);
  return {
    onboardingComplete: saved.onboardingComplete === true,
    profile: sanitizeProfile(saved.profile, defaults.profile),
    reminders: sanitizeReminders(saved.reminders, defaults.reminders),
    reminderPromptDismissed: saved.reminderPromptDismissed === true,
    goals,
    contributions: sanitizeContributions(saved.contributions, new Set(goals.map((g) => g.id))),
  };
}
