import { NextResponse } from "next/server";
import { handle } from "@/lib/api-helpers";
import { exportBackup } from "@/lib/backup/backup";
import { todayISO } from "@/lib/formatting/dates";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(() => {
    const backup = exportBackup();
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="money-moves-backup-${todayISO()}.json"`,
      },
    });
  });
}
