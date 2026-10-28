import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Ships the ffmpeg binary as-is instead of bundling it.
  serverExternalPackages: ["ffmpeg-static"],
  // The binary is loaded by path at runtime, so file tracing can't see it.
  outputFileTracingIncludes: { "/api/**/*": ["./node_modules/ffmpeg-static/ffmpeg", "./node_modules/ffmpeg-static/ffmpeg.exe"] },
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
