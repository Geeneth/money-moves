import { describe, expect, it } from "vitest";
import {
  estimatedCompletionDate,
  goalContributionForPaycheck,
  goalProgressPercent,
  savingsAllocationForPaycheck,
} from "./savings";
import type { GoalLike } from "./savings";

const base: GoalLike = {
  contributionType: "fixed",
  contributionAmount: 10000, // $100
  status: "active",
  targetAmount: 100000, // $1,000
  currentAmount: 0,
};

describe("goalContributionForPaycheck", () => {
  it("fixed contribution ignores paycheck size", () => {
    expect(goalContributionForPaycheck(base, 250000)).toBe(10000);
  });

  it("percent contribution uses basis points of the paycheck", () => {
    const goal: GoalLike = { ...base, contributionType: "percent", contributionAmount: 1000 }; // 10%
    expect(goalContributionForPaycheck(goal, 250000)).toBe(25000);
  });

  it("never contributes past the target", () => {
    const goal: GoalLike = { ...base, currentAmount: 95000 };
    expect(goalContributionForPaycheck(goal, 250000)).toBe(5000);
  });

  it("paused and completed goals contribute nothing", () => {
    expect(goalContributionForPaycheck({ ...base, status: "paused" }, 250000)).toBe(0);
    expect(goalContributionForPaycheck({ ...base, status: "completed" }, 250000)).toBe(0);
  });
});

describe("savingsAllocationForPaycheck", () => {
  it("sums contributions across active goals", () => {
    const goals: GoalLike[] = [
      base,
      { ...base, contributionType: "percent", contributionAmount: 500 }, // 5%
    ];
    expect(savingsAllocationForPaycheck(goals, 200000)).toBe(10000 + 10000);
  });
});

describe("estimatedCompletionDate", () => {
  it("projects completion by biweekly paychecks", () => {
    // $1,000 remaining at $100/paycheck => 10 paychecks => 140 days
    expect(estimatedCompletionDate(base, 200000, "2026-07-03")).toBe("2026-11-20");
  });

  it("returns null when no contribution is configured", () => {
    expect(estimatedCompletionDate({ ...base, contributionAmount: 0 }, 200000, "2026-07-03")).toBeNull();
  });
});

describe("goalProgressPercent", () => {
  it("caps at 100", () => {
    expect(goalProgressPercent({ targetAmount: 100, currentAmount: 250 })).toBe(100);
    expect(goalProgressPercent({ targetAmount: 100000, currentAmount: 25000 })).toBe(25);
  });
});
