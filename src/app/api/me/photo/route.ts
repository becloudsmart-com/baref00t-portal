/**
 * GET /api/me/photo — proxy the signed-in user's Microsoft Graph photo.
 *
 * Why a proxy instead of a direct <img src="https://graph.microsoft.com/...">?
 *  - Authorization: Graph requires a bearer token in the request header,
 *    which `<img>` tags can't supply.
 *  - Privacy: shipping the user's access token to the browser would let any
 *    other origin script lift it out of localStorage / network logs. The
 *    proxy keeps the token server-side.
 *  - Caching: we set `Cache-Control: private, max-age=300` so the browser
 *    holds the photo for 5 min — avoids hammering Graph on every nav.
 *
 * Returns 204 (no photo) when:
 *  - the session has no Graph token (sign-in cycle didn't include `account`)
 *  - Graph returns 404 (user has no photo)
 *  - Graph returns 401 (token expired)
 *
 * The 204 response carries `Cache-Control: no-store` so the browser doesn't
 * cache the absence — a re-sign-in should make the photo appear immediately.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getCurrentUserPhoto } from '@/lib/graph'

// Force Node runtime — Graph fetch with Bearer headers is fine on edge but
// keep it consistent with the rest of the auth-dependent surface.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse(null, { status: 401 })
  }
  const token = session.msAccessToken
  if (!token) {
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  }
  const photo = await getCurrentUserPhoto(token)
  if (!photo) {
    return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  }
  return new NextResponse(photo.bytes, {
    status: 200,
    headers: {
      'Content-Type': photo.contentType,
      // Private cache — never served to other users by an intermediary.
      'Cache-Control': 'private, max-age=300, must-revalidate',
    },
  })
}
