/**
 * Canonical site origin for SEO artifacts (sitemap, robots, feed, JSON-LD).
 *
 * Set NEXT_PUBLIC_SITE_URL to the real domain once it's attached. Until then
 * this falls back to the intended production domain — which means the sitemap
 * should NOT be submitted to Search Console until the domain is actually live
 * (otherwise you register URLs that 404).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://flikpik.app"
).replace(/\/$/, "");

export const SITE_NAME = "flikpik";
export const SITE_TAGLINE = "Stop arguing. Start watching.";
