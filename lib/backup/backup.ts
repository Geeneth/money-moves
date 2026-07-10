import fs from "node:fs";
import path from "node:path";
import { getBackupsDir, getDb } from "@/lib/database/client";
import {
  billPayments,
  bills,
  categories,
  payPeriods,
  paychecks,
  savingsContributions,
  savingsGoals,
  settings,
  transactions,
} from "@/lib/database/schema";
import type { SavingsMethod } from "@/lib/types";
import type { BackupFile } from "@/lib/validation/schemas";

/** Serialize the whole database into a versioned, portable JSON document. */
export function exportBackup(): BackupFile {
  const db = getDb();
  const s = db.select().from(settings).limit(1).all()[0] ?? null;
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: s
      ? {
          currency: s.currency,
          defaultPayAmount: s.defaultPayAmount,
          knownPayday: s.knownPayday,
          payFrequencyDays: s.payFrequencyDays,
          savingsMethod: s.savingsMethod as SavingsMethod,
          defaultSavingsAmount: s.defaultSavingsAmount,
          weekStartDay: s.weekStartDay,
          theme: s.theme,
        }
      : null,
    categories: db.select().from(categories).all().map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      icon: c.icon,
      isDefault: c.isDefault,
    })),
    payPeriods: db.select().from(payPeriods).all().map((p) => ({
      id: p.id,
      startDate: p.startDate,
      endDate: p.endDate,
    })),
    paychecks: db.select().from(paychecks).all().map((p) => ({
      id: p.id,
      expectedDate: p.expectedDate,
      actualDate: p.actualDate,
      expectedAmount: p.expectedAmount,
      actualAmount: p.actualAmount,
      status: p.status,
      isManual: p.isManual,
      notes: p.notes,
    })),
    transactions: db.select().from(transactions).all().map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      paymentMethod: t.paymentMethod,
      categoryId: t.categoryId,
      payPeriodId: t.payPeriodId,
      notes: t.notes,
    })),
    bills: db.select().from(bills).all().map((b) => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      frequency: b.frequency,
      dueDay: b.dueDay,
      nextDueDate: b.nextDueDate,
      categoryId: b.categoryId,
      isAutoPay: b.isAutoPay,
      isActive: b.isActive,
      notes: b.notes,
    })),
    billPayments: db.select().from(billPayments).all().map((p) => ({
      id: p.id,
      billId: p.billId,
      transactionId: p.transactionId,
      dueDate: p.dueDate,
      paidDate: p.paidDate,
      amount: p.amount,
      status: p.status,
    })),
    savingsGoals: db.select().from(savingsGoals).all().map((g) => ({
      id: g.id,
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      targetDate: g.targetDate,
      contributionType: g.contributionType as "fixed" | "percent",
      contributionAmount: g.contributionAmount,
      priority: g.priority,
      status: g.status,
      notes: g.notes,
    })),
    savingsContributions: db.select().from(savingsContributions).all().map((c) => ({
      id: c.id,
      goalId: c.goalId,
      paycheckId: c.paycheckId,
      date: c.date,
      amount: c.amount,
      notes: c.notes,
    })),
  };
}

/** Write a safety backup JSON into data/backups/ and return its path. */
export function writeSafetyBackup(prefix: string): string {
  const dir = getBackupsDir();
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `${prefix}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(exportBackup(), null, 2), "utf8");
  return file;
}

export function deleteAllData(): void {
  const db = getDb();
  // Order matters for foreign keys: children first.
  db.delete(savingsContributions).run();
  db.delete(billPayments).run();
  db.delete(transactions).run();
  db.delete(savingsGoals).run();
  db.delete(bills).run();
  db.delete(paychecks).run();
  db.delete(payPeriods).run();
  db.delete(categories).run();
  db.delete(settings).run();
}

/**
 * Replace the entire database with the contents of a validated backup file.
 * A safety backup is written first.
 */
export function importBackup(data: BackupFile): { safetyBackupPath: string } {
  const safetyBackupPath = writeSafetyBackup("pre-import");
  const db = getDb();

  deleteAllData();

  if (data.settings) {
    db.insert(settings)
      .values({
        id: 1,
        currency: data.settings.currency,
        defaultPayAmount: data.settings.defaultPayAmount,
        knownPayday: data.settings.knownPayday,
        payFrequencyDays: data.settings.payFrequencyDays,
        savingsMethod: data.settings.savingsMethod,
        defaultSavingsAmount: data.settings.defaultSavingsAmount,
        weekStartDay: data.settings.weekStartDay,
        theme: data.settings.theme,
      })
      .run();
  }
  for (const c of data.categories) {
    db.insert(categories)
      .values({ id: c.id, name: c.name, type: c.type, icon: c.icon, isDefault: c.isDefault })
      .run();
  }
  for (const p of data.payPeriods) {
    db.insert(payPeriods).values({ id: p.id, startDate: p.startDate, endDate: p.endDate }).run();
  }
  for (const p of data.paychecks) {
    db.insert(paychecks)
      .values({
        id: p.id,
        expectedDate: p.expectedDate,
        actualDate: p.actualDate,
        expectedAmount: p.expectedAmount,
        actualAmount: p.actualAmount,
        status: p.status,
        isManual: p.isManual,
        notes: p.notes,
      })
      .run();
  }
  for (const g of data.savingsGoals) {
    db.insert(savingsGoals)
      .values({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        contributionType: g.contributionType,
        contributionAmount: g.contributionAmount,
        priority: g.priority,
        status: g.status,
        notes: g.notes,
      })
      .run();
  }
  for (const b of data.bills) {
    db.insert(bills)
      .values({
        id: b.id,
        name: b.name,
        amount: b.amount,
        frequency: b.frequency,
        dueDay: b.dueDay,
        nextDueDate: b.nextDueDate,
        categoryId: b.categoryId,
        isAutoPay: b.isAutoPay,
        isActive: b.isActive,
        notes: b.notes,
      })
      .run();
  }
  for (const t of data.transactions) {
    db.insert(transactions)
      .values({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        paymentMethod: t.paymentMethod,
        categoryId: t.categoryId,
        payPeriodId: t.payPeriodId,
        notes: t.notes,
      })
      .run();
  }
  for (const p of data.billPayments) {
    db.insert(billPayments)
      .values({
        id: p.id,
        billId: p.billId,
        transactionId: p.transactionId,
        dueDate: p.dueDate,
        paidDate: p.paidDate,
        amount: p.amount,
        status: p.status,
      })
      .run();
  }
  for (const c of data.savingsContributions) {
    db.insert(savingsContributions)
      .values({
        id: c.id,
        goalId: c.goalId,
        paycheckId: c.paycheckId,
        date: c.date,
        amount: c.amount,
        notes: c.notes,
      })
      .run();
  }

  return { safetyBackupPath };
}

/** Summary of a backup file's contents, shown before importing. */
export function summarizeBackup(data: BackupFile): Record<string, number | string> {
  return {
    exportedAt: data.exportedAt,
    transactions: data.transactions.length,
    bills: data.bills.length,
    paychecks: data.paychecks.length,
    savingsGoals: data.savingsGoals.length,
    savingsContributions: data.savingsContributions.length,
    categories: data.categories.length,
    billPayments: data.billPayments.length,
  };
}
