/**
 * Edge-safe NextAuth config — used by middleware.
 *
 * Single-tenant Microsoft Entra: each portal deployment uses ONE Entra app
 * registered in ONE partner tenant. Users from other tenants cannot sign in.
 *
 * The full auth module lives in `auth.ts` and is used everywhere except
 * middleware.
 */

import type { NextAuthConfig, DefaultSession } from 'next-auth'
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      tenantId: string
      oid: string
      /**
       * #985 — the caller's partner member role, resolved at sign-in by
       * `auth.ts` (which owns the SDK call; this file stays edge-safe).
       * `null` means "not established" and must never be treated as Admin.
       */
      role: 'Admin' | 'Member' | 'Viewer' | null
    }
    /** Microsoft Graph access token (User.Read scope). Lifetime ~1h; the jwt
     *  callback refreshes it via `offline_access` before expiry so it stays
     *  live across the 8h session (#698). Callers must still tolerate a 401
     *  (grant revoked → refresh fails) by degrading, not erroring. */
    msAccessToken?: string
    /** Unix epoch seconds when msAccessToken expires. */
    msAccessTokenExpiresAt?: number
  }
}

const TENANT_ID = process.env['AZURE_AD_TENANT_ID']
const CLIENT_ID = process.env['AZURE_AD_CLIENT_ID']
const CLIENT_SECRET = process.env['AZURE_AD_CLIENT_SECRET']

// Delegated scopes requested at sign-in AND on refresh. `offline_access` is
// what yields the refresh token we exchange in `refreshMsAccessToken`.
const GRAPH_SCOPES = 'openid profile email offline_access User.Read'

interface RefreshedGraphToken {
  accessToken: string
  /** Unix epoch seconds. */
  expiresAt: number
  refreshToken: string
}

/**
 * Exchange the delegated refresh token for a fresh Graph access token via the
 * single-tenant Entra token endpoint.
 *
 * Edge-safe (fetch + URLSearchParams only) so it runs inside the jwt callback
 * in BOTH middleware and the Node runtime — the portal has a single shared
 * `authConfig`, so there is no edge/node split to bridge. Returns null on any
 * failure; the caller keeps the existing (stale) token and Graph consumers
 * degrade to the initials avatar. We never sign the user out on a failed
 * refresh: the portal's data path uses the partner API key, so a dead Graph
 * token is cosmetic, not a session-expiry event.
 */
async function refreshMsAccessToken(refreshToken: string): Promise<RefreshedGraphToken | null> {
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) return null
  try {
    const resp = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: GRAPH_SCOPES,
      }),
    })
    const data = (await resp.json()) as {
      access_token?: string
      expires_in?: number
      refresh_token?: string
    }
    if (!resp.ok || !data.access_token) return null
    return {
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      refreshToken: data.refresh_token ?? refreshToken,
    }
  } catch {
    return null
  }
}

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: CLIENT_ID!,
      clientSecret: CLIENT_SECRET!,
      // Single-tenant issuer — only users in the partner's own tenant can sign in.
      issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      authorization: {
        params: { scope: GRAPH_SCOPES },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // 8h
  },
  pages: {
    signIn: '/sign-in',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ profile }) {
      // Reject any token whose `tid` (tenant) claim doesn't match our configured
      // tenant — defence-in-depth on top of the single-tenant issuer.
      const tid = (profile as { tid?: string } | undefined)?.tid
      if (TENANT_ID && tid && tid.toLowerCase() !== TENANT_ID.toLowerCase()) {
        return false
      }
      return true
    },
    async jwt({ token, profile, account }) {
      const t = token as Record<string, unknown>
      if (profile) {
        const p = profile as { tid?: string; oid?: string }
        if (p.tid) t['tenantId'] = p.tid
        if (p.oid) t['oid'] = p.oid
      }
      // First JWT call after sign-in — capture the Graph tokens from the OAuth
      // `account`. The refresh token is stored on the JWT ONLY; it is never
      // copied onto the session (see the `session` callback) so it can't reach
      // the browser via /api/auth/session.
      if (account?.access_token) {
        t['msAccessToken'] = account.access_token
        if (typeof account.expires_at === 'number') {
          t['msAccessTokenExpiresAt'] = account.expires_at
        }
        if (typeof account.refresh_token === 'string') {
          t['msRefreshToken'] = account.refresh_token
        }
        return token
      }
      // Subsequent calls — refresh the Graph access token when within 60s of
      // expiry so the /me/photo proxy and Nav profile enrichment survive past
      // the ~1h token lifetime for the whole 8h session (#698). This callback
      // runs in middleware AND Node, so every server-side `auth()` observes the
      // refreshed token. On failure we keep the stale token: a Graph 401 falls
      // back to the initials avatar — the portal's data path uses the partner
      // API key, so a dead Graph token never strands the user.
      const rawExpiresAt = t['msAccessTokenExpiresAt']
      const rawRefresh = t['msRefreshToken']
      const expiresAt = typeof rawExpiresAt === 'number' ? rawExpiresAt : undefined
      const refreshToken = typeof rawRefresh === 'string' ? rawRefresh : undefined
      if (expiresAt === undefined || refreshToken === undefined) return token
      if (Date.now() / 1000 < expiresAt - 60) return token
      const refreshed = await refreshMsAccessToken(refreshToken)
      if (refreshed) {
        t['msAccessToken'] = refreshed.accessToken
        t['msAccessTokenExpiresAt'] = refreshed.expiresAt
        t['msRefreshToken'] = refreshed.refreshToken
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as Record<string, unknown>
        session.user.tenantId = typeof t['tenantId'] === 'string' ? t['tenantId'] : ''
        session.user.oid = typeof t['oid'] === 'string' ? t['oid'] : ''
        // #985 — set on the JWT by auth.ts at sign-in. Anything unrecognised
        // collapses to null, so a malformed token cannot smuggle a role in.
        session.user.role =
          t['role'] === 'Admin' || t['role'] === 'Member' || t['role'] === 'Viewer'
            ? t['role']
            : null
        if (typeof t['msAccessToken'] === 'string') {
          session.msAccessToken = t['msAccessToken']
        }
        if (typeof t['msAccessTokenExpiresAt'] === 'number') {
          session.msAccessTokenExpiresAt = t['msAccessTokenExpiresAt']
        }
      }
      return session
    },
  },
}
