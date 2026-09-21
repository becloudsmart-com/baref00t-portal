/**
 * #985 — server-side Admin gate for the portal's privileged actions.
 *
 * Admin gating used to be edge-only (the nav rendered `/admin/*` links and
 * middleware checked nothing but "is there a session"). A server action is a
 * POST endpoint: hiding its button does not stop anyone who can craft the
 * request, so key mint/revoke was reachable by any signed-in user.
 *
 * Call this INSIDE the action, not in the page that renders the button.
 */
import { auth } from '../auth'
import { resolveMembership } from './membership'

export class NotAdminError extends Error {
  constructor() {
    super('Admin role required')
    this.name = 'NotAdminError'
  }
}

/**
 * Throws unless the caller is an Admin RIGHT NOW.
 *
 * Resolution is live (see `isAdmin`), not the sign-in snapshot carried on the
 * session. The session value lags by up to the 8h session lifetime, which
 * meant a member removed or demoted in the Members tab kept Admin on this
 * portal until their session expired — an offboarding window measured in
 * hours, on the actions that mint keys and rotate webhook secrets.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new NotAdminError()
}

/**
 * True when the caller is an Admin, resolved LIVE against the partner's member
 * list on every call.
 *
 * Deliberately not the session's `role`. That is still set at sign-in and is
 * fine for rendering, but it cannot reflect a removal or demotion that happened
 * mid-session, and every privileged server action now depends on this answer.
 *
 * The cost is one member lookup per privileged action. These are rare admin
 * operations — minting a key, rotating a webhook secret, changing mail config —
 * not page loads, so the per-request no-query design for normal browsing is
 * untouched.
 *
 * Fails CLOSED on lookup failure, matching the sign-in gate in `auth.ts`.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  const email = session?.user?.email
  // No session, or a session with no directory email, is not Admin.
  if (!email) return false
  try {
    const verdict = await resolveMembership(email)
    return verdict.active && verdict.role === 'Admin'
  } catch {
    // Fail CLOSED, exactly as the sign-in gate does: if the member list
    // cannot be read we do not know whether this caller is an Admin, and
    // "unknown" must never widen to "yes".
    return false
  }
}
