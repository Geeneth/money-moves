import { z } from "zod";
import { handle, ok, badRequest, parseBody } from "@/lib/api-helpers";
import { verifyPassword } from "@/lib/auth";

const schema = z.object({ password: z.string().min(1) });

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const { password } = await parseBody(request, schema);
    const valid = await verifyPassword(password);
    if (!valid) throw badRequest("Incorrect password");
    return ok({ success: true });
  });
}
