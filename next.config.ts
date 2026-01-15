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
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
