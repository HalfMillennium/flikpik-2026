/**
 * Manual pack refresh — `npm run packs:refresh`.
 *
 * Calls the app's cron endpoint (the canonical refresh path — it runs inside
 * Next, where the server-only TMDB/Trends modules work). Point it at a running
 * dev server or your deployment.
 *
 * Needs CRON_SECRET in .env.local. Target URL comes from REFRESH_URL, else
 * NEXT_PUBLIC_SITE_URL, else http://localhost:3000. First run: start the app
 * (`npm run dev`), then `npm run packs:refresh`.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error("CRON_SECRET missing (set it in .env.local)");

  const base =
    process.env.REFRESH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/api/cron/refresh-packs`;

  console.log(`🎬 Refreshing packs via ${url} …`);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const data = (await res.json().catch(() => ({}))) as {
    refreshed?: { slug: string; count: number; newCount: number; degraded: boolean }[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(`${res.status} ${data.error ?? "refresh failed"}`);
  }
  for (const s of data.refreshed ?? []) {
    console.log(
      `  · ${s.slug}: ${s.count} movies (${s.newCount} new)` +
        (s.degraded ? " [degraded → TMDB fallback]" : ""),
    );
  }
  console.log("✅ Done.");
}

main().catch((err) => {
  console.error("Refresh failed:", err.message ?? err);
  process.exit(1);
});
