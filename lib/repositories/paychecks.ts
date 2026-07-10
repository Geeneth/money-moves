import { and, asc, eq, gte, lte } from "drizzle-orm";
import { addDays } from "date-fns";
import { getDb } from "@/lib/database/client";
import { paychecks, type PaycheckRow } from "@/lib/database/schema";
import { paydaysBetween } from "@/lib/calculations/pay-periods";
import { fromISODate, toISODate, todayISO } from "@/lib/formatting/dates";
import { newId } from "@/lib/utils";
import { getSettings } from "./settings";
import type { PaycheckInput } from "@/lib/validation/schemas";

/**
 * Make sure schedule-generated paycheck rows exist from ~6 periods back
 * through the next upcoming payday. Manual paychecks are never touched.
 */
export function ensureGeneratedPaychecks(): void {
  const settingsRow = getSettings();
  if (!settingsRow || !settingsRow.knownPayday) return;
  const db = getDb();
  const today = todayISO();
  const from = toISODate(addDays(fromISODate(today), -settingsRow.payFrequencyDays * 6));
  const to = toISODate(addDays(fromISODate(today), settingsRow.payFrequencyDays * 2));
  const dates = paydaysBetween(from, to, settingsRow.knownPayday, settingsRow.payFrequencyDays);
  const existing = new Set(
    db
      .select({ expectedDate: paychecks.expectedDate })
      .from(paychecks)
      .where(eq(paychecks.isManual, false))
      .all()
      .map((r) => r.expectedDate)
  );
  for (const date of dates) {
    if (existing.has(date)) continue;
    db.insert(paychecks)
      .values({
        id: newId(),
        expectedDate: date,
        expectedAmount: settingsRow.defaultPayAmount,
        status: "pending",
        isManual: false,
      })
      .run();
  }
}

export function listPaychecks(fromISO?: string, toISO?: string): PaycheckRow[] {
  ensureGeneratedPaychecks();
  const db = getDb();
  const conditions = [];
  if (fromISO) conditions.push(gte(paychecks.expectedDate, fromISO));
  if (toISO) conditions.push(lte(paychecks.expectedDate, toISO));
  const query = db.select().from(paychecks);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  return filtered.orderBy(asc(paychecks.expectedDate)).all();
}

/** Received paychecks whose effective date (actual ?? expected) falls inside [fromISO, toISO]. */
export function receivedPaychecksInRange(fromISO: string, toISO: string): PaycheckRow[] {
  ensureGeneratedPaychecks();
  const db = getDb();
  return db
    .select()
    .from(paychecks)
    .where(eq(paychecks.status, "received"))
    .all()
    .filter((p) => {
      const effective = p.actualDate ?? p.expectedDate;
      return effective >= fromISO && effective <= toISO;
    });
}

export function getPaycheck(id: string): PaycheckRow | null {
  return getDb().select().from(paychecks).where(eq(paychecks.id, id)).get() ?? null;
}

export function createPaycheck(input: PaycheckInput, isManual = true): PaycheckRow {
  const db = getDb();
  const id = newId();
  db.insert(paychecks)
    .values({
      id,
      expectedDate: input.expectedDate,
      actualDate: input.actualDate ?? null,
      expectedAmount: input.expectedAmount,
      actualAmount: input.actualAmount ?? null,
      status: input.status,
      isManual,
      notes: input.notes ?? null,
    })
    .run();
  const row = getPaycheck(id);
  if (!row) throw new Error("Failed to create paycheck");
  return row;
}

export function updatePaycheck(id: string, input: Partial<PaycheckInput>): PaycheckRow {
  const db = getDb();
  db.update(paychecks)
    .set({
      ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
      ...(input.actualDate !== undefined ? { actualDate: input.actualDate } : {}),
      ...(input.expectedAmount !== undefined ? { expectedAmount: input.expectedAmount } : {}),
      ...(input.actualAmount !== undefined ? { actualAmount: input.actualAmount } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(paychecks.id, id))
    .run();
  const row = getPaycheck(id);
  if (!row) throw new Error("Paycheck not found");
  return row;
}

export function deletePaycheck(id: string): void {
  getDb().delete(paychecks).where(eq(paychecks.id, id)).run();
}
