import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import {
  billPayments,
  bills,
  categories,
  type BillPaymentRow,
  type BillRow,
} from "@/lib/database/schema";
import { advanceDueDate } from "@/lib/calculations/bills";
import type { BillFrequency } from "@/lib/types";
import { newId } from "@/lib/utils";
import type { BillInput, BillPayInput } from "@/lib/validation/schemas";
import { createTransaction } from "./transactions";

export interface BillWithCategory extends BillRow {
  categoryName: string | null;
}

export function listBills(): BillWithCategory[] {
  const db = getDb();
  return db
    .select({
      id: bills.id,
      name: bills.name,
      amount: bills.amount,
      frequency: bills.frequency,
      dueDay: bills.dueDay,
      nextDueDate: bills.nextDueDate,
      categoryId: bills.categoryId,
      isAutoPay: bills.isAutoPay,
      isActive: bills.isActive,
      notes: bills.notes,
      createdAt: bills.createdAt,
      updatedAt: bills.updatedAt,
      categoryName: categories.name,
    })
    .from(bills)
    .leftJoin(categories, eq(bills.categoryId, categories.id))
    .orderBy(asc(bills.nextDueDate))
    .all();
}

export function getBill(id: string): BillRow | null {
  return getDb().select().from(bills).where(eq(bills.id, id)).get() ?? null;
}

export function createBill(input: BillInput): BillRow {
  const db = getDb();
  const id = newId();
  db.insert(bills)
    .values({
      id,
      name: input.name,
      amount: input.amount,
      frequency: input.frequency,
      dueDay: input.dueDay ?? null,
      nextDueDate: input.nextDueDate,
      categoryId: input.categoryId ?? null,
      isAutoPay: input.isAutoPay,
      isActive: input.isActive,
      notes: input.notes ?? null,
    })
    .run();
  const row = getBill(id);
  if (!row) throw new Error("Failed to create bill");
  return row;
}

export function updateBill(id: string, input: Partial<BillInput>): BillRow {
  const db = getDb();
  db.update(bills)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.amount !== undefined ? { amount: input.amount } : {}),
      ...(input.frequency !== undefined ? { frequency: input.frequency } : {}),
      ...(input.dueDay !== undefined ? { dueDay: input.dueDay ?? null } : {}),
      ...(input.nextDueDate !== undefined ? { nextDueDate: input.nextDueDate } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId ?? null } : {}),
      ...(input.isAutoPay !== undefined ? { isAutoPay: input.isAutoPay } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(bills.id, id))
    .run();
  const row = getBill(id);
  if (!row) throw new Error("Bill not found");
  return row;
}

export function deleteBill(id: string): void {
  getDb().delete(bills).where(eq(bills.id, id)).run();
}

/**
 * Mark a bill as paid: records a BillPayment, optionally creates a matching
 * bill_payment transaction, and advances the bill's next due date. One-time
 * bills are deactivated after payment.
 */
export function payBill(billId: string, input: BillPayInput): BillPaymentRow {
  const db = getDb();
  const bill = getBill(billId);
  if (!bill) throw new Error("Bill not found");

  let transactionId: string | null = null;
  if (input.createTransaction) {
    const txn = createTransaction({
      date: input.paidDate,
      description: bill.name,
      amount: input.amount,
      type: "bill_payment",
      paymentMethod: input.paymentMethod,
      categoryId: bill.categoryId,
      notes: `Bill payment for due date ${bill.nextDueDate}`,
    });
    transactionId = txn.id;
  }

  const id = newId();
  db.insert(billPayments)
    .values({
      id,
      billId,
      transactionId,
      dueDate: bill.nextDueDate,
      paidDate: input.paidDate,
      amount: input.amount,
      status: "paid",
    })
    .run();

  if (bill.frequency === "one_time") {
    db.update(bills)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(eq(bills.id, billId))
      .run();
  } else {
    const next = advanceDueDate(bill.nextDueDate, bill.frequency as BillFrequency, bill.dueDay);
    db.update(bills)
      .set({ nextDueDate: next, updatedAt: new Date().toISOString() })
      .where(eq(bills.id, billId))
      .run();
  }

  const row = db.select().from(billPayments).where(eq(billPayments.id, id)).get();
  if (!row) throw new Error("Failed to record payment");
  return row;
}

export function listBillPayments(billId?: string): BillPaymentRow[] {
  const db = getDb();
  const query = db.select().from(billPayments);
  const filtered = billId ? query.where(eq(billPayments.billId, billId)) : query;
  return filtered.orderBy(desc(billPayments.dueDate)).all();
}

/** Payments made toward due dates inside [fromISO, toISO]. */
export function billPaymentsInRange(fromISO: string, toISO: string): BillPaymentRow[] {
  return listBillPayments().filter((p) => {
    const d = p.paidDate ?? p.dueDate;
    return d >= fromISO && d <= toISO;
  });
}
