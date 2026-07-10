import { handle, notFound, ok, parseBody } from "@/lib/api-helpers";
import { deleteGoal, getGoal, updateGoal } from "@/lib/repositories/savings";
import { savingsGoalInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    if (!getGoal(params.id)) return notFound("Goal not found");
    const input = await parseBody(request, savingsGoalInput.partial());
    return ok(updateGoal(params.id, input));
  });
}

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(() => {
    if (!getGoal(params.id)) return notFound("Goal not found");
    deleteGoal(params.id);
    return ok({ deleted: true });
  });
}
