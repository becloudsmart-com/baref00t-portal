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
    }
  }
}

const TENANT_ID = process.env['AZURE_AD_TENANT_ID']
const CLIENT_ID = process.env['AZURE_AD_CLIENT_ID']
const CLIENT_SECRET = process.env['AZURE_AD_CLIENT_SECRET']

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: CLIENT_ID!,
      clientSecret: CLIENT_SECRET!,
      // Single-tenant issuer — only users in the partner's own tenant can sign in.
      issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      authorization: {
        params: { scope: 'openid profile email offline_access User.Read' },
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
    async jwt({ token, profile }) {
      if (profile) {
        const p = profile as { tid?: string; oid?: string }
        if (p.tid) (token as Record<string, unknown>)['tenantId'] = p.tid
        if (p.oid) (token as Record<string, unknown>)['oid'] = p.oid
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const t = token as Record<string, unknown>
        session.user.tenantId = typeof t['tenantId'] === 'string' ? t['tenantId'] : ''
        session.user.oid = typeof t['oid'] === 'string' ? t['oid'] : ''
      }
      return session
    },
  },
}
