import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Apex → www (if only www is on Vercel DNS)
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "gigster.website" }],
        destination: "https://www.gigster.website/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
