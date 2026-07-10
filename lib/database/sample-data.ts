import { addDays } from "date-fns";
import { fromISODate, toISODate, todayISO } from "@/lib/formatting/dates";
import { listCategories, seedDefaultCategories } from "@/lib/repositories/categories";
import { createBill } from "@/lib/repositories/bills";
import { createPaycheck } from "@/lib/repositories/paychecks";
import { createGoal, recordContribution } from "@/lib/repositories/savings";
import { createTransaction } from "@/lib/repositories/transactions";
import { getSettings } from "@/lib/repositories/settings";
import { periodStartFor } from "@/lib/calculations/pay-periods";
import type { PaymentMethod, TransactionType } from "@/lib/types";

/**
 * Populate the database with realistic sample data spanning four pay periods.
 * Assumes settings already exist (uses the configured anchor payday).
 */
export function loadSampleData(): void {
  const settings = getSettings();
  if (!settings) throw new Error("Set up the app before loading sample data");
  const today = todayISO();
  const anchor = settings.knownPayday;
  const freq = settings.payFrequencyDays;
  const payAmount = settings.defaultPayAmount > 0 ? settings.defaultPayAmount : 245000;

  seedDefaultCategories();
  const categories = new Map(listCategories().map((c) => [c.name, c.id]));
  const cat = (name: string): string | null => categories.get(name) ?? null;

  const currentStart = periodStartFor(today, anchor, freq);
  const day = (periodsAgo: number, offset: number): string =>
    toISODate(addDays(fromISODate(currentStart), -periodsAgo * freq + offset));

  // --- Paychecks: three past received (one with a different actual amount), current, next pending.
  for (let periodsAgo = 3; periodsAgo >= 0; periodsAgo--) {
    const date = day(periodsAgo, 0);
    const received = date <= today;
    const actual = periodsAgo === 2 ? payAmount + 18500 : payAmount; // one paycheck with overtime
    createPaycheck(
      {
        expectedDate: date,
        expectedAmount: payAmount,
        actualDate: received ? date : null,
        actualAmount: received ? actual : null,
        status: received ? "received" : "pending",
        notes: periodsAgo === 2 ? "Included overtime" : null,
      },
      false
    );
  }
  createPaycheck(
    {
      expectedDate: day(-1, 0),
      expectedAmount: payAmount,
      status: "pending",
      notes: null,
    },
    false
  );

  // --- Bills.
  const bills = [
    { name: "Rent", amount: 165000, frequency: "monthly" as const, dueDay: 1, category: "Housing", autoPay: false },
    { name: "Hydro", amount: 9500, frequency: "monthly" as const, dueDay: 15, category: "Utilities", autoPay: true },
    { name: "Internet", amount: 8500, frequency: "monthly" as const, dueDay: 22, category: "Utilities", autoPay: true },
    { name: "Phone", amount: 6500, frequency: "monthly" as const, dueDay: 8, category: "Utilities", autoPay: true },
    { name: "Car Insurance", amount: 38000, frequency: "quarterly" as const, dueDay: 5, category: "Transportation", autoPay: false },
    { name: "Streaming Bundle", amount: 3299, frequency: "monthly" as const, dueDay: 12, category: "Subscriptions", autoPay: true },
    { name: "Gym", amount: 4500, frequency: "monthly" as const, dueDay: 3, category: "Health", autoPay: true },
  ];
  for (const b of bills) {
    // Next due: first occurrence of dueDay on/after today.
    const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
    const thisMonth = `${today.slice(0, 7)}-${String(b.dueDay).padStart(2, "0")}`;
    const nextDue =
      thisMonth >= today
        ? thisMonth
        : `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-${String(b.dueDay).padStart(2, "0")}`;
    createBill({
      name: b.name,
      amount: b.amount,
      frequency: b.frequency,
      dueDay: b.dueDay,
      nextDueDate: nextDue,
      categoryId: cat(b.category),
      isAutoPay: b.autoPay,
      isActive: true,
      notes: null,
    });
  }

  // --- Savings goals.
  const emergency = createGoal({
    name: "Emergency Fund",
    targetAmount: 1000000,
    currentAmount: 0,
    targetDate: null,
    contributionType: "fixed",
    contributionAmount: 20000,
    priority: 1,
    status: "active",
    notes: "Three months of essentials",
  });
  const trip = createGoal({
    name: "Japan Trip",
    targetAmount: 450000,
    currentAmount: 0,
    targetDate: toISODate(addDays(fromISODate(today), 300)),
    contributionType: "percent",
    contributionAmount: 500, // 5%
    priority: 2,
    status: "active",
    notes: null,
  });

  // Past contributions for the three received paychecks.
  for (let periodsAgo = 3; periodsAgo >= 1; periodsAgo--) {
    const date = day(periodsAgo, 1);
    recordContribution(
      { goalId: emergency.id, date, amount: 20000, paycheckId: null, notes: null },
      { createTransaction: true }
    );
    recordContribution(
      { goalId: trip.id, date, amount: Math.round(payAmount * 0.05), paycheckId: null, notes: null },
      { createTransaction: true }
    );
  }

  // --- Transactions across four periods.
  const spend = (
    periodsAgo: number,
    offset: number,
    description: string,
    amount: number,
    category: string,
    type: TransactionType = "expense",
    method: PaymentMethod = "debit"
  ): void => {
    const date = day(periodsAgo, offset);
    if (date > today) return;
    createTransaction({
      date,
      description,
      amount,
      type,
      paymentMethod: method,
      categoryId: cat(category),
      notes: null,
    });
  };

  for (let p = 3; p >= 0; p--) {
    spend(p, 1, "Fresh Market Groceries", 8734 + p * 312, "Groceries");
    spend(p, 2, "Coffee Bar", 675, "Restaurants", "expense", "credit");
    spend(p, 3, "Gas Station", 6240, "Transportation", "expense", "credit");
    spend(p, 5, "Grocery Run", 5612 + p * 118, "Groceries");
    spend(p, 6, "Thai Takeout", 4285, "Restaurants", "expense", "credit");
    spend(p, 8, "Pharmacy", 2350, "Health");
    spend(p, 10, "Groceries Top-up", 3489, "Groceries");
    if (p % 2 === 0) spend(p, 9, "Cinema Night", 3200, "Entertainment", "expense", "credit");
    if (p === 3) spend(p, 11, "New Running Shoes", 14500, "Shopping", "expense", "credit");
    if (p === 2) {
      spend(p, 7, "Birthday Gift", 5500, "Gifts", "expense", "credit");
      spend(p, 12, "Shoe Return Refund", 14500, "Shopping", "refund", "credit");
    }
    if (p === 1) {
      spend(p, 4, "Freelance Payment", 40000, "Salary", "income", "bank_transfer");
      spend(p, 12, "Weekend Trip Fuel", 5800, "Travel", "expense", "credit");
    }
    if (p === 0) {
      spend(p, 2, "Farmers Market", 4325, "Groceries", "expense", "cash");
      spend(p, 4, "Lunch with Friends", 2860, "Restaurants", "expense", "credit");
    }
  }
}
