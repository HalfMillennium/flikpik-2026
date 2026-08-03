import Link from "next/link";
import type { Metadata } from "next";
import { getAllLists } from "@/lib/content";
import { resolveListMovies } from "@/lib/list-movies";
import {
  attachPosterPaths,
  freshness,
  getActivePacks,
  type PackPreview,
  type PackSummary,
} from "@/lib/packs";
import { posterUrl } from "@/lib/images";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Movie lists built to swipe with a group",
  description:
    "Curated and auto-updating movie lists for groups with different tastes. Load one into a session and let everyone vote — no account needed.",
  alternates: { canonical: `${SITE_URL}/lists` },
};

// Auto-updating packs come from the DB; keep the index fresh with ISR.
export const revalidate = 3600;

const POSTERS_PER_CARD = 5;

function PosterStrip({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;
  return (
    <div className="mb-4 flex items-end pl-2">
      {paths.map((path, i) => (
        <div
          key={path}
          className="-ml-2 aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md border border-[var(--color-line)] bg-[var(--color-paper-tint)] shadow-md sm:w-[72px]"
          style={{ zIndex: paths.length - i }}
        >
          <img
            src={posterUrl(path, "w185")}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function PackCard({ pack }: { pack: PackPreview }) {
  return (
    <Link
      href={`/lists/${pack.slug}`}
      className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
    >
      <PosterStrip paths={pack.posterPaths} />
      <div className="flex items-center justify-between gap-3">
        <h3 className="type-title">{pack.title}</h3>
        <span className="shrink-0 rounded-full bg-[var(--color-red-tint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-red-deep)]">
          {pack.itemCount} movies
        </span>
      </div>
      {pack.description && (
        <p className="mt-2 text-[var(--color-ink-soft)]">{pack.description}</p>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[var(--color-red)]">
        <span
          className="pulse-dot inline-block h-2 w-2 rounded-full"
          style={{ background: "var(--color-red)" }}
        />
        {freshness(pack)}
      </p>
    </Link>
  );
}

export default async function ListsIndex() {
  const [lists, allPacks] = await Promise.all([
    getAllLists(),
    // Best-effort — a DB hiccup shouldn't break the page.
    getActivePacks()
      .then((packs) => attachPosterPaths(packs, POSTERS_PER_CARD))
      .catch((e) => {
        console.error("[lists] getActivePacks failed:", e);
        return [] as PackPreview[];
      }),
  ]);

  // Editorial lists store bare tmdbIds; resolve the first few posters for the
  // preview strip (fetches are cached, and failures just drop the strip).
  const listPreviews = await Promise.all(
    lists.map(async (l) => ({
      list: l,
      posterPaths: (await resolveListMovies(l.movies.slice(0, POSTERS_PER_CARD)))
        .map((m) => m.posterPath)
        .filter((p): p is string => p !== null),
    })),
  );

  const packs = allPacks.filter((p) => p.kind !== "community");
  const communityPacks = allPacks.filter((p) => p.kind === "community");

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
              <PackCard key={p.slug} pack={p} />
            ))}
          </div>
        </section>
      )}

      {communityPacks.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            Community favorites this week
          </h2>
          <div className="space-y-4">
            {communityPacks.map((p) => (
              <PackCard key={p.slug} pack={p} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        {allPacks.length > 0 && (
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            Evergreen picks
          </h2>
        )}
        <div className="space-y-4">
          {listPreviews.map(({ list: l, posterPaths }) => (
            <Link
              key={l.slug}
              href={`/lists/${l.slug}`}
              className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
            >
              <PosterStrip paths={posterPaths} />
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
