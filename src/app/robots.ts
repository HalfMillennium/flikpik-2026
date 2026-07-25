import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Gated or ephemeral areas — indexing them only earns crawl errors.
        disallow: [
          "/api/",
          "/login",
          "/watchlist",
          "/groups/",
          "/profile",
          "/movies/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
