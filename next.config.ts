import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/product/:id',
        destination: '/products/:id',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
