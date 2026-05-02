/**
 * Microsoft Graph helpers for the signed-in portal user.
 *
 * Uses the user's *delegated* access token captured during NextAuth sign-in
 * (User.Read scope is already requested in `auth.config.ts`). These calls
 * are deliberately small and dependency-free — Graph SDK adds substantial
 * weight that the portal doesn't need outside `lib/mail.ts`.
 *
 * Token lifetime is ~1 hour; calls that 401 should be treated as "no data"
 * (return null) and the UI degrades gracefully — initials avatar instead of
 * photo, name from id-token claims instead of /me. We intentionally do not
 * wire refresh-token exchange in v0.2 — the next sign-in cycle reissues a
 * fresh token within session.maxAge.
 */

import { logger } from './logger'

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export interface GraphProfile {
  /** Display name (preferred over OIDC `name` because tenants sometimes
   *  populate `displayName` more carefully than the OIDC name claim). */
  displayName: string | null
  /** Mail address — may differ from UPN/email. */
  mail: string | null
  /** Job title from Entra (often empty for unmanaged users). */
  jobTitle: string | null
  /** Department from Entra (often empty). */
  department: string | null
  /** Hint for the photo cache key — stable as long as the photo bytes haven't
   *  changed. Surfaced so callers can skip the photo fetch when nothing changed. */
  photoEtag?: string | null
}

interface RawProfile {
  displayName?: string
  mail?: string
  jobTitle?: string
  department?: string
}

export async function getCurrentUserProfile(accessToken: string): Promise<GraphProfile | null> {
  if (!accessToken) return null
  try {
    const res = await fetch(
      `${GRAPH_BASE}/me?$select=displayName,mail,jobTitle,department`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        // Server-side caching only — but Graph responses already include
        // `Cache-Control: no-cache`, so this is a no-op on most calls.
        cache: 'no-store',
      },
    )
    if (!res.ok) {
      // 401 → token expired. 403 → User.Read not consented. Both => null,
      // surface no error to the user.
      logger().info({ status: res.status }, 'graph /me returned non-OK; falling back')
      return null
    }
    const data = (await res.json()) as RawProfile
    return {
      displayName: data.displayName?.trim() || null,
      mail: data.mail?.trim() || null,
      jobTitle: data.jobTitle?.trim() || null,
      department: data.department?.trim() || null,
    }
  } catch (err) {
    logger().warn({ err: err instanceof Error ? err.message : String(err) }, 'graph /me threw')
    return null
  }
}

export interface GraphPhoto {
  bytes: ArrayBuffer
  contentType: string
}

/**
 * Fetch the signed-in user's profile photo bytes. Returns null on 404 (many
 * users don't have a photo set), 401 (expired token), or any other error.
 *
 * The shape is deliberately raw bytes + content-type — callers (the
 * `/api/me/photo` proxy route) re-emit them with appropriate
 * `Cache-Control` headers so browser-side caching kicks in.
 */
export async function getCurrentUserPhoto(accessToken: string): Promise<GraphPhoto | null> {
  if (!accessToken) return null
  try {
    const res = await fetch(`${GRAPH_BASE}/me/photo/$value`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      // 404 is the most common path — user has no photo. Don't log noise.
      if (res.status !== 404) {
        logger().info({ status: res.status }, 'graph /me/photo returned non-OK')
      }
      return null
    }
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const bytes = await res.arrayBuffer()
    return { bytes, contentType }
  } catch (err) {
    logger().warn({ err: err instanceof Error ? err.message : String(err) }, 'graph /me/photo threw')
    return null
  }
}
