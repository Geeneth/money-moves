import { handle, ok, parseBody } from "@/lib/api-helpers";
import { deleteCategory, updateCategory } from "@/lib/repositories/categories";
import { categoryInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface Params {
  params: { id: string };
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, categoryInput);
    return ok(updateCategory(params.id, input));
  });
}

export async function DELETE(_request: Request, { params }: Params): Promise<Response> {
  return handle(() => {
    deleteCategory(params.id);
    return ok({ deleted: true });
  });
}
