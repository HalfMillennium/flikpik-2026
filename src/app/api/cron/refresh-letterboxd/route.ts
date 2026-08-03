import { NextResponse } from "next/server";
import { refreshLetterboxdPacks } from "@/lib/letterboxd-packs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Refreshes the community packs sourced from Letterboxd's "Popular this week"
 * lists. Separate from /api/cron/refresh-packs so the scrape gets its own
 * timeout budget and failures stay isolated.
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
    const { summaries, degraded } = await refreshLetterboxdPacks();
    return NextResponse.json({ ok: true, degraded, refreshed: summaries });
  } catch (err) {
    console.error("refresh-letterboxd error", err);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
