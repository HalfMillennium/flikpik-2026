import Link from "next/link";
import type { Metadata } from "next";
import { getAllLists } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Movie lists built to swipe with a group",
  description:
    "Curated, low-veto movie lists for groups with different tastes. Load one into a session and let everyone vote — no account needed.",
  alternates: { canonical: `${SITE_URL}/lists` },
};

export default async function ListsIndex() {
  const lists = await getAllLists();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
        Ready-made lists
      </p>
      <h1 className="type-hero mt-2">Lists you swipe, not just read.</h1>
      <p className="mt-4 max-w-xl text-lg text-[var(--color-ink-soft)]">
        Each list is built for a real situation and a room full of different
        tastes. Load one into a session and settle it in ninety seconds.
      </p>

      <div className="mt-10 space-y-4">
        {lists.map((l) => (
          <Link
            key={l.slug}
            href={`/lists/${l.slug}`}
            className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="type-title">{l.title}</h2>
              <span className="shrink-0 rounded-full bg-[var(--color-red-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-red-deep)]">
                {l.movies.length} movies
              </span>
            </div>
            <p className="mt-2 text-[var(--color-ink-soft)]">{l.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
