import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ data }, init);
}

export function badRequest(message: string, details?: unknown): NextResponse {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}

/** Parse + validate a JSON body. Throws a NextResponse-shaped error object on failure. */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T, ZodTypeDef, unknown>
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      throw badRequest("Validation failed", err.flatten());
    }
    throw err;
  }
}

/** Wrap a handler so thrown NextResponses are returned and other errors become 500s. */
export async function handle(fn: () => Promise<NextResponse> | NextResponse): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof NextResponse) return err;
    console.error(err);
    return serverError(err);
  }
}
