import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev requests from all Replit domains and localhost
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.replit.dev",
    "*.riker.replit.dev",
    "cpfdance.com",
    "www.cpfdance.com",
    "cpfdance.replit.app"
  ],

  images: {
    // next/image refuses any external host that is not listed here, so every
    // remote image in the app must come from one of these. Deliberately narrow:
    // a wildcard hostname would turn the optimiser into an open image proxy for
    // any URL an attacker could get the app to render.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nuuuzezbglgtsuorhinw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  experimental: {
    serverActions: {
      // SECURITY: Removed wildcard "*" - only allow trusted origins
      allowedOrigins: [
        "https://cpfdance.com",
        "https://www.cpfdance.com",
        "https://cpfdance.replit.app"
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    return [
      {
        source: '/(.*)',
        headers: [
          // In prod, block all framing; in dev, no restriction for Replit preview
          ...(isDev
            ? []
            : [{
                key: 'X-Frame-Options',
                value: 'DENY',
              }]),
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
