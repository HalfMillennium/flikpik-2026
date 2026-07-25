import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

/**
 * Single source of truth for editorial content. The blog/list pages AND the
 * sitemap/robots/feed all read from here, so publishing = adding a file. There
 * is no separate "update the sitemap" step.
 */

export type ContentKind = "post" | "list";
export type Cluster = "decide" | "occasion" | "host" | "tools" | "data";

export interface PostMeta {
  kind: "post";
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  cluster?: Cluster;
  attachedList?: string;
  noindex: boolean;
}

export interface Post extends PostMeta {
  body: string;
}

export interface ListMovie {
  tmdbId: number;
  title: string;
}

export interface MovieList {
  kind: "list";
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  noindex: boolean;
  intro?: string;
  outro?: string;
  method?: string;
  movies: ListMovie[];
}

const ROOT = path.join(process.cwd(), "content");

async function readDir(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir);
  } catch {
    return [];
  }
}

function iso(value: unknown, fallback?: string): string {
  const d = new Date((value as string) ?? fallback ?? Date.now());
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ── posts ──────────────────────────────────────────────────────────────────
export async function getAllPosts(): Promise<Post[]> {
  const dir = path.join(ROOT, "posts");
  const files = (await readDir(dir)).filter((f) => f.endsWith(".md") || f.endsWith(".mdx"));

  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const post: Post = {
        kind: "post",
        slug: data.slug ?? file.replace(/\.mdx?$/, ""),
        title: data.title ?? "Untitled",
        description: data.description ?? "",
        publishedAt: iso(data.publishedAt),
        updatedAt: iso(data.updatedAt, data.publishedAt),
        cluster: data.cluster,
        attachedList: data.attachedList,
        noindex: data.noindex ?? false,
        body: content,
      };
      return post;
    }),
  );

  return posts
    .filter((p) => !p.noindex && new Date(p.publishedAt) <= new Date())
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getPost(slug: string): Promise<Post | null> {
  return (await getAllPosts()).find((p) => p.slug === slug) ?? null;
}

// ── lists ──────────────────────────────────────────────────────────────────
export async function getAllLists(): Promise<MovieList[]> {
  const dir = path.join(ROOT, "lists");
  const files = (await readDir(dir)).filter((f) => f.endsWith(".json"));

  const lists = await Promise.all(
    files.map(async (file) => {
      const raw = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
      const list: MovieList = {
        kind: "list",
        slug: raw.slug,
        title: raw.title,
        description: raw.description,
        publishedAt: iso(raw.publishedAt),
        updatedAt: iso(raw.updatedAt, raw.publishedAt),
        noindex: raw.noindex ?? false,
        intro: raw.intro,
        outro: raw.outro,
        method: raw.method,
        movies: Array.isArray(raw.movies) ? raw.movies : [],
      };
      return list;
    }),
  );

  return lists
    .filter((l) => !l.noindex)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function getList(slug: string): Promise<MovieList | null> {
  return (await getAllLists()).find((l) => l.slug === slug) ?? null;
}

/** Newest updatedAt across all content — used for index lastModified. */
export async function newestUpdatedAt(): Promise<string | undefined> {
  const [posts, lists] = await Promise.all([getAllPosts(), getAllLists()]);
  return [...posts, ...lists]
    .map((e) => e.updatedAt)
    .sort()
    .at(-1);
}
