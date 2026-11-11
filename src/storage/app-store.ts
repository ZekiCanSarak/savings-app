import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_CURRENCY } from '@/constants/currencies';
import type { AppData, Contribution, SavingsGoal, UserProfile } from '@/types/models';
import { nowIsoTimestamp } from '@/utils/dates';
import { createId } from '@/utils/id';

/**
 * The app's single data store. Screens read and change data only through
 * this store (via the hooks in src/hooks/use-app-data.ts), never through
 * AsyncStorage directly.
 *
 * `persist` saves AppData to AsyncStorage on every change and loads it back
 * when the app starts.
 */

/** Bump this when AppData's shape changes, and handle the old shape in `migrate`. */
const STORAGE_VERSION = 1;
const STORAGE_KEY = 'savings-app-data';

export type NewGoal = Omit<SavingsGoal, 'id' | 'createdAt'>;
export type NewContribution = Omit<Contribution, 'id'>;

type AppActions = {
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

  /** Wipes everything back to a fresh install. */
  resetAllData: () => void;
};

type AppState = AppData &
  AppActions & {
    /** True once saved data has been loaded (or loading failed). Not saved. */
    isReady: boolean;
  };

const initialData: AppData = {
  profile: { name: '', currency: DEFAULT_CURRENCY, monthlyIncome: null },
  goals: [],
  contributions: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialData,
      isReady: false,

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

      resetAllData: () => set(initialData),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => AsyncStorage),
      // Only save the data itself — not actions or isReady.
      partialize: (s): AppData => ({
        profile: s.profile,
        goals: s.goals,
        contributions: s.contributions,
      }),
      // Fill in any fields missing from older saves with defaults.
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<AppData>;
        return {
          ...current,
          ...saved,
          profile: { ...current.profile, ...saved.profile },
        };
      },
      migrate: (persisted) => {
        // No older versions yet. When STORAGE_VERSION goes up, convert old data here.
        return persisted as AppData;
      },
      // Runs after loading finishes — also when it fails, so the app never
      // gets stuck on the splash screen (it starts with empty data instead).
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('Could not load saved data', error);
        useAppStore.setState({ isReady: true });
      },
    },
  ),
);
