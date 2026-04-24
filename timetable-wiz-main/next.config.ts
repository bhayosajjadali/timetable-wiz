import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // GitHub Pages deployment - repo is at https://bhayosajadali.github.io/timetable-wiz
  basePath: "/timetable-wiz",
  // Required for GitHub Pages subpath deployment
  assetPrefix: "/timetable-wiz",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
