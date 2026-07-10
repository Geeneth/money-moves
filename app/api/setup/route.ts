import { handle, ok, parseBody, badRequest } from "@/lib/api-helpers";
import { loadSampleData } from "@/lib/database/sample-data";
import { createBill } from "@/lib/repositories/bills";
import { seedDefaultCategories } from "@/lib/repositories/categories";
import { ensureGeneratedPaychecks } from "@/lib/repositories/paychecks";
import { createSettings, getSettings } from "@/lib/repositories/settings";
import { createGoal } from "@/lib/repositories/savings";
import { setupInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    if (getSettings()) return badRequest("The app is already set up");
    const input = await parseBody(request, setupInput);

    createSettings({
      currency: input.currency.toUpperCase(),
      defaultPayAmount: input.defaultPayAmount,
      knownPayday: input.knownPayday,
      payFrequencyDays: 14,
      savingsMethod: input.savingsMethod,
      defaultSavingsAmount: input.defaultSavingsAmount,
      weekStartDay: 0,
      theme: "light",
    });
    seedDefaultCategories();

    if (input.useSampleData) {
      loadSampleData();
    } else {
      for (const bill of input.bills) {
        createBill({
          name: bill.name,
          amount: bill.amount,
          frequency: bill.frequency,
          dueDay: Number(bill.nextDueDate.slice(8, 10)),
          nextDueDate: bill.nextDueDate,
          categoryId: null,
          isAutoPay: false,
          isActive: true,
          notes: null,
        });
      }
      if (input.defaultSavingsAmount > 0) {
        createGoal({
          name: "General Savings",
          targetAmount: 1000000,
          currentAmount: 0,
          targetDate: null,
          contributionType: input.savingsMethod,
          contributionAmount: input.defaultSavingsAmount,
          priority: 1,
          status: "active",
          notes: "Created during setup — edit or replace with real goals",
        });
      }
    }
    ensureGeneratedPaychecks();
    return ok({ done: true });
  });
}
