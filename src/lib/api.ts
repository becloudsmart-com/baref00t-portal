/**
 * Singleton baref00t SDK client.
 *
 * The portal authenticates server-side with the partner's API key (env var)
 * and forwards on behalf of whichever portal user is signed in. baref00t
 * platform sees only "partner X did Y" — the user's identity stays inside
 * the portal session.
 */

import { PartnerClient } from '@baref00t/sdk/partner'
import { env } from '../env'

let _client: PartnerClient | null = null

export function partnerClient(): PartnerClient {
  if (!_client) {
    const e = env()
    _client = new PartnerClient({
      apiKey: e.BAREF00T_API_KEY,
      baseUrl: e.BAREF00T_API_BASE,
      defaultHeaders: {
        'X-Portal-Version': process.env['npm_package_version'] ?? 'unknown',
      },
    })
  }
  return _client
}
