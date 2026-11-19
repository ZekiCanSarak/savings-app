import type { AboutYou, IsoDate, PaySchedule, WeekOfMonth } from '@/types/models';
import { addDays, parseIsoDate, toIsoDate, todayIsoDate } from '@/utils/dates';
import { ordinal, weekdayName } from '@/utils/reminders';

/**
 * Home's payday check-in ("It's payday! Put something aside?").
 * Pure functions, based on the "About you" pay answers.
 */

/** How many days after payday the check-in stays on Home if not answered. */
export const CHECK_IN_DAYS = 3;

const WEEK_NAMES: Record<WeekOfMonth, string> = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', [-1]: 'last' };

/** A day of a month, moved back to the month's last day if it's too short (31 → 30 April). */
export function dayInMonth(year: number, month: number, day: number): IsoDate {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return toIsoDate(new Date(year, month, Math.min(day, lastDay)));
}

/**
 * The nth weekday of a month, e.g. the last Friday. `month` is 0–11,
 * `weekday` 1 = Sunday … 7 = Saturday, `week` -1 = the last one.
 */
export function nthWeekdayOfMonth(year: number, month: number, week: WeekOfMonth, weekday: number): IsoDate {
  const target = weekday - 1; // getDay(): 0 = Sunday
  if (week === -1) {
    const last = new Date(year, month + 1, 0);
    last.setDate(last.getDate() - ((last.getDay() - target + 7) % 7));
    return toIsoDate(last);
  }
  const first = new Date(year, month, 1);
  first.setDate(1 + ((target - first.getDay() + 7) % 7) + (week - 1) * 7);
  return toIsoDate(first);
}

/** Every payday a schedule gives in one month (`month` 0–11), earliest first. */
export function paydaysInMonth(schedule: PaySchedule, year: number, month: number): IsoDate[] {
  if (schedule.kind === 'pattern') return [nthWeekdayOfMonth(year, month, schedule.week, schedule.weekday)];
  return [...new Set(schedule.days.map((day) => dayInMonth(year, month, day)))].sort();
}

/** 'the 1st and 15th', 'the last Friday'. For sentences like "Paid on …". */
export function describePaySchedule(schedule: PaySchedule): string {
  if (schedule.kind === 'pattern') {
    return `the ${WEEK_NAMES[schedule.week]} ${weekdayName(schedule.weekday)}`;
  }
  const days = schedule.days.map(ordinal);
  const list = days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days.at(-1)}` : days[0];
  return `the ${list}`;
}

/** How many paydays a month a schedule has (for splitting a monthly suggestion). */
export function paydaysPerMonth(schedule: PaySchedule | null): number {
  return schedule?.kind === 'dates' ? schedule.days.length : 1;
}

/**
 * The most recent payday on or before `today`, or null if we don't know when
 * the user is paid. Monthly paydays past the end of a short month fall on its
 * last day (the 31st → 30 April).
 */
export function lastPayday(about: AboutYou, today: IsoDate = todayIsoDate()): IsoDate | null {
  const now = parseIsoDate(today);
  if (about.payFrequency === 'monthly' && about.payday !== null) {
    const thisMonth = dayInMonth(now.getFullYear(), now.getMonth(), about.payday);
    return thisMonth <= today ? thisMonth : dayInMonth(now.getFullYear(), now.getMonth() - 1, about.payday);
  }
  if (about.payFrequency === 'irregular' && about.paySchedule) {
    // The latest payday this month that has happened, else last month's last one.
    const schedule = about.paySchedule;
    const thisMonth = paydaysInMonth(schedule, now.getFullYear(), now.getMonth()).filter((d) => d <= today);
    if (thisMonth.length > 0) return thisMonth[thisMonth.length - 1];
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return paydaysInMonth(schedule, prev.getFullYear(), prev.getMonth()).at(-1) ?? null;
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
