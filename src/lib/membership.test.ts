/**
 * #985 — the two defects that followed from the shared-key design.
 *
 * The portal authorized on tenant + session only, then acted through one
 * shared `pk_` key that is Admin-equivalent. So any user in the partner's Entra
 * tenant — never invited, already removed, or suspended — could sign in and
 * mint further API keys.
 *
 * These assert the REFUSALS. A test that only proved an Active Admin gets in
 * would pass against the vulnerable code, because the vulnerable code let
 * everyone in.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({ list: vi.fn(), failList: false }))

// `list` is a PLAIN function that consults `h.failList`, not a vi.fn with a
// throwing implementation. Vitest 4 reports an error raised inside a vi.fn
// implementation as a test failure even when the caller handles it — verified
// against try/catch, `.rejects`, and a two-arm `.then`, all of which caught it
// and all of which still failed. Raising it here keeps the error path testable.
vi.mock('./api', () => ({
  partnerClient: () => ({
    members: {
      list: async () => {
        if (h.failList) throw new Error('platform unreachable')
        return h.list()
      },
    },
  }),
}))

const { resolveMembership, directoryEmail } = await import('./membership')

const member = (email: string, role: string, status: string) => ({
  emailHash: 'h', email, role, status,
  invitedAt: null, acceptedAt: null, inviteExpires: null,
  hasOpenInvite: false, createdAt: '', updatedAt: '',
})

beforeEach(() => {
  h.list.mockReset()
  h.failList = false
})

describe('resolveMembership — tenant membership is not partner membership (#985)', () => {
  it('THE FIX: a tenant user who was never invited is refused', async () => {
    h.list.mockResolvedValue({ members: [member('admin@acme.com', 'Admin', 'Active')] })

    const v = await resolveMembership('stranger@acme.com')

    expect(v.active).toBe(false)
    expect(v.role).toBeNull()
  })

  it('a suspended member is refused', async () => {
    h.list.mockResolvedValue({ members: [member('bob@acme.com', 'Admin', 'Suspended')] })
    expect((await resolveMembership('bob@acme.com')).active).toBe(false)
  })

  it('a pending invite is not yet a member', async () => {
    h.list.mockResolvedValue({ members: [member('new@acme.com', 'Member', 'Pending')] })
    expect((await resolveMembership('new@acme.com')).active).toBe(false)
  })

  it('an active member is admitted with their role', async () => {
    h.list.mockResolvedValue({ members: [member('bob@acme.com', 'Viewer', 'Active')] })

    const v = await resolveMembership('bob@acme.com')

    expect(v.active).toBe(true)
    // Viewer, not Admin — the role has to survive the round trip intact, or
    // the Admin gate downstream is meaningless.
    expect(v.role).toBe('Viewer')
  })

  it('matches case-insensitively — a capitalised UPN is the same person', async () => {
    h.list.mockResolvedValue({ members: [member('bob@acme.com', 'Admin', 'Active')] })
    expect((await resolveMembership('Bob@Acme.com')).active).toBe(true)
  })

  it('a row whose email failed to decrypt cannot match an empty claim', async () => {
    // Legacy rows come back with email: ''. Without an explicit guard, a caller
    // with no address would "match" them and be admitted as that member.
    h.list.mockResolvedValue({ members: [member('', 'Admin', 'Active')] })

    expect((await resolveMembership('')).active).toBe(false)
    expect((await resolveMembership(null)).active).toBe(false)
    expect((await resolveMembership(undefined)).active).toBe(false)
  })

  it('propagates a lookup failure so the caller can fail CLOSED', async () => {
    // #1008 — this suite had NEVER run (vitest's include was tests/unit only),
    // and this was the one test in it that did not pass. Written with
    // `expect(...).rejects`, the rejection surfaced as an unhandled error
    // attributed to the mock rather than being consumed by the matcher. An
    // explicit try/catch asserts the same property without depending on how the
    // matcher adopts the promise.
    //
    // The property itself matters: resolveMembership must NOT swallow a lookup
    // failure into { active: false }, because the sign-in callback logs
    // "not a member" and "could not tell" differently — and both must refuse.
    // Throws SYNCHRONOUSLY, not via a rejected promise. An async throwing mock
    // creates a rejection that vitest also reports as unhandled — the assertions
    // below passed while the test still failed on it. A sync throw propagates
    // out of the call expression, so there is no promise to go unhandled, and
    // the property under test is identical: the failure must reach the caller.
    h.failList = true

    // Handled inline with a two-arm `.then`, so the rejection is consumed at
    // the point it is produced. Vitest 4 reported an `await` in try/catch as an
    // unhandled error even though the catch demonstrably ran — the assertions
    // passed and the test still failed on the raw throw.
    const outcome = await resolveMembership('bob@acme.com').then(
      (verdict) => ({ kind: 'resolved' as const, verdict }),
      (err: unknown) => ({ kind: 'rejected' as const, err }),
    )

    // The property: a lookup failure must NOT come back as a verdict. Returning
    // { active: false } here would be indistinguishable from "not a member",
    // and auth.ts logs those two differently while refusing both.
    expect(outcome.kind).toBe('rejected')
  })
})

describe('directoryEmail — only a directory-minted claim authorizes (#934/#985)', () => {
  it('takes preferred_username, then upn', () => {
    expect(directoryEmail({ preferred_username: 'A@acme.com' })).toBe('a@acme.com')
    expect(directoryEmail({ upn: 'b@acme.com' })).toBe('b@acme.com')
  })

  it('THE FIX: ignores the bare `email` claim', () => {
    // Attacker-settable in an unmanaged tenant. Accepting it here would let
    // someone assert a colleague's address and inherit their membership.
    expect(directoryEmail({ email: 'admin@acme.com' })).toBeNull()
  })

  it('returns null for junk rather than a truthy string', () => {
    expect(directoryEmail(undefined)).toBeNull()
    expect(directoryEmail({})).toBeNull()
    expect(directoryEmail({ preferred_username: 'not-an-email' })).toBeNull()
    expect(directoryEmail({ preferred_username: 42 })).toBeNull()
  })
})
