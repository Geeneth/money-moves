import { differenceInCalendarDays } from "date-fns";
import {
  daysElapsedInPeriod,
  daysRemainingInPeriod,
  periodFor,
  previousPayday,
} from "@/lib/calculations/pay-periods";
import { billAllocationPerPaycheck } from "@/lib/calculations/bills";
import { savingsAllocationForPaycheck, type GoalLike } from "@/lib/calculations/savings";
import {
  actualDailyPace,
  computeBreakdown,
  paceStatus,
  recommendedDailySpending,
  sumByTypes,
  type PaceStatus,
  type SpendingBreakdown,
} from "@/lib/calculations/spending";
import { fromISODate, todayISO } from "@/lib/formatting/dates";
import {
  getRecentAutoPayPayments,
  listBills,
  processAutoPayBills,
  type RecentAutoPayPayment,
} from "@/lib/repositories/bills";
import { receivedPaychecksInRange, listPaychecks } from "@/lib/repositories/paychecks";
import { getSettings } from "@/lib/repositories/settings";
import { listGoals } from "@/lib/repositories/savings";
import { transactionsInRange, listTransactions } from "@/lib/repositories/transactions";
import type { BillFrequency, ContributionType, GoalStatus } from "@/lib/types";

export type { RecentAutoPayPayment };

export interface DashboardData {
  configured: boolean;
  currency: string;
  today: string;
  period: { start: string; end: string; nextPayday: string; previousPayday: string } | null;
  daysRemaining: number;
  daysElapsed: number;
  paychecksReceivedThisPeriod: number;
  breakdown: SpendingBreakdown | null;
  recommendedDaily: number;
  targetDaily: number;
  actualDailyPace: number;
  pace: PaceStatus | null;
  billAllocationPerPaycheck: number;
  upcomingBills: Array<{
    id: string;
    name: string;
    amount: number;
    nextDueDate: string;
    isAutoPay: boolean;
    daysUntilDue: number;
  }>;
  upcomingBillsTotal: number;
  savings: {
    allocatedThisPeriod: number;
    totalSaved: number;
    totalTarget: number;
    activeGoals: number;
  };
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    type: string;
    categoryName: string | null;
  }>;
  nextPaycheck: { expectedDate: string; expectedAmount: number; status: string } | null;
  recentAutoPayPayments: RecentAutoPayPayment[];
}

export function getDashboardData(): DashboardData {
  // Process auto-pay bills before reading any data so the rest of the query
  // reflects the advanced due dates and newly created transactions.
  processAutoPayBills();
  const recentAutoPayPayments = getRecentAutoPayPayments(7);

  const settings = getSettings();
  const today = todayISO();

  if (!settings || !settings.knownPayday) {
    return {
      configured: false,
      currency: settings?.currency ?? "CAD",
      today,
      period: null,
      daysRemaining: 0,
      daysElapsed: 0,
      paychecksReceivedThisPeriod: 0,
      breakdown: null,
      recommendedDaily: 0,
      targetDaily: 0,
      actualDailyPace: 0,
      pace: null,
      billAllocationPerPaycheck: 0,
      upcomingBills: [],
      upcomingBillsTotal: 0,
      savings: { allocatedThisPeriod: 0, totalSaved: 0, totalTarget: 0, activeGoals: 0 },
      recentTransactions: [],
      nextPaycheck: null,
      recentAutoPayPayments,
    };
  }

  const anchor = settings.knownPayday;
  const freq = settings.payFrequencyDays;
  const range = periodFor(today, anchor, freq);
  const prevPayday = previousPayday(today, anchor, freq);
  const daysRemaining = daysRemainingInPeriod(today, anchor, freq);
  const daysElapsed = daysElapsedInPeriod(today, anchor, freq);

  // Income: received paychecks in the period + non-paycheck income transactions.
  const received = receivedPaychecksInRange(range.start, range.end);
  const paycheckIncome = received.reduce((sum, p) => sum + (p.actualAmount ?? p.expectedAmount), 0);
  const periodTxns = transactionsInRange(range.start, range.end);
  const otherIncome = sumByTypes(periodTxns, ["income"]);
  const expenseCents = sumByTypes(periodTxns, ["expense"]);
  const refundCents = sumByTypes(periodTxns, ["refund"]);

  // Allocations scale with paychecks actually received this period.
  const goals = listGoals().map((g) => ({
    contributionType: g.contributionType as ContributionType,
    contributionAmount: g.contributionAmount,
    status: g.status as GoalStatus,
    targetAmount: g.targetAmount,
    currentAmount: g.currentAmount,
  })) satisfies GoalLike[];

  const savingsAllocation = received.reduce(
    (sum, p) => sum + savingsAllocationForPaycheck(goals, p.actualAmount ?? p.expectedAmount),
    0
  );

  const allBills = listBills();
  const perPaycheckBillReserve = billAllocationPerPaycheck(
    allBills.map((b) => ({ ...b, frequency: b.frequency as BillFrequency }))
  );
  const billAllocation = perPaycheckBillReserve * received.length;

  const breakdown = computeBreakdown({
    paycheckIncomeCents: paycheckIncome,
    otherIncomeCents: otherIncome,
    savingsAllocationCents: savingsAllocation,
    billAllocationCents: billAllocation,
    expenseCents,
    refundCents,
  });

  const recommendedDaily = recommendedDailySpending(breakdown.availableToSpend, daysRemaining);
  // Target pace: what daily spending would have kept the whole period on budget.
  const budgetForPeriod = breakdown.availableToSpend + breakdown.expenses;
  const targetDaily = budgetForPeriod > 0 ? Math.floor(budgetForPeriod / freq) : 0;
  const dailyPace = actualDailyPace(breakdown.expenses, daysElapsed);

  // Upcoming bills strictly before the next payday.
  const upcoming = allBills
    .filter((b) => b.isActive && b.nextDueDate >= today && b.nextDueDate < range.nextPayday)
    .map((b) => ({
      id: b.id,
      name: b.name,
      amount: b.amount,
      nextDueDate: b.nextDueDate,
      isAutoPay: b.isAutoPay,
      daysUntilDue: differenceInCalendarDays(fromISODate(b.nextDueDate), fromISODate(today)),
    }));
  const upcomingBillsTotal = upcoming.reduce((sum, b) => sum + b.amount, 0);

  const pace = paceStatus({
    availableCents: breakdown.availableToSpend,
    actualDailyCents: dailyPace,
    targetDailyCents: targetDaily,
    upcomingBillsCents: upcomingBillsTotal,
    billReservedCents: billAllocation,
  });

  const goalRows = listGoals();
  const activeGoals = goalRows.filter((g) => g.status === "active");
  const totalSaved = goalRows.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goalRows.reduce((sum, g) => sum + g.targetAmount, 0);

  const recent = listTransactions({}).slice(0, 8).map((t) => ({
    id: t.id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
    categoryName: t.categoryName,
  }));

  const nextCheck =
    listPaychecks(range.nextPayday, undefined).find((p) => p.status === "pending") ?? null;

  return {
    configured: true,
    currency: settings.currency,
    today,
    period: { ...range, previousPayday: prevPayday },
    daysRemaining,
    daysElapsed,
    paychecksReceivedThisPeriod: received.length,
    breakdown,
    recommendedDaily,
    targetDaily,
    actualDailyPace: dailyPace,
    pace,
    billAllocationPerPaycheck: perPaycheckBillReserve,
    upcomingBills: upcoming,
    upcomingBillsTotal,
    savings: {
      allocatedThisPeriod: savingsAllocation,
      totalSaved,
      totalTarget,
      activeGoals: activeGoals.length,
    },
    recentTransactions: recent,
    nextPaycheck: nextCheck
      ? {
          expectedDate: nextCheck.expectedDate,
          expectedAmount: nextCheck.expectedAmount,
          status: nextCheck.status,
        }
      : null,
    recentAutoPayPayments,
  };
}
