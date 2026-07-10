import { handle, ok } from "@/lib/api-helpers";
import { deleteAllData, writeSafetyBackup } from "@/lib/backup/backup";

export const dynamic = "force-dynamic";

/** Wipe all data. A safety JSON backup is written to data/backups/ first. */
export async function POST(): Promise<Response> {
  return handle(() => {
    const safetyBackupPath = writeSafetyBackup("pre-reset");
    deleteAllData();
    return ok({ reset: true, safetyBackupPath });
  });
}
