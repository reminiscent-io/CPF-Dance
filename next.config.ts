import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev requests from all Replit domains and localhost
  allowedDevOrigins: [
    "localhost", 
    "127.0.0.1", 
    "*.replit.dev",
    "cpfdance.com",
    "www.cpfdance.com",
    "cpfdance.replit.app"
  ],
  
  experimental: {
    serverActions: {
      allowedOrigins: [
        "*",
        "https://cpfdance.com",
        "https://www.cpfdance.com",
        "https://cpfdance.replit.app"
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
