import NextAuth from 'next-auth'
import { authConfig } from './auth.config'
import { resolveMembership, directoryEmail } from './lib/membership'

/**
 * #985 — the membership gate lives HERE, not in `auth.config.ts`.
 *
 * `auth.config.ts` is the edge-safe config middleware imports, and this gate
 * needs the baref00t SDK to read the partner's member list. Both callbacks
 * below only ever run in the Node runtime (the sign-in exchange), so keeping
 * them on this side preserves the edge/node split the two files describe —
 * middleware never pulls the SDK into its bundle.
 *
 * `auth.config.ts` still owns the `session` callback, because that one merely
 * copies `role` off the JWT and needs nothing from the SDK.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async signIn(params) {
      // Tenant check first — cheapest, and it is the existing behaviour.
      const base = await authConfig.callbacks?.signIn?.(params)
      if (base === false) return false

      // Being in the partner's Entra tenant is not being a member of the
      // partner. This used to be the whole check, so any tenant user — never
      // invited, already removed, or suspended — got in. And because the portal
      // acts through a shared `pk_` key that is Admin-equivalent, "got in"
      // meant "can mint further API keys".
      //
      // Fail CLOSED: if the member list cannot be read we do not know whether
      // this person belongs, and what is behind this door is the partner's
      // entire baref00t account.
      try {
        const verdict = await resolveMembership(directoryEmail(params.profile))
        if (!verdict.active) {
          console.warn(`partner-portal: sign-in refused — ${verdict.reason}`)
          return false
        }
        return true
      } catch (err) {
        console.error(
          `partner-portal: sign-in refused, member lookup failed — ${
            err instanceof Error ? err.message : String(err)
          }`,
        )
        return false
      }
    },

    async jwt(params) {
      const token = (await authConfig.callbacks?.jwt?.(params)) ?? params.token

      // Only on the sign-in call, where `profile` is present. `signIn` above
      // has already refused anyone who is not Active, so this resolves for
      // members only.
      //
      // A role CHANGE therefore takes effect at the next sign-in (session
      // maxAge is 8h) rather than immediately. That lag is the deliberate cost
      // of not querying the platform on every request — and it is exactly why
      // the destructive server actions re-check the role themselves instead of
      // trusting what the UI chose to render.
      if (params.profile && token) {
        const t = token as Record<string, unknown>
        const email = directoryEmail(params.profile)
        if (email) t['email'] = email
        try {
          t['role'] = (await resolveMembership(email)).role
        } catch {
          // Never widen on failure. No role means no Admin action passes.
          t['role'] = null
        }
      }
      return token
    },
  },
})
