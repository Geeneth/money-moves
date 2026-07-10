import { handle, ok, parseBody } from "@/lib/api-helpers";
import { createGoal, listGoals } from "@/lib/repositories/savings";
import { savingsGoalInput } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle(() => ok(listGoals()));
}

export async function POST(request: Request): Promise<Response> {
  return handle(async () => {
    const input = await parseBody(request, savingsGoalInput);
    return ok(createGoal(input), { status: 201 });
  });
}
