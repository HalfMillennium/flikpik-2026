import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllPosts, getPost, getList } from "@/lib/content";
import { resolveListMovies } from "@/lib/list-movies";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { Markdown } from "@/components/blog/Markdown";
import { ImportListCTA } from "@/components/blog/ImportListCTA";

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const list = post.attachedList ? await getList(post.attachedList) : null;
  const tmdbIds = list?.movies.map((m) => m.tmdbId) ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/blog"
        className="text-sm font-medium text-[var(--color-ink-soft)] hover:text-[var(--color-red)]"
      >
        ← All articles
      </Link>
      <h1 className="type-display mt-4">{post.title}</h1>
      <p className="mt-3 text-lg text-[var(--color-ink-soft)]">
        {post.description}
      </p>
      <hr className="my-8 border-[var(--color-line)]" />

      <Markdown>{post.body}</Markdown>

      {list && tmdbIds.length > 0 && (
        <div className="mt-12">
          <ImportListCTA tmdbIds={tmdbIds} count={tmdbIds.length} />
          <p className="mt-3 text-center text-sm text-[var(--color-ink-soft)]">
            Or{" "}
            <Link
              href={`/lists/${list.slug}`}
              className="font-semibold text-[var(--color-red)] underline underline-offset-2"
            >
              see the full list
            </Link>
            .
          </p>
        </div>
      )}
    </article>
  );
}
