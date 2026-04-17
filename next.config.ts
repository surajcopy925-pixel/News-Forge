import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.126'],
  experimental: {
    serverActions: {
      bodySizeLimit: '4gb',
    },
  },
};

export default nextConfig;
