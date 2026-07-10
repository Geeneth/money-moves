import { eq } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { payPeriods, type PayPeriodRow } from "@/lib/database/schema";
import { periodFor } from "@/lib/calculations/pay-periods";
import { newId } from "@/lib/utils";
import { requireSettings } from "./settings";

/**
 * Find or create the pay-period row containing `dateISO`, derived from the
 * configured anchor payday. Returns null when no schedule is configured.
 */
export function ensurePeriodForDate(dateISO: string): PayPeriodRow | null {
  const db = getDb();
  const settingsRow = requireSettings();
  if (!settingsRow.knownPayday) return null;
  const range = periodFor(dateISO, settingsRow.knownPayday, settingsRow.payFrequencyDays);
  const existing = db
    .select()
    .from(payPeriods)
    .where(eq(payPeriods.startDate, range.start))
    .get();
  if (existing) return existing;
  const id = newId();
  db.insert(payPeriods).values({ id, startDate: range.start, endDate: range.end }).run();
  const created = db.select().from(payPeriods).where(eq(payPeriods.id, id)).get();
  return created ?? null;
}

export function listPeriods(): PayPeriodRow[] {
  return getDb().select().from(payPeriods).all();
}
