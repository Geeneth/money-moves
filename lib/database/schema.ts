import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
};

/** Singleton row (id = 1). Absence of the row means onboarding has not run. */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  currency: text("currency").notNull().default("CAD"),
  /** Default expected paycheck amount, in integer cents. */
  defaultPayAmount: integer("default_pay_amount").notNull().default(0),
  /** Anchor payday, ISO date (yyyy-MM-dd). */
  knownPayday: text("known_payday").notNull(),
  payFrequencyDays: integer("pay_frequency_days").notNull().default(14),
  /** "fixed" | "percent" */
  savingsMethod: text("savings_method").notNull().default("fixed"),
  /** Cents when fixed; basis points (10000 = 100%) when percent. */
  defaultSavingsAmount: integer("default_savings_amount").notNull().default(0),
  /** 0 = Sunday, 1 = Monday */
  weekStartDay: integer("week_start_day").notNull().default(0),
  theme: text("theme").notNull().default("light"),
  /** bcrypt hash of the app lock password. Null means no lock is set. */
  passwordHash: text("password_hash"),
  ...timestamps,
});

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** "expense" | "income" | "both" */
    type: text("type").notNull().default("expense"),
    icon: text("icon"),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    ...timestamps,
  },
  (t) => [uniqueIndex("categories_name_unique").on(t.name)]
);

export const payPeriods = sqliteTable(
  "pay_periods",
  {
    id: text("id").primaryKey(),
    /** ISO date; a period begins on a payday. */
    startDate: text("start_date").notNull(),
    /** ISO date; the day before the following payday. */
    endDate: text("end_date").notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("pay_periods_start_unique").on(t.startDate)]
);

export const paychecks = sqliteTable(
  "paychecks",
  {
    id: text("id").primaryKey(),
    expectedDate: text("expected_date").notNull(),
    actualDate: text("actual_date"),
    /** Integer cents. */
    expectedAmount: integer("expected_amount").notNull(),
    /** Integer cents; null until received/overridden. */
    actualAmount: integer("actual_amount"),
    /** "pending" | "received" */
    status: text("status").notNull().default("pending"),
    /** True when added by hand (bonus/extra) rather than generated from the schedule. */
    isManual: integer("is_manual", { mode: "boolean" }).notNull().default(false),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("paychecks_expected_date_idx").on(t.expectedDate)]
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    description: text("description").notNull(),
    /** Integer cents, always positive; direction comes from `type`. */
    amount: integer("amount").notNull(),
    /** TransactionType */
    type: text("type").notNull(),
    /** PaymentMethod */
    paymentMethod: text("payment_method").notNull().default("debit"),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    payPeriodId: text("pay_period_id").references(() => payPeriods.id, { onDelete: "set null" }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("transactions_date_idx").on(t.date),
    index("transactions_type_idx").on(t.type),
    index("transactions_category_idx").on(t.categoryId),
    index("transactions_period_idx").on(t.payPeriodId),
  ]
);

export const bills = sqliteTable(
  "bills",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    /** Integer cents. */
    amount: integer("amount").notNull(),
    /** BillFrequency */
    frequency: text("frequency").notNull(),
    /** Day of month (1-31) for monthly-style bills; informational. */
    dueDay: integer("due_day"),
    nextDueDate: text("next_due_date").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    isAutoPay: integer("is_auto_pay", { mode: "boolean" }).notNull().default(false),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [index("bills_next_due_idx").on(t.nextDueDate), index("bills_active_idx").on(t.isActive)]
);

export const billPayments = sqliteTable(
  "bill_payments",
  {
    id: text("id").primaryKey(),
    billId: text("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    dueDate: text("due_date").notNull(),
    paidDate: text("paid_date"),
    /** Integer cents. */
    amount: integer("amount").notNull(),
    /** "paid" | "due" */
    status: text("status").notNull().default("paid"),
    ...timestamps,
  },
  (t) => [index("bill_payments_bill_idx").on(t.billId), index("bill_payments_due_idx").on(t.dueDate)]
);

export const savingsGoals = sqliteTable("savings_goals", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /** Integer cents. */
  targetAmount: integer("target_amount").notNull(),
  /** Integer cents. */
  currentAmount: integer("current_amount").notNull().default(0),
  targetDate: text("target_date"),
  /** "fixed" (cents) | "percent" (basis points of paycheck) */
  contributionType: text("contribution_type").notNull().default("fixed"),
  contributionAmount: integer("contribution_amount").notNull().default(0),
  priority: integer("priority").notNull().default(1),
  /** "active" | "completed" | "paused" */
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const savingsContributions = sqliteTable(
  "savings_contributions",
  {
    id: text("id").primaryKey(),
    goalId: text("goal_id")
      .notNull()
      .references(() => savingsGoals.id, { onDelete: "cascade" }),
    paycheckId: text("paycheck_id").references(() => paychecks.id, { onDelete: "set null" }),
    date: text("date").notNull(),
    /** Integer cents. */
    amount: integer("amount").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("savings_contributions_goal_idx").on(t.goalId),
    index("savings_contributions_date_idx").on(t.date),
  ]
);

export type SettingsRow = typeof settings.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type PayPeriodRow = typeof payPeriods.$inferSelect;
export type PaycheckRow = typeof paychecks.$inferSelect;
export type TransactionRow = typeof transactions.$inferSelect;
export type BillRow = typeof bills.$inferSelect;
export type BillPaymentRow = typeof billPayments.$inferSelect;
export type SavingsGoalRow = typeof savingsGoals.$inferSelect;
export type SavingsContributionRow = typeof savingsContributions.$inferSelect;
