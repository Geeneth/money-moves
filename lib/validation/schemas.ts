import { z } from "zod";
import {
  BILL_FREQUENCIES,
  CATEGORY_TYPES,
  CONTRIBUTION_TYPES,
  GOAL_STATUSES,
  PAYCHECK_STATUSES,
  PAYMENT_METHODS,
  SAVINGS_METHODS,
  THEMES,
  TRANSACTION_TYPES,
} from "@/lib/types";

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a valid date (YYYY-MM-DD)");

export const cents = z.number().int("Amounts must be whole cents");
export const positiveCents = cents.positive("Amount must be greater than zero");
export const nonNegativeCents = cents.min(0);

export const transactionInput = z.object({
  date: isoDate,
  description: z.string().trim().min(1, "Description is required").max(200),
  amount: positiveCents,
  type: z.enum(TRANSACTION_TYPES),
  paymentMethod: z.enum(PAYMENT_METHODS),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type TransactionInput = z.infer<typeof transactionInput>;

export const transactionParseInput = z.object({
  text: z.string().trim().min(3, "Dictation text is required").max(2000),
  date: isoDate.default(() => new Date().toISOString().slice(0, 10)),
  paymentMethod: z.enum(PAYMENT_METHODS).default("debit"),
});
export type TransactionParseInput = z.infer<typeof transactionParseInput>;

export const billInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  amount: positiveCents,
  frequency: z.enum(BILL_FREQUENCIES),
  dueDay: z.number().int().min(1).max(31).nullable().optional(),
  nextDueDate: isoDate,
  categoryId: z.string().nullable().optional(),
  isAutoPay: z.boolean(),
  isActive: z.boolean(),
  notes: z.string().max(1000).nullable().optional(),
});
export type BillInput = z.infer<typeof billInput>;

export const billPayInput = z.object({
  paidDate: isoDate,
  amount: positiveCents,
  createTransaction: z.boolean().default(true),
  paymentMethod: z.enum(PAYMENT_METHODS).default("bank_transfer"),
});
export type BillPayInput = z.infer<typeof billPayInput>;

export const paycheckInput = z.object({
  expectedDate: isoDate,
  expectedAmount: positiveCents,
  actualDate: isoDate.nullable().optional(),
  actualAmount: positiveCents.nullable().optional(),
  status: z.enum(PAYCHECK_STATUSES),
  notes: z.string().max(1000).nullable().optional(),
});
export type PaycheckInput = z.infer<typeof paycheckInput>;

export const savingsGoalInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  targetAmount: positiveCents,
  currentAmount: nonNegativeCents.default(0),
  targetDate: isoDate.nullable().optional(),
  contributionType: z.enum(CONTRIBUTION_TYPES),
  contributionAmount: nonNegativeCents,
  priority: z.number().int().min(1).max(10).default(1),
  status: z.enum(GOAL_STATUSES),
  notes: z.string().max(1000).nullable().optional(),
});
export type SavingsGoalInput = z.infer<typeof savingsGoalInput>;

export const contributionInput = z.object({
  goalId: z.string().min(1),
  date: isoDate,
  amount: positiveCents,
  paycheckId: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});
export type ContributionInput = z.infer<typeof contributionInput>;

export const categoryInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  type: z.enum(CATEGORY_TYPES),
  icon: z.string().max(60).nullable().optional(),
});
export type CategoryInput = z.infer<typeof categoryInput>;

export const settingsInput = z.object({
  currency: z.string().trim().min(3).max(3),
  defaultPayAmount: nonNegativeCents,
  knownPayday: isoDate,
  payFrequencyDays: z.number().int().min(7).max(31),
  savingsMethod: z.enum(SAVINGS_METHODS),
  defaultSavingsAmount: nonNegativeCents,
  weekStartDay: z.number().int().min(0).max(1),
  theme: z.enum(THEMES),
});
export type SettingsInput = z.infer<typeof settingsInput>;

export const setupInput = z.object({
  currency: z.string().trim().min(3).max(3),
  knownPayday: isoDate,
  defaultPayAmount: positiveCents,
  savingsMethod: z.enum(SAVINGS_METHODS),
  defaultSavingsAmount: nonNegativeCents,
  bills: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        amount: positiveCents,
        frequency: z.enum(BILL_FREQUENCIES),
        nextDueDate: isoDate,
      })
    )
    .default([]),
  useSampleData: z.boolean(),
});
export type SetupInput = z.infer<typeof setupInput>;

/** Versioned full-app backup file. */
export const backupFile = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  settings: z
    .object({
      currency: z.string(),
      defaultPayAmount: z.number().int(),
      knownPayday: isoDate,
      payFrequencyDays: z.number().int(),
      savingsMethod: z.enum(SAVINGS_METHODS),
      defaultSavingsAmount: z.number().int(),
      weekStartDay: z.number().int(),
      theme: z.string(),
    })
    .nullable(),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      icon: z.string().nullable(),
      isDefault: z.boolean(),
    })
  ),
  payPeriods: z.array(
    z.object({ id: z.string(), startDate: isoDate, endDate: isoDate })
  ),
  paychecks: z.array(
    z.object({
      id: z.string(),
      expectedDate: isoDate,
      actualDate: isoDate.nullable(),
      expectedAmount: z.number().int(),
      actualAmount: z.number().int().nullable(),
      status: z.string(),
      isManual: z.boolean(),
      notes: z.string().nullable(),
    })
  ),
  transactions: z.array(
    z.object({
      id: z.string(),
      date: isoDate,
      description: z.string(),
      amount: z.number().int(),
      type: z.string(),
      paymentMethod: z.string(),
      categoryId: z.string().nullable(),
      payPeriodId: z.string().nullable(),
      notes: z.string().nullable(),
    })
  ),
  bills: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      amount: z.number().int(),
      frequency: z.string(),
      dueDay: z.number().int().nullable(),
      nextDueDate: isoDate,
      categoryId: z.string().nullable(),
      isAutoPay: z.boolean(),
      isActive: z.boolean(),
      notes: z.string().nullable(),
    })
  ),
  billPayments: z.array(
    z.object({
      id: z.string(),
      billId: z.string(),
      transactionId: z.string().nullable(),
      dueDate: isoDate,
      paidDate: isoDate.nullable(),
      amount: z.number().int(),
      status: z.string(),
    })
  ),
  savingsGoals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      targetAmount: z.number().int(),
      currentAmount: z.number().int(),
      targetDate: isoDate.nullable(),
      contributionType: z.enum(CONTRIBUTION_TYPES),
      contributionAmount: z.number().int(),
      priority: z.number().int(),
      status: z.string(),
      notes: z.string().nullable(),
    })
  ),
  savingsContributions: z.array(
    z.object({
      id: z.string(),
      goalId: z.string(),
      paycheckId: z.string().nullable(),
      date: isoDate,
      amount: z.number().int(),
      notes: z.string().nullable(),
    })
  ),
});
export type BackupFile = z.infer<typeof backupFile>;
