import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllLists, getList } from "@/lib/content";
import { resolveListMovies } from "@/lib/list-movies";
import { SITE_URL } from "@/lib/site";
import { Markdown } from "@/components/blog/Markdown";
import { ImportListCTA } from "@/components/blog/ImportListCTA";
import { posterUrl } from "@/lib/images";
import { yearOf } from "@/lib/utils";

// Poster data is fetched from TMDB per request; cache for a day.
export const revalidate = 86400;

export async function generateStaticParams() {
  return (await getAllLists()).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = await getList(slug);
  if (!list) return {};
  const url = `${SITE_URL}/lists/${list.slug}`;
  return {
    title: list.title,
    description: list.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: list.title,
      description: list.description,
      url,
    },
  };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const list = await getList(slug);
  if (!list) notFound();

  const movies = await resolveListMovies(list.movies);
  const tmdbIds = list.movies.map((m) => m.tmdbId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: list.title,
    description: list.description,
    numberOfItems: movies.length,
    itemListElement: movies.map((m, i) => ({
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
      <h1 className="type-display mt-4">{list.title}</h1>

      {list.intro && (
        <div className="mt-4 max-w-2xl">
          <Markdown>{list.intro}</Markdown>
        </div>
      )}

      {/* top CTA */}
      <div className="mt-8">
        <ImportListCTA tmdbIds={tmdbIds} count={tmdbIds.length} />
      </div>

      {/* poster grid */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        {movies.map((m) => (
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

      {list.method && (
        <div className="mt-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            How we built this list
          </h2>
          <p className="text-[var(--color-ink-soft)]">{list.method}</p>
        </div>
      )}

      {/* bottom CTA */}
      <div className="mt-8">
        <ImportListCTA tmdbIds={tmdbIds} count={tmdbIds.length} />
      </div>
    </div>
  );
}
