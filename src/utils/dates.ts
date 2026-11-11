import type { IsoDate, IsoTimestamp } from '@/types/models';

/** Converts a local Date to 'YYYY-MM-DD' (no time-zone shifting). */
export function toIsoDate(date: Date): IsoDate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's date as 'YYYY-MM-DD' in the phone's time zone. */
export function todayIsoDate(): IsoDate {
  return toIsoDate(new Date());
}

export function nowIsoTimestamp(): IsoTimestamp {
  return new Date().toISOString();
}

/**
 * Parses 'YYYY-MM-DD' as a local date. (new Date('2027-03-31') would read it as
 * UTC midnight, which can show up as the previous day in some time zones.)
 */
export function parseIsoDate(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * How many calendar months you can still save in, counting both this month and
 * the target month. Today 11 Nov 2026, target 31 Mar 2027 → 5 (Nov–Mar).
 * Returns 0 if the target date has already passed.
 */
export function savingMonthsLeft(targetDate: IsoDate, today: IsoDate = todayIsoDate()): number {
  if (targetDate < today) return 0;
  const target = parseIsoDate(targetDate);
  const now = parseIsoDate(today);
  return (
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()) + 1
  );
}

/** Formats for display, e.g. '11 Nov 2026'. */
export function formatDate(date: IsoDate): string {
  return parseIsoDate(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Formats as month and year, e.g. 'March 2027'. */
export function formatMonthYear(date: IsoDate): string {
  return parseIsoDate(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

/** A calendar month. `month` is 0–11 (January = 0), like JavaScript's Date. */
export type YearMonth = { year: number; month: number };

export function yearMonthOf(date: IsoDate): YearMonth {
  const d = parseIsoDate(date);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function addMonths({ year, month }: YearMonth, count: number): YearMonth {
  const d = new Date(year, month + count, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** Negative if a is earlier, 0 if the same month, positive if a is later. */
export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** The last day of the month, e.g. { 2027, 2 } → '2027-03-31'. */
export function endOfMonthIsoDate({ year, month }: YearMonth): IsoDate {
  return toIsoDate(new Date(year, month + 1, 0));
}

/** Moves a date by whole days: addDays('2026-11-11', -1) → '2026-11-10'. */
export function addDays(date: IsoDate, count: number): IsoDate {
  const d = parseIsoDate(date);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + count));
}

/** 'Today', 'Yesterday', or a date like '11 Nov 2026'. */
export function formatRelativeDay(date: IsoDate, today: IsoDate = todayIsoDate()): string {
  if (date === today) return 'Today';
  if (date === addDays(today, -1)) return 'Yesterday';
  return formatDate(date);
}
