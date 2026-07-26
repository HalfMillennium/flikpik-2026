import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllLists, getList } from "@/lib/content";
import { resolveListMovies } from "@/lib/list-movies";
import { getPackBySlug } from "@/lib/packs";
import { SITE_URL } from "@/lib/site";
import { Markdown } from "@/components/blog/Markdown";
import { ImportListCTA } from "@/components/blog/ImportListCTA";
import { posterUrl } from "@/lib/images";
import { yearOf } from "@/lib/utils";

export const revalidate = 3600;

type ResolvedMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
};

type Resolved = {
  slug: string;
  title: string;
  description: string;
  intro?: string;
  method?: string;
  freshness?: string;
  movies: ResolvedMovie[];
};

/** Resolve a slug to either an editorial file-list or a dynamic DB pack. */
async function resolve(slug: string): Promise<Resolved | null> {
  const list = await getList(slug);
  if (list) {
    return {
      slug: list.slug,
      title: list.title,
      description: list.description,
      intro: list.intro,
      method: list.method,
      movies: await resolveListMovies(list.movies),
    };
  }

  const pack = await getPackBySlug(slug).catch(() => null);
  if (pack) {
    const cadence = pack.refreshStrategy === "daily" ? "daily" : "weekly";
    const freshness =
      pack.degraded || pack.newCount <= 0
        ? `Refreshed ${cadence}`
        : `Refreshed ${cadence} · ${pack.newCount} new this week`;
    return {
      slug: pack.slug,
      title: pack.title,
      description: pack.description ?? "",
      freshness,
      // Items are snapshotted — no TMDB call needed.
      movies: pack.items,
    };
  }
  return null;
}

// File-list slugs prerender; pack slugs render on-demand (ISR) so they always
// reflect the latest refresh.
export async function generateStaticParams() {
  return (await getAllLists()).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const r = await resolve(slug);
  if (!r) return {};
  const url = `${SITE_URL}/lists/${r.slug}`;
  return {
    title: r.title,
    description: r.description,
    alternates: { canonical: url },
    openGraph: { type: "website", title: r.title, description: r.description, url },
  };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await resolve(slug);
  if (!r) notFound();

  const tmdbIds = r.movies.map((m) => m.tmdbId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: r.title,
    description: r.description,
    numberOfItems: r.movies.length,
    itemListElement: r.movies.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Movie",
        name: m.title,
        url: `${SITE_URL}/movies/tmdb/${m.tmdbId}`,
        ...(m.posterPath
          ? { image: `https://image.tmdb.org/t/p/w500${m.posterPath}` }
          : {}),
        ...(m.releaseDate ? { datePublished: m.releaseDate } : {}),
      },
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/lists"
        className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-red)]"
      >
        ← All lists
      </Link>
      <h1 className="type-display mt-4">{r.title}</h1>

      {r.freshness && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-red)]">
          <span
            className="pulse-dot inline-block h-2 w-2 rounded-full"
            style={{ background: "var(--color-red)" }}
          />
          {r.freshness}
        </p>
      )}

      {r.intro ? (
        <div className="mt-4 max-w-2xl">
          <Markdown>{r.intro}</Markdown>
        </div>
      ) : (
        r.description && (
          <p className="mt-3 max-w-2xl text-lg text-[var(--color-ink-soft)]">
            {r.description}
          </p>
        )
      )}

      <div className="mt-8">
        <ImportListCTA tmdbIds={tmdbIds} count={tmdbIds.length} />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        {r.movies.map((m) => (
          <Link
            key={m.tmdbId}
            href={`/movies/tmdb/${m.tmdbId}`}
            className="group block overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-raised)]"
          >
            <div className="relative aspect-[2/3] w-full bg-[var(--color-paper-tint)]">
              <Image
                src={posterUrl(m.posterPath, "w342")}
                alt={`${m.title} poster`}
                fill
                sizes="(max-width: 640px) 50vw, 20vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[var(--color-ink)]/85 to-transparent" />
              {m.releaseDate && (
                <span className="absolute right-2 top-2 rounded-full bg-[var(--color-ink-panel)]/80 px-2 py-0.5 text-xs font-semibold text-[var(--color-paper-on-dark)]">
                  {yearOf(m.releaseDate)}
                </span>
              )}
              <h3 className="absolute inset-x-0 bottom-0 line-clamp-2 px-2.5 pb-2.5 pt-6 text-sm font-semibold leading-tight text-white">
                {m.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {r.method && (
        <div className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            How we built this list
          </h2>
          <p className="text-[var(--color-ink-soft)]">{r.method}</p>
        </div>
      )}

      <div className="mt-8">
        <ImportListCTA tmdbIds={tmdbIds} count={tmdbIds.length} />
      </div>
    </div>
  );
}
