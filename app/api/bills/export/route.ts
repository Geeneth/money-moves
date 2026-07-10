import { NextResponse } from "next/server";
import { handle } from "@/lib/api-helpers";
import { centsToCsvAmount, toCsv } from "@/lib/exports/csv";
import { todayISO } from "@/lib/formatting/dates";
import { listBills } from "@/lib/repositories/bills";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(() => {
    const rows = listBills();
    const csv = toCsv(
      ["Name", "Category", "Amount", "Frequency", "Next Due Date", "Auto-pay", "Active", "Notes"],
      rows.map((b) => [
        b.name,
        b.categoryName ?? "",
        centsToCsvAmount(b.amount),
        b.frequency,
        b.nextDueDate,
        b.isAutoPay ? "yes" : "no",
        b.isActive ? "yes" : "no",
        b.notes ?? "",
      ])
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bills-${todayISO()}.csv"`,
      },
    });
  });
}
