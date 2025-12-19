import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev requests from all Replit domains and localhost
  allowedDevOrigins: ["localhost", "127.0.0.1", "*.replit.dev"],
  
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
