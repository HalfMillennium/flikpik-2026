import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
  // bcryptjs is pure-JS; keep it external so it isn't bundled oddly.
  serverExternalPackages: ["bcryptjs"],
  // Ensure the editorial content dir ships with server functions that read it
  // at runtime (sitemap/feed revalidation, list pages).
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
};

export default nextConfig;
