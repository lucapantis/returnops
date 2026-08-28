import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // A package-lock.json exists in a parent directory outside this repo,
  // which Next.js would otherwise misdetect as the workspace root.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
