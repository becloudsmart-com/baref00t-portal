/**
 * Singleton baref00t SDK client.
 *
 * The portal authenticates server-side with the partner's API key (env var)
 * and forwards on behalf of whichever portal user is signed in. Authority is
 * partner-level — the key is the credential — but each request also names the
 * signed-in human (#1118) so the platform's audit log can say who acted.
 */

import { PartnerClient } from '@baref00t/sdk/partner'
import { env } from '../env'

/**
 * #1118 — the signed-in user's Entra object id, sent as an ASSERTED actor.
 *
 * The platform records it next to the partner and labels it asserted, not
 * authenticated: this portal is partner-controlled, so it is the partner
 * attesting about its own user. An object id rather than an email, so the
 * partner can resolve it in their own directory and no address is stored.
 *
 * Lazy import: `auth.ts` imports membership, which imports this module.
 */
export const ASSERTED_ACTOR_OID_HEADER = 'X-Portal-User-Oid'

async function signedInOid(): Promise<string | null> {
  try {
    const { auth } = await import('../auth')
    return (await auth())?.user?.oid || null
  } catch {
    // Outside a request (or mid sign-in, before a session exists) there is no
    // one to name. Attribution fails open: the call proceeds partner-level.
    return null
  }
}

export const fetchWithAssertedActor: typeof fetch = async (input, init) => {
  const oid = await signedInOid()
  if (!oid) return fetch(input, init)
  const headers = new Headers(init?.headers)
  headers.set(ASSERTED_ACTOR_OID_HEADER, oid)
  return fetch(input, { ...init, headers })
}

let _client: PartnerClient | null = null

export function partnerClient(): PartnerClient {
  if (!_client) {
    const e = env()
    _client = new PartnerClient({
      apiKey: e.BAREF00T_API_KEY,
      baseUrl: e.BAREF00T_API_BASE,
      fetch: fetchWithAssertedActor,
      defaultHeaders: {
        'X-Portal-Version': process.env['npm_package_version'] ?? 'unknown',
      },
    })
  }
  return _client
}
