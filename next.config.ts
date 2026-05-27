import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.73"],
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "192.168.1.73:3000"],
    },
  },
};

export default nextConfig;
