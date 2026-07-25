import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, type Cluster } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import { relativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog — how to actually pick a movie",
  description:
    "Practical, no-fluff guides to ending the \"what should we watch\" stalemate. Decision methods, group voting, and movie lists built to swipe.",
  alternates: { canonical: `${SITE_URL}/blog` },
};

const CLUSTER_LABEL: Record<Cluster, string> = {
  decide: "Ending the decision",
  occasion: "By occasion & group",
  host: "Hosting a movie night",
  tools: "Free tools",
  data: "What groups actually pick",
};
const CLUSTER_ORDER: Cluster[] = ["decide", "occasion", "host", "tools", "data"];

export default async function BlogIndex() {
  const posts = await getAllPosts();
  const byCluster = CLUSTER_ORDER.map((c) => ({
    cluster: c,
    posts: posts.filter((p) => (p.cluster ?? "decide") === c),
  })).filter((g) => g.posts.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-[var(--color-red)]">
        The flikpik blog
      </p>
      <h1 className="type-hero mt-2">Stop scrolling. Start watching.</h1>
      <p className="mt-4 max-w-xl text-lg text-[var(--color-ink-soft)]">
        No more 40-minute debates. Straight guides to picking a movie fast —
        and lists you can swipe with your crew in ninety seconds.
      </p>

      {byCluster.map((group) => (
        <section key={group.cluster} className="mt-12">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
            {CLUSTER_LABEL[group.cluster]}
          </h2>
          <div className="space-y-3">
            {group.posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="block rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)]"
              >
                <h3 className="type-title">{p.title}</h3>
                <p className="mt-1.5 text-[var(--color-ink-soft)]">
                  {p.description}
                </p>
                <p className="mt-3 text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
                  {relativeTime(p.publishedAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-12 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-raised)] p-6 text-center">
        <p className="type-title">Ready-made lists to swipe</p>
        <p className="mx-auto mt-2 max-w-md text-[var(--color-ink-soft)]">
          Skip the reading — load a curated list and vote with your group right now.
        </p>
        <Link
          href="/lists"
          className="mt-4 inline-block font-semibold text-[var(--color-red)] underline underline-offset-4"
        >
          Browse the lists →
        </Link>
      </div>
    </div>
  );
}
