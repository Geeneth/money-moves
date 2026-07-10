import { badRequest, handle, notFound, ok, parseBody } from "@/lib/api-helpers";
import {
  deletePaycheck,
  getPaycheck,
  updatePaycheck,
} from "@/lib/repositories/paychecks";
import { paycheckInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!getPaycheck(params.id)) return notFound("Paycheck not found");
    const input = await parseBody(request, paycheckInput.partial());
    return ok(updatePaycheck(params.id, input));
  });
}

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(() => {
    const paycheck = getPaycheck(params.id);
    if (!paycheck) return notFound("Paycheck not found");
    if (!paycheck.isManual) {
      return badRequest(
        "Schedule-generated paychecks can't be deleted. Change the pay schedule in Settings instead."
      );
    }
    deletePaycheck(params.id);
    return ok({ deleted: true });
  });
}
