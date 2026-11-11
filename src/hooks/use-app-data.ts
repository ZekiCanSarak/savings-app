import { useShallow } from 'zustand/react/shallow';

import { useAppStore } from '@/storage/app-store';
import type { SavingsGoal } from '@/types/models';
import {
  amountRemaining,
  contributionsForGoal,
  monthlyAmountNeeded,
  percentComplete,
  totalSaved,
} from '@/utils/goals';

/**
 * Hooks screens use to read and change app data.
 *
 * Each hook subscribes to only the part of the store it needs, so a screen
 * re-renders only when that part changes.
 */

export function useIsDataReady() {
  return useAppStore((s) => s.isReady);
}

export function useProfile() {
  return useAppStore((s) => s.profile);
}

export function useCurrency() {
  return useAppStore((s) => s.profile.currency);
}

export function useGoals() {
  return useAppStore((s) => s.goals);
}

export function useGoal(id: string): SavingsGoal | undefined {
  return useAppStore((s) => s.goals.find((g) => g.id === id));
}

export function useContributions() {
  return useAppStore((s) => s.contributions);
}

/** Contributions for one goal, newest first. */
export function useGoalContributions(goalId: string) {
  const contributions = useContributions();
  return contributionsForGoal(goalId, contributions);
}

/** Progress numbers for one goal, or undefined if the goal doesn't exist. */
export function useGoalProgress(goalId: string) {
  const goal = useGoal(goalId);
  const contributions = useContributions();
  if (!goal) return undefined;
  return {
    saved: totalSaved(goal.id, contributions),
    remaining: amountRemaining(goal, contributions),
    percent: percentComplete(goal, contributions),
    /** null when the goal has no target date. */
    monthlyNeeded: monthlyAmountNeeded(goal, contributions),
  };
}

/** All the functions that change data. */
export function useAppActions() {
  return useAppStore(
    useShallow((s) => ({
      updateProfile: s.updateProfile,
      addGoal: s.addGoal,
      updateGoal: s.updateGoal,
      deleteGoal: s.deleteGoal,
      addContribution: s.addContribution,
      updateContribution: s.updateContribution,
      deleteContribution: s.deleteContribution,
      resetAllData: s.resetAllData,
    })),
  );
}
