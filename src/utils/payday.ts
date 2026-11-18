import type { AboutYou, IsoDate } from '@/types/models';
import { addDays, parseIsoDate, toIsoDate, todayIsoDate } from '@/utils/dates';

/**
 * Home's payday check-in ("It's payday! Put something aside?").
 * Pure functions, based on the "About you" pay answers.
 */

/** How many days after payday the check-in stays on Home if not answered. */
export const CHECK_IN_DAYS = 3;

/**
 * The most recent payday on or before `today`, or null if we don't know when
 * the user is paid. Monthly paydays past the end of a short month fall on its
 * last day (the 31st → 30 April).
 */
export function lastPayday(about: AboutYou, today: IsoDate = todayIsoDate()): IsoDate | null {
  if (about.payFrequency === 'monthly' && about.payday !== null) {
    const now = parseIsoDate(today);
    const inMonth = (year: number, month: number) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return toIsoDate(new Date(year, month, Math.min(about.payday as number, lastDay)));
    };
    const thisMonth = inMonth(now.getFullYear(), now.getMonth());
    return thisMonth <= today ? thisMonth : inMonth(now.getFullYear(), now.getMonth() - 1);
  }
  if (
    (about.payFrequency === 'weekly' || about.payFrequency === 'four-weekly') &&
    about.payWeekday !== null
  ) {
    // getDay(): 0 = Sunday; payWeekday: 1 = Sunday.
    const back = (parseIsoDate(today).getDay() - (about.payWeekday - 1) + 7) % 7;
    return addDays(today, -back);
  }
  return null;
}

/**
 * The payday to check in about, or null when there's nothing to show: no
 * known payday, it was more than a few days ago, or the user already answered.
 *
 * For 4-weekly pay we only know the weekday, so after an answer the next
 * check-in waits for the same weekday at least 3 weeks later (i.e. 4 weeks).
 */
export function paydayToCheckIn(
  about: AboutYou,
  answeredFor: IsoDate | null,
  today: IsoDate = todayIsoDate(),
): IsoDate | null {
  const payday = lastPayday(about, today);
  if (!payday || payday < addDays(today, -(CHECK_IN_DAYS - 1))) return null;
  if (answeredFor === payday) return null;
  if (about.payFrequency === 'four-weekly' && answeredFor && answeredFor > addDays(payday, -21)) {
    return null;
  }
  return payday;
}
