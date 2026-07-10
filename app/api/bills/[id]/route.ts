import { handle, notFound, ok, parseBody } from "@/lib/api-helpers";
import { deleteBill, getBill, updateBill } from "@/lib/repositories/bills";
import { billInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!getBill(params.id)) return notFound("Bill not found");
    const input = await parseBody(request, billInput.partial());
    return ok(updateBill(params.id, input));
  });
}

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(() => {
    if (!getBill(params.id)) return notFound("Bill not found");
    deleteBill(params.id);
    return ok({ deleted: true });
  });
}
