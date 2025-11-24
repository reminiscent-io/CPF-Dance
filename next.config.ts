import type { NextConfig } from "next";

const replitDomain = process.env.REPLIT_DEV_DOMAIN || '0931cbb2-0334-4749-928f-29be16eafbf9-00-1qivhaal1sbfc.riker.replit.dev';

const nextConfig: NextConfig = {
  // Allow dev requests from Replit domain
  allowedDevOrigins: [replitDomain],
  
  experimental: {
    serverActions: {
      allowedOrigins: [
        `https://${replitDomain}`,
        `https://${replitDomain}:5000`,
      ],
    },
  },
  
  // Reduce console verbosity
  logging: {
    level: 'error',
  },
};

export default nextConfig;
