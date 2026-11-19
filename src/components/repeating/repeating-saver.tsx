import { useRepeatingSavings } from '@/hooks/use-repeating-savings';

/** Invisible: logs repeating savings when they fall due. */
export function RepeatingSaver() {
  useRepeatingSavings();
  return null;
}
