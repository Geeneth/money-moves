import { badRequest, handle, ok } from "@/lib/api-helpers";
import { loadSampleData } from "@/lib/database/sample-data";
import { getSettings } from "@/lib/repositories/settings";
import { listTransactions } from "@/lib/repositories/transactions";

export const dynamic = "force-dynamic";

/**
 * Load sample data. Refuses when transactions already exist so sample data
 * never silently mixes with real data — reset first, or pass ?force=1.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(() => {
    if (!getSettings()) return badRequest("Set up the app before loading sample data");
    const force = new URL(request.url).searchParams.get("force") === "1";
    if (!force && listTransactions({}).length > 0) {
      return badRequest(
        "You already have transactions. Reset all data first (Settings → Danger Zone) to avoid mixing sample data with real data."
      );
    }
    loadSampleData();
    return ok({ loaded: true });
  });
}
