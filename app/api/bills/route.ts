import { handle, ok, parseBody } from "@/lib/api-helpers";
import {
  annualBillTotal,
  billAllocationPerPaycheck,
  monthlyBillEstimate,
} from "@/lib/calculations/bills";
import { periodFor } from "@/lib/calculations/pay-periods";
import { todayISO } from "@/lib/formatting/dates";
import { createBill, listBills, processAutoPayBills } from "@/lib/repositories/bills";
import { receivedPaychecksInRange } from "@/lib/repositories/paychecks";
import { getSettings } from "@/lib/repositories/settings";
import type { BillFrequency } from "@/lib/types";
import { billInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(() => {
    processAutoPayBills();
    const bills = listBills();
    const billLikes = bills.map((b) => ({
      amount: b.amount,
      frequency: b.frequency as BillFrequency,
      isActive: b.isActive,
    }));
    const settings = getSettings();
    const today = todayISO();
    const perPaycheck = billAllocationPerPaycheck(billLikes);

    let upcomingBeforePayday: string[] = [];
    let reservedThisPeriod = 0;
    if (settings?.knownPayday) {
      const period = periodFor(today, settings.knownPayday, settings.payFrequencyDays);
      upcomingBeforePayday = bills
        .filter((b) => b.isActive && b.nextDueDate >= today && b.nextDueDate < period.nextPayday)
        .map((b) => b.id);
      const received = receivedPaychecksInRange(period.start, period.end);
      reservedThisPeriod = perPaycheck * received.length;
    }

    return ok({
      bills,
      stats: {
        annualTotal: annualBillTotal(billLikes),
        monthlyEstimate: monthlyBillEstimate(billLikes),
        perPaycheck,
        reservedThisPeriod,
        upcomingBeforePayday,
      },
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, billInput);
    return ok(createBill(input), { status: 201 });
  });
}
