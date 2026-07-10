import { handle, notFound, ok, parseBody } from "@/lib/api-helpers";
import { getBill, payBill } from "@/lib/repositories/bills";
import { billPayInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!getBill(params.id)) return notFound("Bill not found");
    const input = await parseBody(request, billPayInput);
    return ok(payBill(params.id, input), { status: 201 });
  });
}
