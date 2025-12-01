import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev requests from all Replit domains
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
