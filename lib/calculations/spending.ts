export interface PeriodTransactionLike {
  amount: number;
  type: string;
}

export interface SpendingBreakdown {
  /** Received paycheck income + other income transactions, in cents. */
  incomeReceived: number;
  /** Planned savings taken off the top for received paychecks, in cents. */
  savingsAllocation: number;
  /** Bill reserve taken off the top for received paychecks, in cents. */
  billAllocation: number;
  /** Discretionary expenses minus refunds, in cents. */
  expenses: number;
  /** incomeReceived - savingsAllocation - billAllocation - expenses. */
  availableToSpend: number;
}

/**
 * Available to Spend =
 *   Income Received
 *   - Savings Allocation
 *   - Bill Allocation
 *   - Discretionary Expenses (expenses minus refunds)
 *
 * Bill payments are intentionally excluded from expenses: they are funded by
 * the bill allocation, so counting them again would double-deduct. Savings
 * contributions are likewise covered by the savings allocation. Transfers are
 * neutral.
 */
export function computeBreakdown(input: {
  paycheckIncomeCents: number;
  otherIncomeCents: number;
  savingsAllocationCents: number;
  billAllocationCents: number;
  expenseCents: number;
  refundCents: number;
}): SpendingBreakdown {
  const incomeReceived = input.paycheckIncomeCents + input.otherIncomeCents;
  const expenses = input.expenseCents - input.refundCents;
  return {
    incomeReceived,
    savingsAllocation: input.savingsAllocationCents,
    billAllocation: input.billAllocationCents,
    expenses,
    availableToSpend:
      incomeReceived - input.savingsAllocationCents - input.billAllocationCents - expenses,
  };
}

/** Sum transactions of the given types, in cents. */
export function sumByTypes(transactions: PeriodTransactionLike[], types: string[]): number {
  return transactions
    .filter((t) => types.includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Recommended Daily Spending = Available to Spend / Remaining Days.
 * Returns 0 when nothing is available or no days remain.
 */
export function recommendedDailySpending(availableCents: number, daysRemaining: number): number {
  if (daysRemaining <= 0) return 0;
  if (availableCents <= 0) return 0;
  return Math.floor(availableCents / daysRemaining);
}

/** Average daily discretionary spending so far this period, in cents. */
export function actualDailyPace(expensesCents: number, daysElapsed: number): number {
  if (daysElapsed <= 0) return 0;
  return Math.round(expensesCents / daysElapsed);
}

export interface PaceStatus {
  overspending: boolean;
  overPace: boolean;
  billsUnderfunded: boolean;
}

export function paceStatus(input: {
  availableCents: number;
  actualDailyCents: number;
  /** What daily spend would have kept the whole period on budget. */
  targetDailyCents: number;
  upcomingBillsCents: number;
  billReservedCents: number;
}): PaceStatus {
  return {
    overspending: input.availableCents < 0,
    overPace: input.actualDailyCents > input.targetDailyCents && input.targetDailyCents >= 0,
    billsUnderfunded: input.billReservedCents < input.upcomingBillsCents,
  };
}
