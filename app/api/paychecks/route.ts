import { handle, ok, parseBody } from "@/lib/api-helpers";
import { createPaycheck, listPaychecks } from "@/lib/repositories/paychecks";
import { paycheckInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle(() => {
    const url = new URL(request.url);
    return ok(
      listPaychecks(url.searchParams.get("from") ?? undefined, url.searchParams.get("to") ?? undefined)
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, paycheckInput);
    return ok(createPaycheck(input, true), { status: 201 });
  });
}
