import { describe, expect, it } from "vitest";
import {
  advanceDueDate,
  annualBillTotal,
  annualizeBill,
  billAllocationPerPaycheck,
  monthlyBillEstimate,
} from "./bills";

describe("annualizeBill", () => {
  it("annualizes each frequency correctly", () => {
    expect(annualizeBill({ amount: 10000, frequency: "monthly" })).toBe(120000);
    expect(annualizeBill({ amount: 10000, frequency: "weekly" })).toBe(520000);
    expect(annualizeBill({ amount: 10000, frequency: "biweekly" })).toBe(260000);
    expect(annualizeBill({ amount: 10000, frequency: "quarterly" })).toBe(40000);
    expect(annualizeBill({ amount: 10000, frequency: "semiannual" })).toBe(20000);
    expect(annualizeBill({ amount: 10000, frequency: "yearly" })).toBe(10000);
    expect(annualizeBill({ amount: 10000, frequency: "one_time" })).toBe(0);
  });
});

describe("billAllocationPerPaycheck", () => {
  it("divides the annual total by 26, not monthly by 2", () => {
    // $100/month = $1,200/year => $46.15 per paycheck (the spec's example)
    const bills = [{ amount: 10000, frequency: "monthly" as const, isActive: true }];
    expect(billAllocationPerPaycheck(bills)).toBe(4615);
  });

  it("ignores inactive bills", () => {
    const bills = [
      { amount: 10000, frequency: "monthly" as const, isActive: true },
      { amount: 99999, frequency: "monthly" as const, isActive: false },
    ];
    expect(annualBillTotal(bills)).toBe(120000);
  });

  it("estimates monthly cost from the annual total", () => {
    const bills = [{ amount: 2600, frequency: "biweekly" as const, isActive: true }];
    expect(monthlyBillEstimate(bills)).toBe(Math.round((2600 * 26) / 12));
  });
});

describe("advanceDueDate", () => {
  it("advances monthly preserving the due day", () => {
    expect(advanceDueDate("2026-07-15", "monthly", 15)).toBe("2026-08-15");
  });

  it("clamps due day 31 in shorter months", () => {
    expect(advanceDueDate("2026-01-31", "monthly", 31)).toBe("2026-02-28");
  });

  it("advances biweekly by 14 days", () => {
    expect(advanceDueDate("2026-07-01", "biweekly")).toBe("2026-07-15");
  });

  it("advances weekly, quarterly, semiannual, yearly", () => {
    expect(advanceDueDate("2026-07-01", "weekly")).toBe("2026-07-08");
    expect(advanceDueDate("2026-07-01", "quarterly", 1)).toBe("2026-10-01");
    expect(advanceDueDate("2026-07-01", "semiannual", 1)).toBe("2027-01-01");
    expect(advanceDueDate("2026-07-01", "yearly")).toBe("2027-07-01");
  });

  it("does not advance one-time bills", () => {
    expect(advanceDueDate("2026-07-01", "one_time")).toBe("2026-07-01");
  });
});
