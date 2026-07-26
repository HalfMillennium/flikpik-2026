import Link from "next/link";
import type { Metadata } from "next";
import { getAllLists } from "@/lib/content";
import { getActivePacks, type PackSummary } from "@/lib/packs";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Movie lists built to swipe with a group",
  description:
    "Curated and auto-updating movie lists for groups with different tastes. Load one into a session and let everyone vote — no account needed.",
  alternates: { canonical: `${SITE_URL}/lists` },
};

// Auto-updating packs come from the DB; keep the index fresh with ISR.
export const revalidate = 3600;

function freshness(p: PackSummary): string {
  const cadence = p.refreshStrategy === "daily" ? "daily" : "weekly";
  if (p.degraded || p.newCount <= 0) return `Refreshed ${cadence}`;
  return `Refreshed ${cadence} · ${p.newCount} new`;
}

export default async function ListsIndex() {
  const [lists, packs] = await Promise.all([
    getAllLists(),
    // Best-effort — a DB hiccup shouldn't break the page.
    getActivePacks().catch((e) => {
      console.error("[lists] getActivePacks failed:", e);
      return [] as PackSummary[];
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
        Ready-made packs
      </p>
      <h1 className="type-hero mt-2">Lists you swipe, not just read.</h1>
      <p className="mt-4 max-w-xl text-lg text-[var(--color-ink-soft)]">
        Each pack is built for a real situation and a room full of different
        tastes. Load one into a session and settle it in ninety seconds.
      </p>

      {packs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            Fresh this week
          </h2>
          <div className="space-y-4">
            {packs.map((p) => (
              <Link
                key={p.slug}
                href={`/lists/${p.slug}`}
                className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="type-title">{p.title}</h3>
                  <span className="shrink-0 rounded-full bg-[var(--color-red-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-red-deep)]">
                    {p.itemCount} movies
                  </span>
                </div>
                <p className="mt-2 text-[var(--color-ink-soft)]">{p.description}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--color-red)]">
                  <span
                    className="pulse-dot inline-block h-2 w-2 rounded-full"
                    style={{ background: "var(--color-red)" }}
                  />
                  {freshness(p)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        {packs.length > 0 && (
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            Evergreen picks
          </h2>
        )}
        <div className="space-y-4">
          {lists.map((l) => (
            <Link
              key={l.slug}
              href={`/lists/${l.slug}`}
              className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="type-title">{l.title}</h3>
                <span className="shrink-0 rounded-full bg-[var(--color-red-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-red-deep)]">
                  {l.movies.length} movies
                </span>
              </div>
              <p className="mt-2 text-[var(--color-ink-soft)]">{l.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
