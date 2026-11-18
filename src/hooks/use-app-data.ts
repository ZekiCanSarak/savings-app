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

export function useIsOnboarded() {
  return useAppStore((s) => s.onboardingComplete);
}

export function useProfile() {
  return useAppStore((s) => s.profile);
}

export function useCurrency() {
  return useAppStore((s) => s.profile.currency);
}

export function useReminderSettings() {
  return useAppStore((s) => s.reminders);
}

export function useAbout() {
  return useAppStore((s) => s.about);
}

export function useAppearance() {
  return useAppStore((s) => s.appearance);
}

export function useAppLock() {
  return useAppStore((s) => s.appLock);
}

export function usePaydayCheckIn() {
  return useAppStore((s) => s.paydayCheckIn);
}

export function useYearReviewDismissed() {
  return useAppStore((s) => s.yearReviewDismissed);
}

export function useReminderPromptDismissed() {
  return useAppStore((s) => s.reminderPromptDismissed);
}

export function useIsDemo() {
  return useAppStore((s) => s.demo);
}

export function useIntroSeen() {
  return useAppStore((s) => s.introSeen);
}

export function useFeedbackPrompt() {
  return useAppStore(
    useShallow((s) => ({ startedAt: s.startedAt, dismissed: s.feedbackPromptDismissed })),
  );
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
      completeOnboarding: s.completeOnboarding,
      updateProfile: s.updateProfile,
      addGoal: s.addGoal,
      updateGoal: s.updateGoal,
      deleteGoal: s.deleteGoal,
      addContribution: s.addContribution,
      addContributions: s.addContributions,
      updateContribution: s.updateContribution,
      deleteContribution: s.deleteContribution,
      updateReminders: s.updateReminders,
      updateAbout: s.updateAbout,
      setAppearance: s.setAppearance,
      setAppLock: s.setAppLock,
      markPaydayCheckIn: s.markPaydayCheckIn,
      dismissYearReview: s.dismissYearReview,
      dismissReminderPrompt: s.dismissReminderPrompt,
      importBackup: s.importBackup,
      startDemo: s.startDemo,
      endDemo: s.endDemo,
      markIntroSeen: s.markIntroSeen,
      dismissFeedbackPrompt: s.dismissFeedbackPrompt,
      resetAllData: s.resetAllData,
    })),
  );
}
