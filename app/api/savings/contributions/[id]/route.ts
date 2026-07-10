import { handle, ok } from "@/lib/api-helpers";
import { deleteContribution } from "@/lib/repositories/savings";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(() => {
    deleteContribution(params.id);
    return ok({ deleted: true });
  });
}
