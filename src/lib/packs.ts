import "server-only";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { listPacks, listPackItems, listPackHistory } from "@/db/schema";
import {
  getTrending,
  getNowPlaying,
  getPopular,
  searchMovies,
  type TmdbSearchResult,
} from "@/lib/tmdb";
import { getDailyTrends } from "@/lib/google-trends";

const PACK_LIMIT = 24;
const MIN_VOTES = 40;

export type PackKind =
  | "trending"
  | "now_playing"
  | "popular"
  | "search_trends"
  | "seasonal"
  | "mood";

export type PackItemSnapshot = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
};

type BuildResult = { items: PackItemSnapshot[]; degraded: boolean };

export type PackDef = {
  slug: string;
  title: string;
  description: string;
  kind: PackKind;
  refreshStrategy: "weekly" | "daily" | "manual";
  sortOrder: number;
  build: () => Promise<BuildResult>;
};

// ── helpers ──────────────────────────────────────────────────────────────
function snapshot(r: TmdbSearchResult): PackItemSnapshot {
  return {
    tmdbId: r.id,
    title: r.title,
    posterPath: r.poster_path,
    releaseDate: r.release_date || null,
  };
}

function usable(r: TmdbSearchResult, minVotes = MIN_VOTES): boolean {
  return !!r.poster_path && (r.vote_count ?? 0) >= minVotes;
}

function dedupe(items: PackItemSnapshot[]): PackItemSnapshot[] {
  const seen = new Set<number>();
  const out: PackItemSnapshot[] = [];
  for (const it of items) {
    if (seen.has(it.tmdbId)) continue;
    seen.add(it.tmdbId);
    out.push(it);
  }
  return out;
}

async function fromTmdbTrending(): Promise<BuildResult> {
  const data = await getTrending("week");
  const items = dedupe(
    (data.results ?? []).filter((r) => usable(r)).map(snapshot),
  ).slice(0, PACK_LIMIT);
  return { items, degraded: false };
}

/**
 * Google Trends RSS → matched to TMDB. Best-effort: if the feed is degraded or
 * yields no movie matches, fall back to TMDB trending so the pack is never
 * empty — and mark it degraded (richer than "show nothing").
 */
async function fromSearchTrends(): Promise<BuildResult> {
  const { terms, degraded } = await getDailyTrends("US");
  if (!degraded && terms.length) {
    const searches = await Promise.allSettled(
      terms.slice(0, 20).map((t) => searchMovies(t.query)),
    );
    const matched: PackItemSnapshot[] = [];
    for (const s of searches) {
      if (s.status !== "fulfilled") continue;
      const top = (s.value.results ?? []).find((r) => usable(r, 20));
      if (top) matched.push(snapshot(top));
    }
    const items = dedupe(matched).slice(0, PACK_LIMIT);
    if (items.length >= 6) return { items, degraded: false };
  }
  // Fallback: trending is a fine stand-in for "what's hot right now".
  const fallback = await fromTmdbTrending();
  return { items: fallback.items, degraded: true };
}

// ── registry (packs live in code, are populated by cron/first-run) ─────────
export const PACK_REGISTRY: PackDef[] = [
  {
    slug: "trending-this-week",
    title: "Trending This Week",
    description:
      "What everyone's watching right now, straight from TMDB. Refreshed weekly.",
    kind: "trending",
    refreshStrategy: "weekly",
    sortOrder: 0,
    build: fromTmdbTrending,
  },
  {
    slug: "in-theaters-now",
    title: "In Theaters Now",
    description: "Currently on the big screen — settle the group before you go.",
    kind: "now_playing",
    refreshStrategy: "weekly",
    sortOrder: 1,
    build: async () => {
      const data = await getNowPlaying();
      const items = dedupe(
        (data.results ?? []).filter((r) => usable(r, 20)).map(snapshot),
      ).slice(0, PACK_LIMIT);
      return { items, degraded: false };
    },
  },
  {
    slug: "trending-in-search",
    title: "Trending in Search",
    description:
      "Movies breaking out in Google search this week — a velocity signal on top of the charts.",
    kind: "search_trends",
    refreshStrategy: "weekly",
    sortOrder: 2,
    build: fromSearchTrends,
  },
  {
    slug: "crowd-pleasers",
    title: "All-Time Crowd-Pleasers",
    description: "The highest-voted films almost any group will sit through.",
    kind: "popular",
    refreshStrategy: "weekly",
    sortOrder: 3,
    build: async () => {
      const data = await getPopular();
      const items = dedupe(
        (data.results ?? []).filter((r) => usable(r, 500)).map(snapshot),
      ).slice(0, PACK_LIMIT);
      return { items, degraded: false };
    },
  },
];

export function getPackDef(slug: string): PackDef | undefined {
  return PACK_REGISTRY.find((p) => p.slug === slug);
}

// ── refresh ────────────────────────────────────────────────────────────────
export type RefreshSummary = {
  slug: string;
  count: number;
  newCount: number;
  degraded: boolean;
};

export async function refreshPack(def: PackDef): Promise<RefreshSummary> {
  const built = await def.build();

  // Ensure the pack row exists (declared in code, kept in sync here).
  const [pack] = await db
    .insert(listPacks)
    .values({
      slug: def.slug,
      title: def.title,
      description: def.description,
      kind: def.kind,
      refreshStrategy: def.refreshStrategy,
      sortOrder: def.sortOrder,
    })
    .onConflictDoUpdate({
      target: listPacks.slug,
      set: {
        title: def.title,
        description: def.description,
        kind: def.kind,
        refreshStrategy: def.refreshStrategy,
        sortOrder: def.sortOrder,
        updatedAt: new Date(),
      },
    })
    .returning();

  const existing = await db
    .select({ tmdbId: listPackItems.tmdbId })
    .from(listPackItems)
    .where(eq(listPackItems.packId, pack.id));
  const existingSet = new Set(existing.map((e) => e.tmdbId));
  const newCount = built.items.filter((i) => !existingSet.has(i.tmdbId)).length;

  // Replace items with the fresh snapshot.
  await db.delete(listPackItems).where(eq(listPackItems.packId, pack.id));
  if (built.items.length) {
    await db.insert(listPackItems).values(
      built.items.map((it, i) => ({
        packId: pack.id,
        tmdbId: it.tmdbId,
        position: i,
        title: it.title,
        posterPath: it.posterPath,
        releaseDate: it.releaseDate,
      })),
    );
  }

  const version = pack.version + 1;
  await db
    .update(listPacks)
    .set({
      version,
      newCount,
      degraded: built.degraded,
      refreshedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(listPacks.id, pack.id));

  await db.insert(listPackHistory).values({
    packId: pack.id,
    version,
    itemsJson: built.items.map((i) => i.tmdbId),
  });

  return {
    slug: def.slug,
    count: built.items.length,
    newCount,
    degraded: built.degraded,
  };
}

export async function refreshAllAutoPacks(): Promise<RefreshSummary[]> {
  const summaries: RefreshSummary[] = [];
  for (const def of PACK_REGISTRY) {
    if (def.refreshStrategy === "manual") continue;
    try {
      summaries.push(await refreshPack(def));
    } catch (err) {
      console.error(`pack refresh failed: ${def.slug}`, err);
      summaries.push({ slug: def.slug, count: 0, newCount: 0, degraded: true });
    }
  }
  return summaries;
}

// ── reads (DB only — no external calls) ─────────────────────────────────────
export type PackSummary = {
  slug: string;
  title: string;
  description: string | null;
  kind: string;
  itemCount: number;
  newCount: number;
  degraded: boolean;
  refreshStrategy: string;
  refreshedAt: string | null;
};

export async function getActivePacks(): Promise<PackSummary[]> {
  const rows = await db
    .select({
      slug: listPacks.slug,
      title: listPacks.title,
      description: listPacks.description,
      kind: listPacks.kind,
      newCount: listPacks.newCount,
      degraded: listPacks.degraded,
      refreshStrategy: listPacks.refreshStrategy,
      refreshedAt: listPacks.refreshedAt,
      // Raw identifiers on purpose: interpolating drizzle columns here emits
      // them unqualified, so `id` resolves against the inner table and the
      // count is always 0.
      itemCount: sql<number>`(
        select count(*)::int from list_pack_items
        where list_pack_items.pack_id = list_packs.id
      )`.as("item_count"),
    })
    .from(listPacks)
    .where(eq(listPacks.isActive, true))
    .orderBy(asc(listPacks.sortOrder), desc(listPacks.refreshedAt));

  return rows
    .filter((r) => r.itemCount > 0)
    .map((r) => ({
      ...r,
      refreshedAt: r.refreshedAt ? r.refreshedAt.toISOString() : null,
    }));
}

/** Human-readable refresh cadence line, shared by /lists and the homepage. */
export function freshness(p: Pick<PackSummary, "refreshStrategy" | "degraded" | "newCount">): string {
  const cadence = p.refreshStrategy === "daily" ? "daily" : "weekly";
  if (p.degraded || p.newCount <= 0) return `Refreshed ${cadence}`;
  return `Refreshed ${cadence} · ${p.newCount} new`;
}

export type PackPreview = PackSummary & { posterPaths: string[] };

/**
 * Active packs plus their first few poster paths — for the landing-page
 * showcase. Posters come from the snapshot columns, so no TMDB call. Cached
 * because the homepage is dynamic (auth) and packs only change on refresh.
 */
export const getPackPreviews = unstable_cache(
  async (postersPerPack = 5): Promise<PackPreview[]> => {
    const packs = await getActivePacks();
    if (packs.length === 0) return [];
    const posterRows = await db
      .select({
        slug: listPacks.slug,
        posterPath: listPackItems.posterPath,
      })
      .from(listPackItems)
      .innerJoin(listPacks, eq(listPackItems.packId, listPacks.id))
      .where(
        and(
          inArray(listPacks.slug, packs.map((p) => p.slug)),
          isNotNull(listPackItems.posterPath),
        ),
      )
      .orderBy(asc(listPackItems.position));
    const bySlug = new Map<string, string[]>();
    for (const r of posterRows) {
      const paths = bySlug.get(r.slug) ?? [];
      if (paths.length < postersPerPack && r.posterPath) paths.push(r.posterPath);
      bySlug.set(r.slug, paths);
    }
    return packs.map((p) => ({ ...p, posterPaths: bySlug.get(p.slug) ?? [] }));
  },
  ["pack-previews"],
  { revalidate: 3600 },
);

export type PackDetail = {
  slug: string;
  title: string;
  description: string | null;
  kind: string;
  newCount: number;
  degraded: boolean;
  refreshStrategy: string;
  refreshedAt: string | null;
  items: {
    tmdbId: number;
    title: string;
    posterPath: string | null;
    releaseDate: string | null;
  }[];
};

export type LaunchablePack = {
  slug: string;
  title: string;
  itemCount: number;
  newCount: number;
  degraded: boolean;
  tmdbIds: number[];
};

/** Active packs with their movie ids — for the one-tap in-app launch tiles. */
export async function getLaunchablePacks(): Promise<LaunchablePack[]> {
  const packs = await getActivePacks();
  const detailed = await Promise.all(
    packs.map(async (p) => {
      const d = await getPackBySlug(p.slug);
      if (!d || d.items.length === 0) return null;
      return {
        slug: p.slug,
        title: p.title,
        itemCount: p.itemCount,
        newCount: p.newCount,
        degraded: p.degraded,
        tmdbIds: d.items.map((i) => i.tmdbId),
      };
    }),
  );
  return detailed.filter((p): p is LaunchablePack => p !== null);
}

export async function getPackBySlug(slug: string): Promise<PackDetail | null> {
  const [pack] = await db
    .select()
    .from(listPacks)
    .where(and(eq(listPacks.slug, slug), eq(listPacks.isActive, true)))
    .limit(1);
  if (!pack) return null;

  const items = await db
    .select({
      tmdbId: listPackItems.tmdbId,
      title: listPackItems.title,
      posterPath: listPackItems.posterPath,
      releaseDate: listPackItems.releaseDate,
    })
    .from(listPackItems)
    .where(eq(listPackItems.packId, pack.id))
    .orderBy(asc(listPackItems.position));

  return {
    slug: pack.slug,
    title: pack.title,
    description: pack.description,
    kind: pack.kind,
    newCount: pack.newCount,
    degraded: pack.degraded,
    refreshStrategy: pack.refreshStrategy,
    refreshedAt: pack.refreshedAt ? pack.refreshedAt.toISOString() : null,
    items,
  };
}
