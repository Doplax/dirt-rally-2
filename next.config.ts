import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Photos up to 50 MB. The client-side validation in lib/uploads.ts
      // is what really gates uploads (default 5 MB) — bump that too if you
      // ever push a higher-res image through the UI.
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
