import { format, parseISO, isValid } from "date-fns";

export const ISO_DATE = "yyyy-MM-dd";

/** Today's date as an ISO date string (local time). */
export function todayISO(): string {
  return format(new Date(), ISO_DATE);
}

export function toISODate(date: Date): string {
  return format(date, ISO_DATE);
}

export function fromISODate(iso: string): Date {
  return parseISO(iso);
}

export function isValidISODate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && isValid(parseISO(iso));
}

/** "Jan 5, 2026" */
export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

/** "Jan 5" */
export function formatDateShort(iso: string): string {
  return format(parseISO(iso), "MMM d");
}

/** "Monday, January 5" */
export function formatDateLong(iso: string): string {
  return format(parseISO(iso), "EEEE, MMMM d");
}
