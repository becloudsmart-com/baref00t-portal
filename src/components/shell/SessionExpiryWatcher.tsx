'use client'

/**
 * Proactive sign-out before the NextAuth session JWT expires.
 *
 * The portal's session is JWT-only with `maxAge = 8h` and no token refresh
 * (the Graph access token itself expires earlier — the /me/photo proxy
 * tolerates that). Without this watcher the cookie outlives its
 * usefulness: once the JWT expires the user keeps clicking, server
 * actions return 401, and they see opaque "failed" notices instead of a
 * clean re-auth flow.
 *
 * Behaviour:
 *   - LEAD_MS before `expiresAt` we sign out to
 *     `/sign-in?reason=expired&callbackUrl=<current path>`. The user lands on
 *     the sign-in page with an explanatory notice and returns to where they
 *     were after re-auth.
 *   - On `visibilitychange` we recompute remaining time and sign out
 *     immediately if already past expiry (covers laptop-sleep case).
 */

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'

const LEAD_MS = 30_000

interface Props {
  /** ISO timestamp from `session.expires` (NextAuth populates this). */
  expiresAt: string
}

export function SessionExpiryWatcher({ expiresAt }: Props) {
  useEffect(() => {
    const expiresAtMs = Date.parse(expiresAt)
    if (!Number.isFinite(expiresAtMs)) return

    let signedOut = false
    const expire = () => {
      if (signedOut) return
      signedOut = true
      // Preserve where the user was so re-auth returns them there (#698). The
      // sign-in page reads `callbackUrl` and forwards it to signIn({ redirectTo }).
      const returnTo = window.location.pathname + window.location.search
      void signOut({
        callbackUrl: `/sign-in?reason=expired&callbackUrl=${encodeURIComponent(returnTo)}`,
      })
    }

    const scheduleOrFire = () => {
      const remaining = expiresAtMs - Date.now() - LEAD_MS
      if (remaining <= 0) {
        expire()
        return undefined
      }
      return window.setTimeout(expire, remaining)
    }

    let timer = scheduleOrFire()

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (timer !== undefined) window.clearTimeout(timer)
      timer = scheduleOrFire()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [expiresAt])

  return null
}
