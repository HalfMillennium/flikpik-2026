import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export type SessionUser = { id: string; username: string };

/**
 * Guard for API route handlers: ensures a session and applies a per-user
 * rate limit. Returns either the user or a ready-to-return error response.
 */
export async function requireUser(
  bucket = "default",
): Promise<
  { user: SessionUser; error?: never } | { user?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const ok = rateLimit(`${session.user.id}:${bucket}`);
  if (!ok) {
    return {
      error: NextResponse.json(
        { error: "Too many requests. Slow down." },
        { status: 429 },
      ),
    };
  }

  return { user: { id: session.user.id, username: session.user.username } };
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Something went wrong") {
  return NextResponse.json({ error: message }, { status: 500 });
}
