import { handle, ok, parseBody } from "@/lib/api-helpers";
import { createCategory, listCategories } from "@/lib/repositories/categories";
import { categoryInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(() => ok(listCategories()));
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, categoryInput);
    return ok(createCategory(input), { status: 201 });
  });
}
