import type { NextConfig } from "next";
import { assertVercelRateLimitConfiguration } from "./src/lib/rate-limit";

assertVercelRateLimitConfiguration();

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/mcp": ["./public/encrypted/**/*"],
    // generateMetadata reads course and instructor names from the manifest.
    "/course/[prefix]/[number]": ["./public/encrypted/manifest.json"],
    "/instructor/[id]": ["./public/encrypted/manifest.json"],
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/encrypted/blobs/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/encrypted/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
