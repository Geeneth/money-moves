import { handle, notFound, ok, parseBody } from "@/lib/api-helpers";
import {
  deleteTransaction,
  getTransaction,
  updateTransaction,
} from "@/lib/repositories/transactions";
import { transactionInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!getTransaction(params.id)) return notFound("Transaction not found");
    const input = await parseBody(request, transactionInput);
    return ok(updateTransaction(params.id, input));
  });
}

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(() => {
    if (!getTransaction(params.id)) return notFound("Transaction not found");
    deleteTransaction(params.id);
    return ok({ deleted: true });
  });
}
