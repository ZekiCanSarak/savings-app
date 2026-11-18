/**
 * Core data types for the app.
 *
 * Conventions (see CLAUDE.md):
 * - Money is stored as whole minor units (pence/cents) — £9.99 is 999.
 * - Calendar dates are 'YYYY-MM-DD' strings; timestamps are full ISO strings.
 */

/** Currencies the user can pick. All use 2 decimal places, so "minor units" = 1/100. */
export type CurrencyCode = 'GBP' | 'EUR' | 'USD' | 'CAD' | 'AUD' | 'NZD' | 'CHF' | 'INR' | 'TRY';

/** A calendar date, e.g. '2027-03-31'. */
export type IsoDate = string;

/** A moment in time, e.g. '2026-11-11T14:03:00.000Z'. */
export type IsoTimestamp = string;

export type UserProfile = {
  name: string;
  currency: CurrencyCode;
  /** Monthly income after tax in minor units, or null until the user enters it. */
  monthlyIncome: number | null;
};

export type SavingsGoal = {
  id: string;
  name: string;
  /** Target amount in minor units. */
  targetAmount: number;
  /** Date the user wants to reach the goal by. Optional. */
  targetDate: IsoDate | null;
  /** A single emoji shown next to the goal, e.g. '💻'. */
  emoji: string;
  createdAt: IsoTimestamp;
};

export type Contribution = {
  id: string;
  goalId: string;
  /** Amount in minor units. Always positive; `withdrawal` says which way it went. */
  amount: number;
  /** True for money taken out of the goal ("Take money out"). Missing = money saved. */
  withdrawal?: true;
  /** The day the money was saved. */
  date: IsoDate;
  note?: string;
};

export type ReminderFrequency = 'weekly' | 'monthly';

export type ReminderSettings = {
  /** Only true once the user has turned reminders on AND allowed notifications. */
  enabled: boolean;
  frequency: ReminderFrequency;
  /** For weekly reminders: 1 = Sunday … 7 = Saturday (expo-notifications' numbering). */
  weekday: number;
  /** For monthly reminders: 1–28, so every month has that day. */
  dayOfMonth: number;
  /** 0–23 */
  hour: number;
  /** 0–59 */
  minute: number;
};

/** What the user is mainly saving for (welcome flow / "About you"). */
export type SavingFocus = 'emergency' | 'purchase' | 'travel' | 'home' | 'debt' | 'habit';

/** How often the user is paid. 'irregular' = freelance, shifts, student loan and so on. */
export type PayFrequency = 'monthly' | 'four-weekly' | 'weekly' | 'irregular';

export type EmergencyFundStatus = 'covered' | 'some' | 'none';

/** Needs / wants / savings shares, in percent. */
export type BudgetStyle = '50-30-20' | '60-20-20' | '70-20-10';

/** Which week of the month a pattern payday falls in; -1 = the last one. */
export type WeekOfMonth = 1 | 2 | 3 | 4 | -1;

/**
 * When someone whose pay "varies" usually gets paid: set days of the month
 * (e.g. the 1st and 15th), or a pattern like "the last Friday of every month".
 */
export type PaySchedule =
  | { kind: 'dates'; days: number[] }
  | { kind: 'pattern'; week: WeekOfMonth; weekday: number };

/** 'guided' shows short explanations and every tip; 'brief' keeps screens short. */
export type GuidanceLevel = 'guided' | 'brief';

/**
 * Answers that personalise the app. Every question can be skipped, so `null`
 * means "not answered" and the app falls back to its general behaviour.
 */
export type AboutYou = {
  focus: SavingFocus | null;
  payFrequency: PayFrequency | null;
  /** Day of the month the user is paid (1–31). Only used when paid monthly. */
  payday: number | null;
  /** Weekday the user is paid, 1 = Sunday … 7 = Saturday. Used when paid weekly or every 4 weeks. */
  payWeekday: number | null;
  /** Usual paydays when pay "varies". null = no set days. */
  paySchedule: PaySchedule | null;
  emergencyFund: EmergencyFundStatus | null;
  budgetStyle: BudgetStyle;
  guidance: GuidanceLevel | null;
  /** Confetti when a goal is reached. */
  celebrations: boolean;
  /** When the user last went through the questions; null = never asked (shows a Home prompt). */
  askedAt: IsoTimestamp | null;
  /** The user tapped "No thanks" on Home's emergency fund suggestion. */
  emergencyPromptDismissed: boolean;
};

/** 'system' follows the phone's light/dark setting. */
export type Appearance = 'system' | 'light' | 'dark';

/** Everything that gets saved to the device. */
export type AppData = {
  /** False until the user finishes the welcome flow. */
  onboardingComplete: boolean;
  profile: UserProfile;
  reminders: ReminderSettings;
  about: AboutYou;
  /** Light / dark mode choice (Settings → Appearance). */
  appearance: Appearance;
  /** Ask for Face ID / fingerprint / passcode when the app opens. Phone only. */
  appLock: boolean;
  /** The payday the user last answered the Home check-in for ('YYYY-MM-DD'). */
  paydayCheckIn: IsoDate | null;
  /** Year whose "Year in review" card the user closed on Home. */
  yearReviewDismissed: number | null;
  /** The user tapped "No thanks" on the Home reminders suggestion. */
  reminderPromptDismissed: boolean;
  /** Sample data from "Try the demo" is loaded (a banner offers "Start for real"). */
  demo: boolean;
  /** When the user finished the welcome flow (or this was first saved). Times the feedback card. */
  startedAt: IsoTimestamp | null;
  /** The user answered or closed Home's one-time "What do you think?" card. */
  feedbackPromptDismissed: boolean;
  goals: SavingsGoal[];
  contributions: Contribution[];
};
