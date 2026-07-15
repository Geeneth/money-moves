import { handle, ok, parseBody } from "@/lib/api-helpers";
import { parseTransactionsWithAI } from "@/lib/ai/transaction-parser";
import { listCategories } from "@/lib/repositories/categories";
import { transactionParseInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, transactionParseInput);
    return ok(await parseTransactionsWithAI(input, listCategories()));
  });
}
