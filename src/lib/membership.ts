/**
 * #985 — who is actually allowed in, and what may they do.
 *
 * The portal authenticates to the platform with ONE shared partner API key, and
 * a raw `pk_` key is Admin-equivalent. Authorization here was tenant-only: any
 * user in the configured Entra tenant could sign in — uninvited, removed or
 * suspended — and reach the Admin UI, including minting further API keys.
 *
 * The shared-key design is deliberate (see `lib/api.ts`: the platform sees
 * "partner X did Y", the human stays inside the portal session), so this does
 * not try to forward individual identity to the platform. It closes the two
 * defects that follow from it:
 *
 *   1. membership is checked at sign-in, against the partner's own member list
 *   2. role is carried on the session and enforced server-side per action
 *
 * What this does NOT fix: the platform's audit trail still cannot name the
 * human who acted, because every call still carries the shared key. That needs
 * identity forwarding and is tracked separately on #985.
 */
import { partnerClient } from './api'
import type { MemberRole } from '@baref00t/sdk/partner'

export type { MemberRole }

/** The verdict for one sign-in attempt. */
export interface MembershipVerdict {
  active: boolean
  role: MemberRole | null
  /** Why it was refused, for the sign-in log. Never shown to the browser. */
  reason?: string
}

/**
 * Resolve `email` against the partner's member list.
 *
 * Matching is on the DECRYPTED email the platform returns, because `emailHash`
 * is an HMAC the portal cannot compute — it has no access to the platform's
 * hashing key. A member row whose email failed to decrypt comes back as an
 * empty string; those cannot be matched and are therefore refused rather than
 * waved through. That is the safe direction, and it is visible in the log line
 * rather than silent.
 */
export async function resolveMembership(email: string | null | undefined): Promise<MembershipVerdict> {
  const wanted = email?.trim().toLowerCase()
  if (!wanted) return { active: false, role: null, reason: 'no directory email claim' }

  const { members } = await partnerClient().members.list()
  const match = members.find((m) => m.email.trim().toLowerCase() === wanted)

  if (!match) return { active: false, role: null, reason: 'not a member of this partner' }
  if (match.status !== 'Active') {
    // Pending (invite not accepted) and Suspended both mean "not now". Keeping
    // them distinct in the reason makes an operator's job easier.
    return { active: false, role: null, reason: `member status is ${match.status}` }
  }
  return { active: true, role: match.role }
}

/**
 * The email claim to authorize on.
 *
 * `preferred_username` / `upn` are directory-minted. The bare `email` claim is
 * not: in an unmanaged tenant a user can carry any address (the nOAuth class),
 * so it identifies but proves nothing — the same rule the platform applies in
 * `extractDirectoryEmailClaim`. Deliberately no `email` fallback: this value
 * decides whether someone gets in.
 */
export function directoryEmail(profile: unknown): string | null {
  const p = profile as { preferred_username?: unknown; upn?: unknown } | undefined
  for (const claim of [p?.preferred_username, p?.upn]) {
    if (typeof claim === 'string' && claim.includes('@')) return claim.trim().toLowerCase()
  }
  return null
}
