/**
 * Auth gate + per-request CSP nonce.
 *
 * - Redirect anonymous users to /sign-in for any route under (authenticated)
 * - Mint a fresh nonce for the inline branding <style> block in layout.tsx
 *   so we can keep `style-src 'self' 'nonce-…'` instead of `'unsafe-inline'`
 */

import NextAuth from 'next-auth'
import { NextResponse, type NextRequest } from 'next/server'
import { authConfig } from './auth.config'

const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = new Set([
  '/sign-in',
  '/auth/error',
  '/offline',
  '/sw.js',
  '/manifest.webmanifest',
])

const PUBLIC_PREFIXES = [
  '/api/auth/',
  '/api/health',
  '/api/ready',
  '/_next/',
  '/favicon',
  '/icons/',
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

export default auth((req) => {
  const { nextUrl } = req
  const path = nextUrl.pathname

  // Mint a per-request nonce. Used by layout.tsx for the branding <style>
  // block. Forwarded via response header so the App-Router root layout can
  // read it via `headers()`.
  const nonce = generateNonce()

  // Build CSP. style-src includes the nonce so layout.tsx's <style> block
  // can render under strict CSP. script-src 'self' + 'nonce-…' so any
  // future inline scripts (none today) would be opt-in.
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}' 'unsafe-hashes' 'unsafe-inline'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com",
    "frame-ancestors 'none'",
    // Report viewer iframes the SAS-signed URL on Azure Blob Storage. Allow
    // the canonical Azure Blob hosts so the viewer renders. The SAS token
    // is the actual access control — CSP just allows the iframe to load.
    "frame-src 'self' https://*.blob.core.windows.net",
    "base-uri 'self'",
    "form-action 'self' https://login.microsoftonline.com",
    // PWA: explicit manifest-src so strict-CSP browsers fetch the manifest.
    "manifest-src 'self'",
    // PWA: SW lives at /sw.js — same-origin, default-src would already cover
    // it, but be explicit so browsers that enforce worker-src don't reject.
    "worker-src 'self'",
  ].join('; ')

  // Forward the nonce to the rendering pipeline via a request header.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-nonce', nonce)

  // Auth check.
  if (!req.auth && !isPublic(path)) {
    const url = nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('callbackUrl', path)
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
})

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // base64url
  return Buffer.from(bytes).toString('base64url')
}

export const config = {
  matcher: [
    // Exclude static assets and Next internals; everything else passes through middleware.
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
  ],
}
