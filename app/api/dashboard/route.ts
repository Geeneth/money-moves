import { handle, ok } from "@/lib/api-helpers";
import { getDashboardData } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(() => ok(getDashboardData()));
}
