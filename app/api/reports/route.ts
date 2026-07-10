import { handle, ok } from "@/lib/api-helpers";
import { getReportsData, resolveReportRange } from "@/lib/services/reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle(() => {
    const url = new URL(request.url);
    const preset = url.searchParams.get("preset") ?? "current_period";
    const { from, to } = resolveReportRange(
      preset,
      url.searchParams.get("from") ?? undefined,
      url.searchParams.get("to") ?? undefined
    );
    return ok(getReportsData(from, to));
  });
}
