import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hosts allowed to load dev-only assets (HMR, dev overlay) from `next dev`
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "cpfdance.com",
    "www.cpfdance.com"
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
    // 75 is the default. The cover photos ask for 90: their sources are
    // already-compressed JPEGs, and a second pass at 75 softens them visibly.
    qualities: [75, 90],
  },

  experimental: {
    serverActions: {
      // SECURITY: Removed wildcard "*" - only allow trusted origins
      allowedOrigins: [
        "https://cpfdance.com",
        "https://www.cpfdance.com"
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // PostHog's API paths end in a slash; Next's redirect would drop it.
  skipTrailingSlashRedirect: true,
  // PostHog through our own domain, so ad blockers don't drop dancers' events.
  // The browser SDK posts to /ingest (lib/analytics/posthog-client.ts).
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/array/:path*', destination: 'https://us-assets.i.posthog.com/array/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ]
  },
  async redirects() {
    return [
      // Open classes moved onto the dancer's Classes page. Shared class links
      // and login ?next= values already out there carry ?class=<id>, which
      // Next passes through to the destination.
      {
        source: '/dancer/available-classes',
        destination: '/dancer/classes',
        permanent: false,
      },
    ]
  },
  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    return [
      {
        source: '/(.*)',
        headers: [
          // In prod, block all framing; in dev, no restriction so editor previews can embed the page
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
          // Voice-to-text notes (VoiceRecorder) need the microphone on our own
          // pages. An empty allowlist, microphone=(), blocks it for us too.
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
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
