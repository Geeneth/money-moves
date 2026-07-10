import { addDays, differenceInCalendarDays } from "date-fns";
import { fromISODate, toISODate } from "@/lib/formatting/dates";

export interface PayPeriodRange {
  /** Payday that opens the period (ISO date). */
  start: string;
  /** Day before the following payday (ISO date). */
  end: string;
  /** The following payday (ISO date). */
  nextPayday: string;
}

/**
 * Given an anchor payday and a frequency (default 14 days), every payday is
 * anchor + k * frequency for some integer k (k may be negative).
 * The pay period containing `date` starts on the greatest payday <= date.
 */
export function periodStartFor(dateISO: string, anchorISO: string, frequencyDays = 14): string {
  const date = fromISODate(dateISO);
  const anchor = fromISODate(anchorISO);
  const diff = differenceInCalendarDays(date, anchor);
  const k = Math.floor(diff / frequencyDays);
  return toISODate(addDays(anchor, k * frequencyDays));
}

export function periodFor(dateISO: string, anchorISO: string, frequencyDays = 14): PayPeriodRange {
  const start = periodStartFor(dateISO, anchorISO, frequencyDays);
  const startDate = fromISODate(start);
  return {
    start,
    end: toISODate(addDays(startDate, frequencyDays - 1)),
    nextPayday: toISODate(addDays(startDate, frequencyDays)),
  };
}

/** Payday immediately before the period containing `date` (i.e. the previous payday relative to the current one). */
export function previousPayday(dateISO: string, anchorISO: string, frequencyDays = 14): string {
  const start = periodStartFor(dateISO, anchorISO, frequencyDays);
  return toISODate(addDays(fromISODate(start), -frequencyDays));
}

/** Number of whole days from `today` until the next payday (0 when payday is today — meaning a fresh period just began). */
export function daysUntilNextPayday(todayISO: string, anchorISO: string, frequencyDays = 14): number {
  const { nextPayday } = periodFor(todayISO, anchorISO, frequencyDays);
  return differenceInCalendarDays(fromISODate(nextPayday), fromISODate(todayISO));
}

/** Days remaining in the current period, counting today. Always >= 1 while inside the period. */
export function daysRemainingInPeriod(todayISO: string, anchorISO: string, frequencyDays = 14): number {
  return daysUntilNextPayday(todayISO, anchorISO, frequencyDays);
}

/** Days elapsed in the current period, counting today. 1 on payday itself. */
export function daysElapsedInPeriod(todayISO: string, anchorISO: string, frequencyDays = 14): number {
  const start = periodStartFor(todayISO, anchorISO, frequencyDays);
  return differenceInCalendarDays(fromISODate(todayISO), fromISODate(start)) + 1;
}

/**
 * Generate payday dates between fromISO and toISO (inclusive) based on the anchor.
 */
export function paydaysBetween(
  fromISO: string,
  toISO: string,
  anchorISO: string,
  frequencyDays = 14
): string[] {
  const result: string[] = [];
  let cursor = periodStartFor(fromISO, anchorISO, frequencyDays);
  // periodStartFor gives the payday <= fromISO; advance if strictly before the range.
  if (cursor < fromISO) {
    cursor = toISODate(addDays(fromISODate(cursor), frequencyDays));
  }
  while (cursor <= toISO) {
    result.push(cursor);
    cursor = toISODate(addDays(fromISODate(cursor), frequencyDays));
  }
  return result;
}

/** List the previous `count` period ranges ending with the current one (most recent last). */
export function recentPeriods(
  todayISO: string,
  anchorISO: string,
  count: number,
  frequencyDays = 14
): PayPeriodRange[] {
  const current = periodFor(todayISO, anchorISO, frequencyDays);
  const periods: PayPeriodRange[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = toISODate(addDays(fromISODate(current.start), -i * frequencyDays));
    const startDate = fromISODate(start);
    periods.push({
      start,
      end: toISODate(addDays(startDate, frequencyDays - 1)),
      nextPayday: toISODate(addDays(startDate, frequencyDays)),
    });
  }
  return periods;
}
