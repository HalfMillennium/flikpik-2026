import type { MetadataRoute } from "next";
import { getAllPosts, getAllLists } from "@/lib/content";
import { getActivePacks, type PackSummary } from "@/lib/packs";
import { SITE_URL } from "@/lib/site";

// Keep the sitemap fresh even if content later moves to a DB.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, lists, packs] = await Promise.all([
    getAllPosts(),
    getAllLists(),
    // Best-effort — a DB hiccup shouldn't break the sitemap.
    getActivePacks().catch(() => [] as PackSummary[]),
  ]);
  const newest = [...posts, ...lists]
    .map((e) => e.updatedAt)
    .sort()
    .at(-1);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/blog`, changeFrequency: "daily", priority: 0.8, lastModified: newest },
    { url: `${SITE_URL}/lists`, changeFrequency: "daily", priority: 0.8, lastModified: newest },
    { url: `${SITE_URL}/picker`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/rooms/new`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/signup`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const listRoutes: MetadataRoute.Sitemap = lists.map((l) => ({
    url: `${SITE_URL}/lists/${l.slug}`,
    lastModified: l.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const packRoutes: MetadataRoute.Sitemap = packs.map((p) => ({
    url: `${SITE_URL}/lists/${p.slug}`,
    lastModified: p.refreshedAt ?? undefined,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes, ...listRoutes, ...packRoutes];
}
