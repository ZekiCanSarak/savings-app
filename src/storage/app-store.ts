import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { DEFAULT_CURRENCY } from '@/constants/currencies';
import { demoData } from '@/data/demo';
import type {
  AboutYou,
  AppData,
  Appearance,
  Contribution,
  RepeatingSaving,
  ReminderSettings,
  SavingsGoal,
  UserProfile,
} from '@/types/models';
import { nowIsoTimestamp } from '@/utils/dates';
import type { BackupData } from '@/utils/backup';
import { createId } from '@/utils/id';
import { DEFAULT_ABOUT, reminderDefaultsFor } from '@/utils/personal';
import { dueRepeatingSavings } from '@/utils/repeating';

import { sanitizeAppData } from './sanitize';

/**
 * The app's single data store. Screens read and change data only through
 * this store (via the hooks in src/hooks/use-app-data.ts), never through
 * AsyncStorage directly.
 *
 * `persist` saves AppData to AsyncStorage on every change and loads it back
 * when the app starts.
 */

/**
 * On web, Expo Router first renders pages on the server (Node), where there is
 * no `window`/localStorage, and AsyncStorage throws. Use a do-nothing storage
 * there; the browser then loads the real data when the page starts.
 */
const isServerRender = Platform.OS === 'web' && typeof window === 'undefined';
const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/**
 * Saving can fail when storage is full (browsers allow ~5 MB, and goal photos
 * take some of it). Instead of failing silently, tell whoever is listening
 * (the root layout shows a message); the data stays in memory meanwhile.
 */
let onSaveFailed: (() => void) | null = null;
export function setSaveFailedHandler(handler: (() => void) | null) {
  onSaveFailed = handler;
}
const safeStorage: StateStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {
      onSaveFailed?.();
    }
  },
  removeItem: (key) => AsyncStorage.removeItem(key),
};

/** Bump this when AppData's shape changes, and handle the old shape in `migrate`. */
const STORAGE_VERSION = 9;
const STORAGE_KEY = 'savings-app-data';

export type NewGoal = Omit<SavingsGoal, 'id' | 'createdAt'>;
export type NewContribution = Omit<Contribution, 'id'>;

type AppActions = {
  /**
   * Saves the profile from the (short) welcome flow and marks it as done. The
   * "About you" answers stay unasked (`askedAt: null`), so Home invites the
   * user to complete their profile.
   */
  completeOnboarding: (profile: UserProfile) => void;
  updateProfile: (changes: Partial<UserProfile>) => void;

  /** Returns the new goal's id. */
  addGoal: (goal: NewGoal) => string;
  updateGoal: (id: string, changes: Partial<NewGoal>) => void;
  /** Also deletes the goal's contributions. */
  deleteGoal: (id: string) => void;
  /** Puts a goal away (see `SavingsGoal.archivedAt`); `restoreGoal` brings it back. */
  archiveGoal: (id: string) => void;
  restoreGoal: (id: string) => void;

  /** Returns the new contribution's id. */
  addContribution: (contribution: NewContribution) => string;
  /** Several at once, e.g. a lump sum split across goals. */
  addContributions: (contributions: NewContribution[]) => void;
  updateContribution: (id: string, changes: Partial<NewContribution>) => void;
  deleteContribution: (id: string) => void;

  updateReminders: (changes: Partial<ReminderSettings>) => void;

  /**
   * Changes "About you" answers. While reminders are off, their default
   * schedule follows the pay answers (e.g. the day after payday).
   */
  updateAbout: (changes: Partial<AboutYou>) => void;

  setAppearance: (appearance: Appearance) => void;
  setAppLock: (enabled: boolean) => void;
  /** The user answered Home's payday check-in for this payday. */
  markPaydayCheckIn: (payday: string) => void;
  dismissYearReview: (year: number) => void;
  dismissReminderPrompt: () => void;

  /**
   * Replaces the profile, goals and savings with a backup's (already checked
   * with parseBackup). Reminder settings stay as they are on this device.
   */
  importBackup: (backup: BackupData) => void;

  /** Loads the sample data from "Try the demo" and skips the welcome flow. */
  startDemo: () => void;
  /** Clears the demo and goes to the welcome flow ("Start for real"). */
  endDemo: () => void;
  /** The web landing page was passed ("Get started"), so the welcome flow shows. */
  markIntroSeen: () => void;
  dismissFeedbackPrompt: () => void;

  /** Sets, changes or (with null) stops a goal's repeating saving. */
  setRepeatingSaving: (goalId: string, repeating: RepeatingSaving | null) => void;
  /** Logs every repeating saving that has fallen due (see utils/repeating.ts). */
  logRepeatingSavings: (today?: string) => void;

  /** A backup file was just exported. */
  markBackedUp: () => void;
  snoozeBackupPrompt: () => void;
  dismissInstallPrompt: () => void;

  /** Wipes everything back to a fresh install. */
  resetAllData: () => void;
};

type AppState = AppData &
  AppActions & {
    /** True once saved data has been loaded (or loading failed). Not saved. */
    isReady: boolean;
    /** The web landing page has been passed in this visit. Not saved. */
    introSeen: boolean;
  };

const initialData: AppData = {
  onboardingComplete: false,
  profile: { name: '', currency: DEFAULT_CURRENCY, monthlyIncome: null },
  reminders: {
    enabled: false,
    frequency: 'weekly',
    weekday: 1,
    dayOfMonth: 1,
    hour: 18,
    minute: 0,
  },
  about: DEFAULT_ABOUT,
  appearance: 'system',
  appLock: false,
  paydayCheckIn: null,
  yearReviewDismissed: null,
  reminderPromptDismissed: false,
  demo: false,
  startedAt: null,
  feedbackPromptDismissed: false,
  lastBackupAt: null,
  backupPromptSnoozedAt: null,
  installPromptDismissed: false,
  goals: [],
  contributions: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialData,
      isReady: false,
      introSeen: false,

      completeOnboarding: (profile) =>
        set((s) => ({
          profile,
          reminders: { ...s.reminders, ...reminderDefaultsFor(s.about) },
          onboardingComplete: true,
          demo: false,
          startedAt: nowIsoTimestamp(),
        })),
      updateProfile: (changes) => set((s) => ({ profile: { ...s.profile, ...changes } })),

      addGoal: (goal) => {
        const id = createId();
        set((s) => ({ goals: [...s.goals, { ...goal, id, createdAt: nowIsoTimestamp() }] }));
        return id;
      },
      updateGoal: (id, changes) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...changes } : g)) })),
      archiveGoal: (id) =>
        set((s) => ({
          goals: s.goals.map((g) => (g.id === id ? { ...g, archivedAt: nowIsoTimestamp() } : g)),
        })),
      restoreGoal: (id) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            const { archivedAt: _archived, ...rest } = g;
            return rest;
          }),
        })),
      deleteGoal: (id) =>
        set((s) => ({
          goals: s.goals.filter((g) => g.id !== id),
          contributions: s.contributions.filter((c) => c.goalId !== id),
        })),

      addContribution: (contribution) => {
        const id = createId();
        set((s) => ({ contributions: [...s.contributions, { ...contribution, id }] }));
        return id;
      },
      addContributions: (list) =>
        set((s) => ({
          contributions: [...s.contributions, ...list.map((c) => ({ ...c, id: createId() }))],
        })),
      updateContribution: (id, changes) =>
        set((s) => ({
          contributions: s.contributions.map((c) => (c.id === id ? { ...c, ...changes } : c)),
        })),
      deleteContribution: (id) =>
        set((s) => ({ contributions: s.contributions.filter((c) => c.id !== id) })),

      updateReminders: (changes) => set((s) => ({ reminders: { ...s.reminders, ...changes } })),

      updateAbout: (changes) =>
        set((s) => {
          const about = { ...s.about, ...changes };
          const reminders = s.reminders.enabled
            ? s.reminders
            : { ...s.reminders, ...reminderDefaultsFor(about) };
          return { about, reminders };
        }),
      dismissReminderPrompt: () => set({ reminderPromptDismissed: true }),

      setAppearance: (appearance) => set({ appearance }),
      setAppLock: (appLock) => set({ appLock }),
      markPaydayCheckIn: (paydayCheckIn) => set({ paydayCheckIn }),
      dismissYearReview: (yearReviewDismissed) => set({ yearReviewDismissed }),

      importBackup: ({ profile, goals, contributions, about }) =>
        set((s) => ({
          profile,
          goals,
          contributions,
          // Older backups have no answers; keep this device's then.
          about: about ?? s.about,
          onboardingComplete: true,
          demo: false,
          startedAt: s.demo || !s.startedAt ? nowIsoTimestamp() : s.startedAt,
        })),

      startDemo: () =>
        set({
          ...initialData,
          ...demoData(),
          onboardingComplete: true,
          demo: true,
          startedAt: nowIsoTimestamp(),
          // Keep the demo about the app itself, not about setting things up.
          reminderPromptDismissed: true,
        }),
      endDemo: () => set({ ...initialData, introSeen: true }),
      markIntroSeen: () => set({ introSeen: true }),
      dismissFeedbackPrompt: () => set({ feedbackPromptDismissed: true }),

      setRepeatingSaving: (goalId, repeating) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== goalId) return g;
            if (repeating) return { ...g, repeating };
            const { repeating: _removed, ...rest } = g;
            return rest;
          }),
        })),
      logRepeatingSavings: (today) =>
        set((s) => {
          const due = dueRepeatingSavings(s.goals, s.contributions, today);
          if (Object.keys(due.loggedThrough).length === 0) return s;
          return {
            contributions: [...s.contributions, ...due.contributions.map((c) => ({ ...c, id: createId() }))],
            goals: s.goals.map((g) =>
              g.repeating && due.loggedThrough[g.id]
                ? { ...g, repeating: { ...g.repeating, loggedThrough: due.loggedThrough[g.id] } }
                : g,
            ),
          };
        }),

      markBackedUp: () => set({ lastBackupAt: nowIsoTimestamp() }),
      snoozeBackupPrompt: () => set({ backupPromptSnoozedAt: nowIsoTimestamp() }),
      dismissInstallPrompt: () => set({ installPromptDismissed: true }),

      resetAllData: () => set(initialData),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => (isServerRender ? noopStorage : safeStorage)),
      // Only save the data itself — not actions or isReady.
      partialize: (s): AppData => ({
        onboardingComplete: s.onboardingComplete,
        profile: s.profile,
        reminders: s.reminders,
        about: s.about,
        appearance: s.appearance,
        appLock: s.appLock,
        paydayCheckIn: s.paydayCheckIn,
        yearReviewDismissed: s.yearReviewDismissed,
        reminderPromptDismissed: s.reminderPromptDismissed,
        demo: s.demo,
        startedAt: s.startedAt,
        feedbackPromptDismissed: s.feedbackPromptDismissed,
        lastBackupAt: s.lastBackupAt,
        backupPromptSnoozedAt: s.backupPromptSnoozedAt,
        installPromptDismissed: s.installPromptDismissed,
        goals: s.goals,
        contributions: s.contributions,
      }),
      // Fill in fields missing from older saves with defaults, and repair anything
      // invalid (see sanitize.ts), so a bad save can't crash the app.
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeAppData(persisted, initialData),
      }),
      migrate: (persisted, version) => {
        // v1 → v2 added `about`; v2 → v3 added appearance, appLock, paydayCheckIn,
        // yearReviewDismissed, payWeekday and withdrawals; v3 → v4 added
        // about.paySchedule; v4 → v5 added demo, startedAt, feedbackPromptDismissed;
        // v5 → v6 added goal.repeating, lastBackupAt, backupPromptSnoozedAt, installPromptDismissed;
        // v6 → v7 added goal.interestRate; v7 → v8 added goal.archivedAt; v8 → v9 added goal.image.
        // sanitizeAppData fills new fields with defaults, and `askedAt: null`
        // makes Home invite v1 users to answer the "About you" questions.
        const data = persisted as AppData;
        // Existing users start their "after a few days" feedback clock now.
        if (version < 5 && data?.onboardingComplete && !data.startedAt) {
          return { ...data, startedAt: nowIsoTimestamp() };
        }
        return data;
      },
      // Runs after loading finishes — also when it fails, so the app never
      // gets stuck on the splash screen (it starts with empty data instead).
      // Deferred by a tick: if storage answers synchronously (web server render),
      // this runs before `useAppStore` itself has been created.
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('Could not load saved data', error);
        void Promise.resolve().then(() => useAppStore.setState({ isReady: true }));
      },
    },
  ),
);
