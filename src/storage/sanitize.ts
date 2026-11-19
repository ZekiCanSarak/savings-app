import { CURRENCIES, DEFAULT_CURRENCY } from '@/constants/currencies';
import { DEFAULT_GOAL_EMOJI } from '@/constants/goal-emojis';
import type {
  AboutYou,
  PaySchedule,
  AppData,
  Contribution,
  CurrencyCode,
  RepeatingSaving,
  ReminderSettings,
  SavingsGoal,
  UserProfile,
} from '@/types/models';
import { todayIsoDate } from '@/utils/dates';
import { MAX_INTEREST_RATE } from '@/utils/interest';
import { MAX_GOAL_TARGET } from '@/utils/validation';

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

export function sanitizeProfile(value: unknown, fallback: UserProfile): UserProfile {
  if (!isObject(value)) return fallback;
  const income = value.monthlyIncome;
  return {
    name: typeof value.name === 'string' ? value.name : fallback.name,
    currency: sanitizeCurrency(value.currency),
    monthlyIncome: Number.isSafeInteger(income) && (income as number) >= 0 ? (income as number) : null,
  };
}

/** A valid repeating saving as `{ repeating }`, or `{}` to drop a broken one. */
function sanitizeRepeating(value: unknown): { repeating?: RepeatingSaving } {
  if (!isObject(value) || !isPositiveWhole(value.amount) || value.amount > MAX_GOAL_TARGET) return {};
  return {
    repeating: {
      amount: value.amount,
      dayOfMonth: clampWhole(value.dayOfMonth, 1, 31, 1),
      // Without a valid date, start from today rather than logging past months.
      loggedThrough:
        typeof value.loggedThrough === 'string' && ISO_DATE.test(value.loggedThrough)
          ? value.loggedThrough
          : todayIsoDate(),
    },
  };
}

export function sanitizeGoals(value: unknown): SavingsGoal[] {
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
        ...sanitizeRepeating(g.repeating),
        ...(isPositiveWhole(g.interestRate) && g.interestRate <= MAX_INTEREST_RATE
          ? { interestRate: g.interestRate }
          : {}),
      },
    ];
  });
}

export function sanitizeContributions(value: unknown, goalIds: Set<string>): Contribution[] {
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
        ...(c.withdrawal === true ? { withdrawal: true as const } : {}),
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

function sanitizePaySchedule(value: unknown): PaySchedule | null {
  if (!isObject(value)) return null;
  if (value.kind === 'dates' && Array.isArray(value.days)) {
    const days = [...new Set(value.days.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 31))]
      .sort((a, b) => a - b);
    return days.length > 0 ? { kind: 'dates', days } : null;
  }
  if (value.kind === 'pattern' && [1, 2, 3, 4, -1].includes(value.week as number)) {
    return {
      kind: 'pattern',
      week: value.week as 1 | 2 | 3 | 4 | -1,
      weekday: clampWhole(value.weekday, 1, 7, 6),
    };
  }
  return null;
}

const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | null =>
  options.includes(value as T) ? (value as T) : null;

export function sanitizeAbout(value: unknown, fallback: AboutYou): AboutYou {
  if (!isObject(value)) return fallback;
  return {
    focus: oneOf(value.focus, ['emergency', 'purchase', 'travel', 'home', 'debt', 'habit']),
    payFrequency: oneOf(value.payFrequency, ['monthly', 'four-weekly', 'weekly', 'irregular']),
    payday: Number.isFinite(value.payday) ? clampWhole(value.payday, 1, 31, 1) : null,
    payWeekday: Number.isFinite(value.payWeekday) ? clampWhole(value.payWeekday, 1, 7, 6) : null,
    paySchedule: sanitizePaySchedule(value.paySchedule),
    emergencyFund: oneOf(value.emergencyFund, ['covered', 'some', 'none']),
    budgetStyle: oneOf(value.budgetStyle, ['50-30-20', '60-20-20', '70-20-10']) ?? fallback.budgetStyle,
    guidance: oneOf(value.guidance, ['guided', 'brief']),
    celebrations: value.celebrations !== false,
    askedAt:
      typeof value.askedAt === 'string' && !Number.isNaN(Date.parse(value.askedAt))
        ? value.askedAt
        : null,
    emergencyPromptDismissed: value.emergencyPromptDismissed === true,
  };
}

const timestampOrNull = (v: unknown): string | null =>
  typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null;

export function sanitizeAppData(saved: unknown, defaults: AppData): AppData {
  if (!isObject(saved)) return defaults;
  const goals = sanitizeGoals(saved.goals);
  return {
    onboardingComplete: saved.onboardingComplete === true,
    profile: sanitizeProfile(saved.profile, defaults.profile),
    reminders: sanitizeReminders(saved.reminders, defaults.reminders),
    about: sanitizeAbout(saved.about, defaults.about),
    appearance:
      saved.appearance === 'light' || saved.appearance === 'dark' ? saved.appearance : 'system',
    appLock: saved.appLock === true,
    paydayCheckIn:
      typeof saved.paydayCheckIn === 'string' && ISO_DATE.test(saved.paydayCheckIn)
        ? saved.paydayCheckIn
        : null,
    yearReviewDismissed: Number.isSafeInteger(saved.yearReviewDismissed)
      ? (saved.yearReviewDismissed as number)
      : null,
    reminderPromptDismissed: saved.reminderPromptDismissed === true,
    demo: saved.demo === true,
    startedAt:
      typeof saved.startedAt === 'string' && !Number.isNaN(Date.parse(saved.startedAt))
        ? saved.startedAt
        : null,
    feedbackPromptDismissed: saved.feedbackPromptDismissed === true,
    lastBackupAt: timestampOrNull(saved.lastBackupAt),
    backupPromptSnoozedAt: timestampOrNull(saved.backupPromptSnoozedAt),
    installPromptDismissed: saved.installPromptDismissed === true,
    goals,
    contributions: sanitizeContributions(saved.contributions, new Set(goals.map((g) => g.id))),
  };
}
