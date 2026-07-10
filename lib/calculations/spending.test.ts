import { describe, expect, it } from "vitest";
import {
  actualDailyPace,
  computeBreakdown,
  paceStatus,
  recommendedDailySpending,
} from "./spending";
import { formatCents, parseDollarsToCents } from "@/lib/formatting/money";

describe("computeBreakdown", () => {
  it("follows Available = Income - Savings - Bills - Expenses", () => {
    const b = computeBreakdown({
      paycheckIncomeCents: 250000,
      otherIncomeCents: 5000,
      savingsAllocationCents: 25000,
      billAllocationCents: 46150,
      expenseCents: 40000,
      refundCents: 2000,
    });
    expect(b.incomeReceived).toBe(255000);
    expect(b.expenses).toBe(38000);
    expect(b.availableToSpend).toBe(255000 - 25000 - 46150 - 38000);
  });
});

describe("recommendedDailySpending", () => {
  it("divides available by remaining days", () => {
    expect(recommendedDailySpending(14000, 14)).toBe(1000);
  });

  it("returns 0 when negative or no days remain", () => {
    expect(recommendedDailySpending(-500, 7)).toBe(0);
    expect(recommendedDailySpending(14000, 0)).toBe(0);
  });
});

describe("actualDailyPace", () => {
  it("averages spending over elapsed days", () => {
    expect(actualDailyPace(7000, 7)).toBe(1000);
    expect(actualDailyPace(7000, 0)).toBe(0);
  });
});

describe("paceStatus", () => {
  it("flags overspending, over-pace, and underfunded bills", () => {
    const status = paceStatus({
      availableCents: -100,
      actualDailyCents: 2000,
      targetDailyCents: 1000,
      upcomingBillsCents: 50000,
      billReservedCents: 46150,
    });
    expect(status.overspending).toBe(true);
    expect(status.overPace).toBe(true);
    expect(status.billsUnderfunded).toBe(true);
  });

  it("stays quiet when on track", () => {
    const status = paceStatus({
      availableCents: 100000,
      actualDailyCents: 900,
      targetDailyCents: 1000,
      upcomingBillsCents: 40000,
      billReservedCents: 46150,
    });
    expect(status.overspending).toBe(false);
    expect(status.overPace).toBe(false);
    expect(status.billsUnderfunded).toBe(false);
  });
});

describe("money formatting", () => {
  it("stores $12.34 as 1234 cents", () => {
    expect(parseDollarsToCents("12.34")).toBe(1234);
    expect(parseDollarsToCents("$1,234.56")).toBe(123456);
    expect(parseDollarsToCents("abc")).toBeNull();
  });

  it("formats cents as currency", () => {
    expect(formatCents(1234, "CAD")).toBe("$12.34");
  });
});
