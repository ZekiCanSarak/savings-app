import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAppActions, useGoals } from '@/hooks/use-app-data';

/** While the app stays open (e.g. a browser tab), check again this often so a new day is noticed. */
const CHECK_EVERY_MS = 60 * 60 * 1000;

/**
 * Logs repeating savings that have fallen due: at launch, whenever goals
 * change (so one set up for today goes in straight away), whenever the app
 * comes back to the foreground, and hourly while it's open. Mount it once,
 * after onboarding (see src/app/_layout.tsx).
 */
export function useRepeatingSavings() {
  const { logRepeatingSavings } = useAppActions();
  const goals = useGoals();

  // Safe to repeat: when nothing is due, the store is left unchanged.
  useEffect(() => {
    logRepeatingSavings();
  }, [goals, logRepeatingSavings]);

  useEffect(() => {
    const run = () => logRepeatingSavings();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') run();
    });
    const timer = setInterval(run, CHECK_EVERY_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [logRepeatingSavings]);
}
