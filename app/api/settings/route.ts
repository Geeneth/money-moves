import { handle, ok, parseBody } from "@/lib/api-helpers";
import { getSettings, updateSettings } from "@/lib/repositories/settings";
import { reassignAllTransactionPeriods } from "@/lib/repositories/transactions";
import { settingsInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(() => ok(getSettings()));
}

export async function PUT(request: Request): Promise<Response> {
  return handle(async () => {
    const before = getSettings();
    const input = await parseBody(request, settingsInput.partial());
    const updated = updateSettings(input);
    // If the pay schedule changed, transactions must be re-bucketed.
    if (
      before &&
      ((input.knownPayday && input.knownPayday !== before.knownPayday) ||
        (input.payFrequencyDays && input.payFrequencyDays !== before.payFrequencyDays))
    ) {
      reassignAllTransactionPeriods();
    }
    return ok(updated);
  });
}
