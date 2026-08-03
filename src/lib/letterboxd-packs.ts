import "server-only";
import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { listPacks } from "@/db/schema";
import { searchMovies, type TmdbSearchResult } from "@/lib/tmdb";
import {
  fetchListFilms,
  fetchPopularLists,
  type LetterboxdListRef,
  type ScrapedFilm,
} from "@/lib/letterboxd";
import {
  dedupe,
  materializePack,
  type PackItemSnapshot,
  type RefreshSummary,
} from "@/lib/packs";

const MAX_LISTS = 3;
const MAX_ITEMS = 24;
/** Only the first N scraped films are matched — keeps TMDB traffic bounded. */
const MAX_FILMS_TO_MATCH = 40;
/** Below this many matches the pack isn't published (skeleton packs look broken). */
const MIN_MATCHES = 6;
const CONCURRENCY = 6;
/** User-visible slugs are source-neutral by design — no "letterboxd" in URLs. */
const SLUG_PREFIX = "community-";
const SLUG_MAX = 80;

/**
 * Some trending lists carry the brand in their own name (e.g. "Letterboxd's
 * Top 500 Films"). Strip it so titles and URLs stay source-neutral.
 */
function sanitizeListName(name: string): string {
  return name
    .replace(/letterboxd(?:['’]s)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeListSlug(listSlug: string): string {
  return listSlug
    .replace(/(^|-)letterboxds?(?=-|$)/g, "$1")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function packSlug(listSlug: string): string {
  return `${SLUG_PREFIX}${sanitizeListSlug(listSlug)}`
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

/** Lowercase, strip diacritics and punctuation, collapse whitespace. */
function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resultYear(r: TmdbSearchResult): number | null {
  const y = Number.parseInt((r.release_date || "").slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

/**
 * Pick the best TMDB candidate: needs a poster and a minimal vote floor
 * (Letterboxd lists skew niche, so no MIN_VOTES=40 gate here), preferring an
 * exact normalized title match, then higher vote counts.
 */
function bestCandidate(
  results: TmdbSearchResult[],
  film: ScrapedFilm,
): TmdbSearchResult | null {
  const target = normalizeTitle(film.name);
  const usable = results.filter(
    (r) => !!r.poster_path && (r.vote_count ?? 0) >= 5,
  );
  if (usable.length === 0) return null;
  const score = (r: TmdbSearchResult) =>
    (normalizeTitle(r.title) === target ? 1_000_000 : 0) + (r.vote_count ?? 0);
  return usable.reduce((a, b) => (score(b) > score(a) ? b : a));
}

async function matchFilmToTmdb(
  film: ScrapedFilm,
): Promise<PackItemSnapshot | null> {
  try {
    let results: TmdbSearchResult[] = [];
    if (film.year) {
      const withYear = await searchMovies(film.name, 1, {
        primaryReleaseYear: film.year,
      });
      results = withYear.results ?? [];
    }
    if (results.length === 0) {
      const noYear = await searchMovies(film.name);
      results = (noYear.results ?? []).filter(
        // Tolerate ±1 year drift (festival vs. wide-release dates).
        (r) => {
          if (!film.year) return true;
          const y = resultYear(r);
          return y !== null && Math.abs(y - film.year) <= 1;
        },
      );
    }
    const best = bestCandidate(results, film);
    if (!best) return null;
    return {
      tmdbId: best.id,
      title: best.title,
      posterPath: best.poster_path,
      releaseDate: best.release_date || null,
    };
  } catch {
    return null;
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    },
  );
  await Promise.all(workers);
  return out;
}

async function buildListItems(
  ref: LetterboxdListRef,
): Promise<PackItemSnapshot[] | null> {
  const { films, degraded } = await fetchListFilms(ref);
  if (degraded) return null;
  const matched = await mapWithConcurrency(
    films.slice(0, MAX_FILMS_TO_MATCH),
    CONCURRENCY,
    matchFilmToTmdb,
  );
  const items = dedupe(
    matched.filter((m): m is PackItemSnapshot => m !== null),
  ).slice(0, MAX_ITEMS);
  return items.length >= MIN_MATCHES ? items : null;
}

export type LetterboxdRefreshResult = {
  summaries: RefreshSummary[];
  degraded: boolean;
};

/**
 * Scrape Letterboxd's "Popular this week" lists and materialize each as a
 * pack. Failure-safe by construction:
 * - Index scrape fails → return degraded, touch nothing (last week survives).
 * - One list fails or matches too few films → skip it; if it already exists
 *   it keeps its previous items and is NOT deactivated.
 * - Lists that dropped out of the trending set are deactivated (not deleted),
 *   so their URLs keep rendering from snapshots.
 */
export async function refreshLetterboxdPacks(): Promise<LetterboxdRefreshResult> {
  const { lists, degraded } = await fetchPopularLists(MAX_LISTS);
  if (degraded || lists.length === 0) {
    return { summaries: [], degraded: true };
  }

  const summaries: RefreshSummary[] = [];
  const currentSlugs: string[] = [];
  let anyDegraded = false;

  for (const [index, ref] of lists.entries()) {
    const slug = packSlug(ref.listSlug);
    if (currentSlugs.includes(slug)) continue; // truncation collision
    currentSlugs.push(slug);

    const items = await buildListItems(ref);
    if (!items) {
      anyDegraded = true;
      summaries.push({ slug, count: 0, newCount: 0, degraded: true });
      continue;
    }

    const name =
      sanitizeListName(ref.name) ||
      slug
        .slice(SLUG_PREFIX.length)
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    try {
      summaries.push(
        await materializePack(
          {
            slug,
            title: name,
            // The title says it all — a templated subtitle adds nothing.
            description: "",
            kind: "community",
            refreshStrategy: "weekly",
            sortOrder: 100 + index,
            sourceConfig: {
              sourceUrl: ref.url,
              letterboxdSlug: ref.listSlug,
              curator: ref.user,
            },
          },
          { items, degraded: false },
        ),
      );
    } catch (err) {
      console.error(`letterboxd pack refresh failed: ${slug}`, err);
      anyDegraded = true;
      summaries.push({ slug, count: 0, newCount: 0, degraded: true });
    }
  }

  // Rotation: only reached after a successful index scrape, and currentSlugs
  // includes every list seen this week (materialized or not), so a transient
  // per-list failure never deactivates an existing pack.
  await db
    .update(listPacks)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(listPacks.kind, "community"),
        notInArray(listPacks.slug, currentSlugs),
      ),
    );

  return { summaries, degraded: anyDegraded };
}
