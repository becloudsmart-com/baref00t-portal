import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Standalone build for the OSS Docker image — bundles everything into
  // .next/standalone so the partner only needs `node server.js` to run.
  output: 'standalone',

  // Security headers. CSP is per-request in middleware.ts so we can mint a
  // fresh nonce for the branding <style> block (the only inline style in
  // the app).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
        ],
      },
    ]
  },

  // Type-check is enforced via `pnpm typecheck` in CI, not the next build,
  // because Turbopack's build TS check is faster but less strict.
  typescript: {
    ignoreBuildErrors: false,
  },

  eslint: {
    ignoreDuringBuilds: true, // we run eslint separately in CI
  },
}

export default nextConfig
