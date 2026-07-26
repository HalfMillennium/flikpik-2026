import { NextResponse } from "next/server";
import { refreshAllAutoPacks } from "@/lib/packs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refreshes all auto-updating list packs. Driven by an external scheduler
 * (Vercel Cron or GitHub Actions) because Neon pg_cron can't make the TMDB /
 * Google Trends HTTP calls this needs.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. A `?key=`
 * query param is accepted as a fallback for other schedulers.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const key = new URL(req.url).searchParams.get("key");
  return key === secret;
}

async function run(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const refreshed = await refreshAllAutoPacks();
    return NextResponse.json({ ok: true, refreshed });
  } catch (err) {
    console.error("refresh-packs error", err);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
