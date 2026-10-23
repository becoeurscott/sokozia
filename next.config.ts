import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // L'ancien tableau de bord est remplacé par le studio.
  async redirects() {
    return [{ source: "/tableau-de-bord", destination: "/studio", permanent: true }];
  },
};

export default nextConfig;
