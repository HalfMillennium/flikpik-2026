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

/**
 * Rate limit keyed by the session user when present, otherwise by client IP.
 * Used by endpoints that guests (no account) are allowed to hit.
 */
export async function limitByUserOrIp(
  req: Request,
  bucket = "public",
): Promise<{ ok: true } | { error: NextResponse }> {
  const session = await auth();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anon";
  const key = session?.user?.id
    ? `${session.user.id}:${bucket}`
    : `ip:${ip}:${bucket}`;

  if (!rateLimit(key)) {
    return {
      error: NextResponse.json(
        { error: "Too many requests. Slow down." },
        { status: 429 },
      ),
    };
  }
  return { ok: true };
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
