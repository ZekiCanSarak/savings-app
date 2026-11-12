import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import { DEFAULT_CURRENCY } from '@/constants/currencies';
import type {
  AppData,
  Contribution,
  ReminderSettings,
  SavingsGoal,
  UserProfile,
} from '@/types/models';
import { nowIsoTimestamp } from '@/utils/dates';
import type { BackupData } from '@/utils/backup';
import { createId } from '@/utils/id';

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

/** Bump this when AppData's shape changes, and handle the old shape in `migrate`. */
const STORAGE_VERSION = 1;
const STORAGE_KEY = 'savings-app-data';

export type NewGoal = Omit<SavingsGoal, 'id' | 'createdAt'>;
export type NewContribution = Omit<Contribution, 'id'>;

type AppActions = {
  /** Saves the profile from the welcome flow and marks it as done. */
  completeOnboarding: (profile: UserProfile) => void;
  updateProfile: (changes: Partial<UserProfile>) => void;

  /** Returns the new goal's id. */
  addGoal: (goal: NewGoal) => string;
  updateGoal: (id: string, changes: Partial<NewGoal>) => void;
  /** Also deletes the goal's contributions. */
  deleteGoal: (id: string) => void;

  /** Returns the new contribution's id. */
  addContribution: (contribution: NewContribution) => string;
  updateContribution: (id: string, changes: Partial<NewContribution>) => void;
  deleteContribution: (id: string) => void;

  updateReminders: (changes: Partial<ReminderSettings>) => void;
  dismissReminderPrompt: () => void;

  /**
   * Replaces the profile, goals and savings with a backup's (already checked
   * with parseBackup). Reminder settings stay as they are on this device.
   */
  importBackup: (backup: BackupData) => void;

  /** Wipes everything back to a fresh install. */
  resetAllData: () => void;
};

type AppState = AppData &
  AppActions & {
    /** True once saved data has been loaded (or loading failed). Not saved. */
    isReady: boolean;
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
  reminderPromptDismissed: false,
  goals: [],
  contributions: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialData,
      isReady: false,

      completeOnboarding: (profile) => set({ profile, onboardingComplete: true }),
      updateProfile: (changes) => set((s) => ({ profile: { ...s.profile, ...changes } })),

      addGoal: (goal) => {
        const id = createId();
        set((s) => ({ goals: [...s.goals, { ...goal, id, createdAt: nowIsoTimestamp() }] }));
        return id;
      },
      updateGoal: (id, changes) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...changes } : g)) })),
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
      updateContribution: (id, changes) =>
        set((s) => ({
          contributions: s.contributions.map((c) => (c.id === id ? { ...c, ...changes } : c)),
        })),
      deleteContribution: (id) =>
        set((s) => ({ contributions: s.contributions.filter((c) => c.id !== id) })),

      updateReminders: (changes) => set((s) => ({ reminders: { ...s.reminders, ...changes } })),
      dismissReminderPrompt: () => set({ reminderPromptDismissed: true }),

      importBackup: ({ profile, goals, contributions }) =>
        set({ profile, goals, contributions, onboardingComplete: true }),

      resetAllData: () => set(initialData),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => (isServerRender ? noopStorage : AsyncStorage)),
      // Only save the data itself — not actions or isReady.
      partialize: (s): AppData => ({
        onboardingComplete: s.onboardingComplete,
        profile: s.profile,
        reminders: s.reminders,
        reminderPromptDismissed: s.reminderPromptDismissed,
        goals: s.goals,
        contributions: s.contributions,
      }),
      // Fill in fields missing from older saves with defaults, and repair anything
      // invalid (see sanitize.ts), so a bad save can't crash the app.
      merge: (persisted, current) => ({
        ...current,
        ...sanitizeAppData(persisted, initialData),
      }),
      migrate: (persisted) => {
        // No older versions yet. When STORAGE_VERSION goes up, convert old data here.
        return persisted as AppData;
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
