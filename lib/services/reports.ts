import { eachDayOfInterval, format } from "date-fns";
import { periodFor, recentPeriods } from "@/lib/calculations/pay-periods";
import { billAllocationPerPaycheck } from "@/lib/calculations/bills";
import { sumByTypes } from "@/lib/calculations/spending";
import { fromISODate, todayISO } from "@/lib/formatting/dates";
import { listBills } from "@/lib/repositories/bills";
import { listCategories } from "@/lib/repositories/categories";
import { receivedPaychecksInRange } from "@/lib/repositories/paychecks";
import { getSettings } from "@/lib/repositories/settings";
import { listGoals } from "@/lib/repositories/savings";
import { transactionsInRange } from "@/lib/repositories/transactions";
import type { BillFrequency } from "@/lib/types";

export interface ReportsData {
  configured: boolean;
  currency: string;
  range: { from: string; to: string };
  totals: {
    income: number;
    expenses: number;
    billPayments: number;
    savings: number;
    net: number;
    avgDailySpending: number;
  };
  byCategory: Array<{ name: string; value: number }>;
  overTime: Array<{ date: string; label: string; spending: number }>;
  allocation: Array<{ name: string; value: number }>;
  monthly: Array<{ month: string; income: number; expenses: number }>;
  periodComparison: Array<{
    label: string;
    start: string;
    income: number;
    spending: number;
    savings: number;
  }>;
  savingsGoals: Array<{ name: string; current: number; target: number }>;
  billReserve: { perPaycheck: number; annualTotal: number };
  topCategories: Array<{ name: string; value: number }>;
  vsPreviousPeriod: { current: number; previous: number; changePct: number | null };
}

export function getReportsData(fromISO: string, toISO: string): ReportsData {
  const settings = getSettings();
  const currency = settings?.currency ?? "CAD";
  const today = todayISO();

  const txns = transactionsInRange(fromISO, toISO);
  const income =
    sumByTypes(txns, ["income"]) +
    receivedPaychecksInRange(fromISO, toISO).reduce(
      (s, p) => s + (p.actualAmount ?? p.expectedAmount),
      0
    );
  const expenses = sumByTypes(txns, ["expense"]) - sumByTypes(txns, ["refund"]);
  const billPayments = sumByTypes(txns, ["bill_payment"]);
  const savings = sumByTypes(txns, ["savings"]);

  const categories = new Map(listCategories().map((c) => [c.id, c.name]));
  const byCategoryMap = new Map<string, number>();
  for (const t of txns) {
    if (t.type !== "expense" && t.type !== "bill_payment") continue;
    const name = (t.categoryId && categories.get(t.categoryId)) || "Uncategorized";
    byCategoryMap.set(name, (byCategoryMap.get(name) ?? 0) + t.amount);
  }
  for (const t of txns) {
    if (t.type !== "refund") continue;
    const name = (t.categoryId && categories.get(t.categoryId)) || "Uncategorized";
    byCategoryMap.set(name, (byCategoryMap.get(name) ?? 0) - t.amount);
  }
  const byCategory = [...byCategoryMap.entries()]
    .map(([name, value]) => ({ name, value }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  // Spending over time (daily buckets; discretionary + bills).
  const days = eachDayOfInterval({ start: fromISODate(fromISO), end: fromISODate(toISO) });
  const spendingByDay = new Map<string, number>();
  for (const t of txns) {
    if (t.type === "expense" || t.type === "bill_payment") {
      spendingByDay.set(t.date, (spendingByDay.get(t.date) ?? 0) + t.amount);
    } else if (t.type === "refund") {
      spendingByDay.set(t.date, (spendingByDay.get(t.date) ?? 0) - t.amount);
    }
  }
  const overTime = days.map((d) => {
    const iso = format(d, "yyyy-MM-dd");
    return { date: iso, label: format(d, "MMM d"), spending: spendingByDay.get(iso) ?? 0 };
  });

  const dayCount = Math.max(1, days.length);
  const avgDailySpending = Math.round((expenses + billPayments) / dayCount);

  const discretionary = Math.max(0, income - billPayments - savings - expenses);
  const allocation = [
    { name: "Bills", value: billPayments },
    { name: "Savings", value: savings },
    { name: "Spending", value: expenses },
    { name: "Unallocated", value: discretionary },
  ].filter((a) => a.value > 0);

  // Monthly income vs expenses over the report range.
  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  for (const t of txns) {
    const key = t.date.slice(0, 7);
    const entry = monthlyMap.get(key) ?? { income: 0, expenses: 0 };
    if (t.type === "income") entry.income += t.amount;
    if (t.type === "expense" || t.type === "bill_payment") entry.expenses += t.amount;
    if (t.type === "refund") entry.expenses -= t.amount;
    monthlyMap.set(key, entry);
  }
  for (const p of receivedPaychecksInRange(fromISO, toISO)) {
    const d = p.actualDate ?? p.expectedDate;
    const key = d.slice(0, 7);
    const entry = monthlyMap.get(key) ?? { income: 0, expenses: 0 };
    entry.income += p.actualAmount ?? p.expectedAmount;
    monthlyMap.set(key, entry);
  }
  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month: format(fromISODate(`${month}-01`), "MMM yyyy"),
      income: v.income,
      expenses: v.expenses,
    }));

  // Last 6 pay periods compared.
  let periodComparison: ReportsData["periodComparison"] = [];
  let vsPreviousPeriod: ReportsData["vsPreviousPeriod"] = {
    current: 0,
    previous: 0,
    changePct: null,
  };
  if (settings?.knownPayday) {
    const periods = recentPeriods(today, settings.knownPayday, 6, settings.payFrequencyDays);
    periodComparison = periods.map((p) => {
      const pTxns = transactionsInRange(p.start, p.end);
      const pIncome =
        sumByTypes(pTxns, ["income"]) +
        receivedPaychecksInRange(p.start, p.end).reduce(
          (s, pc) => s + (pc.actualAmount ?? pc.expectedAmount),
          0
        );
      return {
        label: format(fromISODate(p.start), "MMM d"),
        start: p.start,
        income: pIncome,
        spending:
          sumByTypes(pTxns, ["expense", "bill_payment"]) - sumByTypes(pTxns, ["refund"]),
        savings: sumByTypes(pTxns, ["savings"]),
      };
    });
    const current = periodComparison[periodComparison.length - 1];
    const previous = periodComparison[periodComparison.length - 2];
    if (current && previous) {
      vsPreviousPeriod = {
        current: current.spending,
        previous: previous.spending,
        changePct:
          previous.spending > 0
            ? ((current.spending - previous.spending) / previous.spending) * 100
            : null,
      };
    }
  }

  const goals = listGoals().map((g) => ({
    name: g.name,
    current: g.currentAmount,
    target: g.targetAmount,
  }));

  const allBills = listBills();
  const perPaycheck = billAllocationPerPaycheck(
    allBills.map((b) => ({ ...b, frequency: b.frequency as BillFrequency }))
  );
  const annualTotal = allBills
    .filter((b) => b.isActive && b.frequency !== "one_time")
    .reduce((sum, b) => sum + b.amount * occurrencesPerYear(b.frequency), 0);

  return {
    configured: Boolean(settings),
    currency,
    range: { from: fromISO, to: toISO },
    totals: {
      income,
      expenses,
      billPayments,
      savings,
      net: income - expenses - billPayments - savings,
      avgDailySpending,
    },
    byCategory,
    overTime,
    allocation,
    monthly,
    periodComparison,
    savingsGoals: goals,
    billReserve: { perPaycheck, annualTotal },
    topCategories: byCategory.slice(0, 5),
    vsPreviousPeriod,
  };
}

function occurrencesPerYear(frequency: string): number {
  switch (frequency) {
    case "weekly":
      return 52;
    case "biweekly":
      return 26;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "semiannual":
      return 2;
    case "yearly":
      return 1;
    default:
      return 0;
  }
}

/** Resolve a report preset into a concrete date range. */
export function resolveReportRange(
  preset: string,
  customFrom?: string,
  customTo?: string
): { from: string; to: string } {
  const settings = getSettings();
  const today = todayISO();
  const anchor = settings?.knownPayday ?? today;
  const freq = settings?.payFrequencyDays ?? 14;

  switch (preset) {
    case "current_period": {
      const p = periodFor(today, anchor, freq);
      return { from: p.start, to: p.end };
    }
    case "previous_period": {
      const periods = recentPeriods(today, anchor, 2, freq);
      const prev = periods[0];
      return { from: prev.start, to: prev.end };
    }
    case "month": {
      return { from: `${today.slice(0, 7)}-01`, to: today };
    }
    case "year": {
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    }
    case "custom": {
      if (customFrom && customTo) return { from: customFrom, to: customTo };
      return { from: `${today.slice(0, 7)}-01`, to: today };
    }
    default: {
      const p = periodFor(today, anchor, freq);
      return { from: p.start, to: p.end };
    }
  }
}
