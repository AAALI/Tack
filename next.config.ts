import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the build lean; we run on the Node.js runtime via OpenNext.
};

export default nextConfig;

// Enable Cloudflare bindings during `next dev` (no-op in production build).
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
