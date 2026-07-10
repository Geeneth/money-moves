import { handle, ok, parseBody } from "@/lib/api-helpers";
import { createTransaction, listTransactions } from "@/lib/repositories/transactions";
import { transactionInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle(() => {
    const url = new URL(request.url);
    const p = url.searchParams;
    return ok(
      listTransactions({
        from: p.get("from") ?? undefined,
        to: p.get("to") ?? undefined,
        categoryId: p.get("categoryId") ?? undefined,
        type: p.get("type") ?? undefined,
        paymentMethod: p.get("paymentMethod") ?? undefined,
        search: p.get("search") ?? undefined,
      })
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, transactionInput);
    return ok(createTransaction(input), { status: 201 });
  });
}
