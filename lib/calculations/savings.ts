import { addDays } from "date-fns";
import type { ContributionType, GoalStatus } from "@/lib/types";
import { fromISODate, toISODate } from "@/lib/formatting/dates";

export interface GoalLike {
  contributionType: ContributionType;
  /** Cents when fixed; basis points when percent. */
  contributionAmount: number;
  status: GoalStatus;
  targetAmount: number;
  currentAmount: number;
}

/** Contribution a single goal takes from one paycheck of `paycheckCents`, in cents. */
export function goalContributionForPaycheck(goal: GoalLike, paycheckCents: number): number {
  if (goal.status !== "active") return 0;
  const raw =
    goal.contributionType === "fixed"
      ? goal.contributionAmount
      : Math.round((paycheckCents * goal.contributionAmount) / 10000);
  // Never contribute past the target.
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  return Math.min(raw, remaining);
}

/** Total savings allocation from one paycheck across all active goals, in cents. */
export function savingsAllocationForPaycheck(goals: GoalLike[], paycheckCents: number): number {
  return goals.reduce((sum, g) => sum + goalContributionForPaycheck(g, paycheckCents), 0);
}

/**
 * Estimated completion date given a biweekly contribution pace.
 * Returns null when the goal cannot complete (no contribution) or is already complete.
 */
export function estimatedCompletionDate(
  goal: GoalLike,
  paycheckCents: number,
  fromISO: string,
  frequencyDays = 14
): string | null {
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return null;
  const perPaycheck = goalContributionForPaycheck(goal, paycheckCents);
  if (perPaycheck <= 0) return null;
  const paychecksNeeded = Math.ceil(remaining / perPaycheck);
  return toISODate(addDays(fromISODate(fromISO), paychecksNeeded * frequencyDays));
}

export function goalProgressPercent(goal: Pick<GoalLike, "targetAmount" | "currentAmount">): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
}
