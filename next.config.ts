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
};

export default nextConfig;
