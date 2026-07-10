import { NextResponse } from "next/server";
import { badRequest, handle, ok } from "@/lib/api-helpers";
import { importBackup, summarizeBackup } from "@/lib/backup/backup";
import { backupFile } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * POST with ?mode=preview  -> validate the file and return a summary only.
 * POST with ?mode=confirm  -> write a safety backup, wipe, and import.
 */
export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const mode = new URL(request.url).searchParams.get("mode") ?? "preview";
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return badRequest("The selected file is not valid JSON");
    }
    const parsed = backupFile.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "This file is not a valid Money Moves backup (or uses an unsupported version). No data was changed.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }
    if (mode === "preview") {
      return ok({ valid: true, summary: summarizeBackup(parsed.data) });
    }
    const { safetyBackupPath } = importBackup(parsed.data);
    return ok({ imported: true, safetyBackupPath });
  });
}
