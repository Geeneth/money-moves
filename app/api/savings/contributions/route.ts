import { z } from "zod";
import { badRequest, handle, ok, parseBody } from "@/lib/api-helpers";
import { goalContributionForPaycheck } from "@/lib/calculations/savings";
import { todayISO } from "@/lib/formatting/dates";
import { getPaycheck } from "@/lib/repositories/paychecks";
import {
  hasContributionForPaycheck,
  listContributions,
  listGoals,
  recordContribution,
} from "@/lib/repositories/savings";
import type { ContributionType, GoalStatus } from "@/lib/types";
import { contributionInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle(() => {
    const url = new URL(request.url);
    const limit = url.searchParams.get("limit");
    return ok(listContributions(limit ? Number(limit) : undefined));
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, contributionInput);
    return ok(recordContribution(input), { status: 201 });
  });
}

const autoRecordInput = z.object({ paycheckId: z.string().min(1) });

/**
 * PUT = auto-record: create the planned contribution for every active goal
 * for a given received paycheck (skipping goals already recorded for it).
 */
export async function PUT(request: Request): Promise<Response> {
  return handle(async () => {
    const { paycheckId } = await parseBody(request, autoRecordInput);
    const paycheck = getPaycheck(paycheckId);
    if (!paycheck) return badRequest("Paycheck not found");
    if (paycheck.status !== "received") {
      return badRequest("Mark the paycheck as received before recording contributions");
    }
    const amountBase = paycheck.actualAmount ?? paycheck.expectedAmount;
    const results: Array<{ goalId: string; amount: number }> = [];
    for (const goal of listGoals()) {
      if (goal.status !== "active") continue;
      if (hasContributionForPaycheck(goal.id, paycheckId)) continue;
      const amount = goalContributionForPaycheck(
        {
          contributionType: goal.contributionType as ContributionType,
          contributionAmount: goal.contributionAmount,
          status: goal.status as GoalStatus,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
        },
        amountBase
      );
      if (amount <= 0) continue;
      recordContribution({
        goalId: goal.id,
        date: paycheck.actualDate ?? paycheck.expectedDate ?? todayISO(),
        amount,
        paycheckId,
        notes: "Auto-recorded from paycheck",
      });
      results.push({ goalId: goal.id, amount });
    }
    return ok({ recorded: results });
  });
}
