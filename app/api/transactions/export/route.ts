import { NextResponse } from "next/server";
import { handle } from "@/lib/api-helpers";
import { centsToCsvAmount, toCsv } from "@/lib/exports/csv";
import { listTransactions } from "@/lib/repositories/transactions";
import { todayISO } from "@/lib/formatting/dates";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle(() => {
    const url = new URL(request.url);
    const p = url.searchParams;
    const rows = listTransactions({
      from: p.get("from") ?? undefined,
      to: p.get("to") ?? undefined,
      categoryId: p.get("categoryId") ?? undefined,
      type: p.get("type") ?? undefined,
      paymentMethod: p.get("paymentMethod") ?? undefined,
      search: p.get("search") ?? undefined,
    });
    const csv = toCsv(
      ["Date", "Description", "Category", "Type", "Payment Method", "Amount", "Notes"],
      rows.map((t) => [
        t.date,
        t.description,
        t.categoryName ?? "",
        t.type,
        t.paymentMethod,
        centsToCsvAmount(t.amount),
        t.notes ?? "",
      ])
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="transactions-${todayISO()}.csv"`,
      },
    });
  });
}
