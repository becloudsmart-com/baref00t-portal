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

export class NotAdminError extends Error {
  constructor() {
    super('Admin role required')
    this.name = 'NotAdminError'
  }
}

/**
 * Throws unless the caller is a signed-in Admin.
 *
 * `role` is resolved at sign-in from the partner's member list and carried on
 * the session. A missing or unrecognised role is NOT Admin — the session
 * callback collapses anything unexpected to `null` for exactly this check.
 */
export async function requireAdmin(): Promise<void> {
  const session = await auth()
  if (session?.user?.role !== 'Admin') throw new NotAdminError()
}

/** True when the caller is an Admin — for deciding what to render. */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  return session?.user?.role === 'Admin'
}
