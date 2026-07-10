import { asc, desc, eq, gte, lte, and } from "drizzle-orm";
import { getDb } from "@/lib/database/client";
import {
  savingsContributions,
  savingsGoals,
  type SavingsContributionRow,
  type SavingsGoalRow,
} from "@/lib/database/schema";
import { newId } from "@/lib/utils";
import type { ContributionInput, SavingsGoalInput } from "@/lib/validation/schemas";
import { createTransaction } from "./transactions";

export function listGoals(): SavingsGoalRow[] {
  return getDb()
    .select()
    .from(savingsGoals)
    .orderBy(asc(savingsGoals.priority), asc(savingsGoals.createdAt))
    .all();
}

export function getGoal(id: string): SavingsGoalRow | null {
  return getDb().select().from(savingsGoals).where(eq(savingsGoals.id, id)).get() ?? null;
}

export function createGoal(input: SavingsGoalInput): SavingsGoalRow {
  const db = getDb();
  const id = newId();
  db.insert(savingsGoals)
    .values({
      id,
      name: input.name,
      targetAmount: input.targetAmount,
      currentAmount: input.currentAmount,
      targetDate: input.targetDate ?? null,
      contributionType: input.contributionType,
      contributionAmount: input.contributionAmount,
      priority: input.priority,
      status: input.status,
      notes: input.notes ?? null,
    })
    .run();
  const row = getGoal(id);
  if (!row) throw new Error("Failed to create goal");
  return row;
}

export function updateGoal(id: string, input: Partial<SavingsGoalInput>): SavingsGoalRow {
  const db = getDb();
  db.update(savingsGoals)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.targetAmount !== undefined ? { targetAmount: input.targetAmount } : {}),
      ...(input.currentAmount !== undefined ? { currentAmount: input.currentAmount } : {}),
      ...(input.targetDate !== undefined ? { targetDate: input.targetDate ?? null } : {}),
      ...(input.contributionType !== undefined ? { contributionType: input.contributionType } : {}),
      ...(input.contributionAmount !== undefined
        ? { contributionAmount: input.contributionAmount }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(savingsGoals.id, id))
    .run();
  const row = getGoal(id);
  if (!row) throw new Error("Goal not found");
  return row;
}

export function deleteGoal(id: string): void {
  getDb().delete(savingsGoals).where(eq(savingsGoals.id, id)).run();
}

/**
 * Record a contribution: inserts the row, bumps the goal's current amount,
 * marks the goal completed when the target is reached, and optionally logs a
 * matching savings transaction.
 */
export function recordContribution(
  input: ContributionInput,
  options: { createTransaction: boolean } = { createTransaction: true }
): SavingsContributionRow {
  const db = getDb();
  const goal = getGoal(input.goalId);
  if (!goal) throw new Error("Savings goal not found");

  if (options.createTransaction) {
    createTransaction({
      date: input.date,
      description: `Savings: ${goal.name}`,
      amount: input.amount,
      type: "savings",
      paymentMethod: "bank_transfer",
      categoryId: null,
      notes: input.notes ?? null,
    });
  }

  const id = newId();
  db.insert(savingsContributions)
    .values({
      id,
      goalId: input.goalId,
      paycheckId: input.paycheckId ?? null,
      date: input.date,
      amount: input.amount,
      notes: input.notes ?? null,
    })
    .run();

  const newAmount = goal.currentAmount + input.amount;
  db.update(savingsGoals)
    .set({
      currentAmount: newAmount,
      status: newAmount >= goal.targetAmount ? "completed" : goal.status,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(savingsGoals.id, input.goalId))
    .run();

  const row = db.select().from(savingsContributions).where(eq(savingsContributions.id, id)).get();
  if (!row) throw new Error("Failed to record contribution");
  return row;
}

export function deleteContribution(id: string): void {
  const db = getDb();
  const row = db.select().from(savingsContributions).where(eq(savingsContributions.id, id)).get();
  if (!row) return;
  db.delete(savingsContributions).where(eq(savingsContributions.id, id)).run();
  const goal = getGoal(row.goalId);
  if (goal) {
    db.update(savingsGoals)
      .set({
        currentAmount: Math.max(0, goal.currentAmount - row.amount),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(savingsGoals.id, row.goalId))
      .run();
  }
}

export function listContributions(limit?: number): SavingsContributionRow[] {
  const query = getDb()
    .select()
    .from(savingsContributions)
    .orderBy(desc(savingsContributions.date), desc(savingsContributions.createdAt));
  return limit ? query.limit(limit).all() : query.all();
}

export function contributionsInRange(fromISO: string, toISO: string): SavingsContributionRow[] {
  return getDb()
    .select()
    .from(savingsContributions)
    .where(and(gte(savingsContributions.date, fromISO), lte(savingsContributions.date, toISO)))
    .orderBy(desc(savingsContributions.date))
    .all();
}

/** True if a contribution linked to this paycheck+goal already exists (guards double-recording). */
export function hasContributionForPaycheck(goalId: string, paycheckId: string): boolean {
  const row = getDb()
    .select()
    .from(savingsContributions)
    .where(
      and(eq(savingsContributions.goalId, goalId), eq(savingsContributions.paycheckId, paycheckId))
    )
    .get();
  return row !== undefined;
}
