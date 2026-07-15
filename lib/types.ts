export const TRANSACTION_TYPES = [
  "expense",
  "income",
  "refund",
  "transfer",
  "bill_payment",
  "savings",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  refund: "Refund",
  transfer: "Transfer",
  bill_payment: "Bill Payment",
  savings: "Savings Contribution",
};

export const PAYMENT_METHODS = [
  "credit",
  "debit",
  "cash",
  "bank_transfer",
  "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  debit: "Debit",
  credit: "Credit Card",
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

export const BILL_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "semiannual",
  "yearly",
  "one_time",
] as const;
export type BillFrequency = (typeof BILL_FREQUENCIES)[number];

export const BILL_FREQUENCY_LABELS: Record<BillFrequency, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  semiannual: "Semiannual",
  yearly: "Yearly",
  one_time: "One-time",
};

/** Occurrences per year for each recurring frequency. One-time bills are not annualized. */
export const FREQUENCY_PER_YEAR: Record<
  Exclude<BillFrequency, "one_time">,
  number
> = {
  weekly: 52,
  biweekly: 26,
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  yearly: 1,
};

export const PAYCHECK_STATUSES = ["pending", "received"] as const;
export type PaycheckStatus = (typeof PAYCHECK_STATUSES)[number];

export const GOAL_STATUSES = ["active", "completed", "paused"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const CONTRIBUTION_TYPES = ["fixed", "percent"] as const;
/** "fixed" = cents per paycheck, "percent" = basis points (10000 = 100%) of the paycheck */
export type ContributionType = (typeof CONTRIBUTION_TYPES)[number];

export const CATEGORY_TYPES = ["expense", "income", "both"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const SAVINGS_METHODS = ["fixed", "percent"] as const;
export type SavingsMethod = (typeof SAVINGS_METHODS)[number];

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const CURRENCIES = [
  "CAD",
  "USD",
  "EUR",
  "GBP",
  "AUD",
  "JPY",
  "INR",
  "LKR",
] as const;

export const DEFAULT_CATEGORIES: ReadonlyArray<{
  name: string;
  type: CategoryType;
  icon: string;
}> = [
  { name: "Groceries", type: "expense", icon: "shopping-cart" },
  { name: "Restaurants", type: "expense", icon: "utensils" },
  { name: "Transportation", type: "expense", icon: "car" },
  { name: "Shopping", type: "expense", icon: "shopping-bag" },
  { name: "Entertainment", type: "expense", icon: "clapperboard" },
  { name: "Health", type: "expense", icon: "heart-pulse" },
  { name: "Subscriptions", type: "expense", icon: "repeat" },
  { name: "Housing", type: "expense", icon: "home" },
  { name: "Utilities", type: "expense", icon: "plug" },
  { name: "Personal Care", type: "expense", icon: "sparkles" },
  { name: "Education", type: "expense", icon: "graduation-cap" },
  { name: "Projects", type: "expense", icon: "hammer" },
  { name: "Travel", type: "expense", icon: "plane" },
  { name: "Gifts", type: "expense", icon: "gift" },
  { name: "Miscellaneous", type: "both", icon: "circle-ellipsis" },
  { name: "Salary", type: "income", icon: "banknote" },
];
