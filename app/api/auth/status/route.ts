import { handle, ok } from "@/lib/api-helpers";
import { isPasswordSet } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(async () => ok({ passwordSet: await isPasswordSet() }));
}
