import { addDays, addMonths, addQuarters, addWeeks, addYears, setDate, lastDayOfMonth } from "date-fns";
import { FREQUENCY_PER_YEAR, type BillFrequency } from "@/lib/types";
import { fromISODate, toISODate } from "@/lib/formatting/dates";

export interface BillLike {
  amount: number;
  frequency: BillFrequency;
  isActive: boolean;
}

/** Annual cost of a single bill in cents. One-time bills contribute nothing to the recurring total. */
export function annualizeBill(bill: Pick<BillLike, "amount" | "frequency">): number {
  if (bill.frequency === "one_time") return 0;
  return bill.amount * FREQUENCY_PER_YEAR[bill.frequency];
}

/** Total annual recurring cost of all active bills, in cents. */
export function annualBillTotal(bills: BillLike[]): number {
  return bills.filter((b) => b.isActive).reduce((sum, b) => sum + annualizeBill(b), 0);
}

/**
 * Recommended amount to reserve from each biweekly paycheck:
 * annual recurring total / 26 (NOT monthly total / 2 — there are 26 paychecks a year).
 */
export function billAllocationPerPaycheck(bills: BillLike[]): number {
  return Math.round(annualBillTotal(bills) / 26);
}

/** Approximate monthly bill cost, in cents. */
export function monthlyBillEstimate(bills: BillLike[]): number {
  return Math.round(annualBillTotal(bills) / 12);
}

/**
 * Advance a bill's next due date by one occurrence after it is paid.
 * Monthly-style frequencies preserve the due day where the month allows;
 * a due day of 31 clamps to the last day of shorter months.
 */
export function advanceDueDate(currentDueISO: string, frequency: BillFrequency, dueDay?: number | null): string {
  const current = fromISODate(currentDueISO);
  switch (frequency) {
    case "weekly":
      return toISODate(addWeeks(current, 1));
    case "biweekly":
      return toISODate(addDays(current, 14));
    case "monthly":
      return toISODate(clampToDueDay(addMonths(current, 1), dueDay));
    case "quarterly":
      return toISODate(clampToDueDay(addQuarters(current, 1), dueDay));
    case "semiannual":
      return toISODate(clampToDueDay(addMonths(current, 6), dueDay));
    case "yearly":
      return toISODate(addYears(current, 1));
    case "one_time":
      return currentDueISO;
  }
}

function clampToDueDay(date: Date, dueDay?: number | null): Date {
  if (!dueDay || dueDay < 1 || dueDay > 31) return date;
  const last = lastDayOfMonth(date).getDate();
  return setDate(date, Math.min(dueDay, last));
}
