import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The recipe cache is imported as JSON, so it is bundled with every route that needs it.
  poweredByHeader: false,
  // Pin the workspace root (a stray lockfile in the home folder confuses root detection).
  turbopack: { root: process.cwd() },
};

export default nextConfig;
