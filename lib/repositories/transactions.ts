import { and, desc, eq, gte, inArray, lte, type SQL } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import { categories, transactions, type TransactionRow } from "@/lib/database/schema";
import { newId } from "@/lib/utils";
import type { TransactionInput } from "@/lib/validation/schemas";
import { ensurePeriodForDate } from "./pay-periods";

export interface TransactionFilters {
  from?: string;
  to?: string;
  categoryId?: string;
  type?: string;
  paymentMethod?: string;
  /** Period start date (ISO). */
  periodStart?: string;
  search?: string;
}

export interface TransactionWithCategory extends TransactionRow {
  categoryName: string | null;
}

function buildConditions(filters: TransactionFilters): SQL[] {
  const conditions: SQL[] = [];
  if (filters.from) conditions.push(gte(transactions.date, filters.from));
  if (filters.to) conditions.push(lte(transactions.date, filters.to));
  if (filters.categoryId) conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.paymentMethod) conditions.push(eq(transactions.paymentMethod, filters.paymentMethod));
  return conditions;
}

export function listTransactions(filters: TransactionFilters = {}): TransactionWithCategory[] {
  const db = getDb();
  const conditions = buildConditions(filters);
  const base = db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      paymentMethod: transactions.paymentMethod,
      categoryId: transactions.categoryId,
      payPeriodId: transactions.payPeriodId,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id));

  const withWhere = conditions.length > 0 ? base.where(and(...conditions)) : base;
  let rows = withWhere.orderBy(desc(transactions.date), desc(transactions.createdAt)).all();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.description.toLowerCase().includes(q) ||
        (r.notes ?? "").toLowerCase().includes(q) ||
        (r.categoryName ?? "").toLowerCase().includes(q)
    );
  }
  return rows;
}

/** Transactions whose date falls inside [fromISO, toISO]. */
export function transactionsInRange(fromISO: string, toISO: string): TransactionRow[] {
  const db = getDb();
  return db
    .select()
    .from(transactions)
    .where(and(gte(transactions.date, fromISO), lte(transactions.date, toISO)))
    .orderBy(desc(transactions.date))
    .all();
}

export function getTransaction(id: string): TransactionRow | null {
  return getDb().select().from(transactions).where(eq(transactions.id, id)).get() ?? null;
}

export function createTransaction(input: TransactionInput): TransactionRow {
  const db = getDb();
  const id = newId();
  const period = ensurePeriodForDate(input.date);
  db.insert(transactions)
    .values({
      id,
      date: input.date,
      description: input.description,
      amount: input.amount,
      type: input.type,
      paymentMethod: input.paymentMethod,
      categoryId: input.categoryId ?? null,
      payPeriodId: period?.id ?? null,
      notes: input.notes ?? null,
    })
    .run();
  const row = getTransaction(id);
  if (!row) throw new Error("Failed to create transaction");
  return row;
}

export function updateTransaction(id: string, input: TransactionInput): TransactionRow {
  const db = getDb();
  const period = ensurePeriodForDate(input.date);
  db.update(transactions)
    .set({
      date: input.date,
      description: input.description,
      amount: input.amount,
      type: input.type,
      paymentMethod: input.paymentMethod,
      categoryId: input.categoryId ?? null,
      payPeriodId: period?.id ?? null,
      notes: input.notes ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(transactions.id, id))
    .run();
  const row = getTransaction(id);
  if (!row) throw new Error("Transaction not found");
  return row;
}

export function deleteTransaction(id: string): void {
  getDb().delete(transactions).where(eq(transactions.id, id)).run();
}

export function deleteTransactions(ids: string[]): void {
  if (ids.length === 0) return;
  getDb().delete(transactions).where(inArray(transactions.id, ids)).run();
}

/** Re-assign every transaction to its pay period. Used after the pay schedule changes. */
export function reassignAllTransactionPeriods(): void {
  const db = getDb();
  const all = db.select().from(transactions).all();
  for (const t of all) {
    const period = ensurePeriodForDate(t.date);
    db.update(transactions)
      .set({ payPeriodId: period?.id ?? null })
      .where(eq(transactions.id, t.id))
      .run();
  }
}
