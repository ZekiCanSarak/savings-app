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
  /** Amount saved in minor units. Always positive. */
  amount: number;
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

/** Everything that gets saved to the device. */
export type AppData = {
  /** False until the user finishes the welcome flow. */
  onboardingComplete: boolean;
  profile: UserProfile;
  reminders: ReminderSettings;
  /** The user tapped "No thanks" on the Home reminders suggestion. */
  reminderPromptDismissed: boolean;
  goals: SavingsGoal[];
  contributions: Contribution[];
};
