import { handle, ok } from "@/lib/api-helpers";
import { backupDatabaseFile } from "@/lib/database/client";

export const dynamic = "force-dynamic";

/** Create a point-in-time copy of budget.db in data/backups/ (safe during writes). */
export async function POST(): Promise<Response> {
  return handle(async () => {
    const path = await backupDatabaseFile();
    return ok({ path });
  });
}
