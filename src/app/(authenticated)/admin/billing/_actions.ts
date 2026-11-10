'use server'

import { isAdmin } from '@/lib/requireAdmin'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BareF00tApiError } from '@baref00t/sdk'

export interface PortalUrlResult {
  ok: boolean
  url?: string
  error?: string
}

/**
 * Mint a fresh Stripe Customer Portal URL.
 *
 * The page-load fetch (`billing.get()`) already returns a `portal_url`
 * but Stripe portal sessions are short-lived (~1h). Calling this from a
 * click handler guarantees a fresh session at click time so the user
 * doesn't get a 410 from Stripe after the page has been open a while.
 */
export async function getBillingPortalUrlAction(): Promise<PortalUrlResult> {
  // #985 — a server action is a POST endpoint; hiding the button stops nobody
  // who can craft the request. The platform cannot gate this for us: the portal
  // authenticates with one shared raw `pk_` key, which is Admin-equivalent by
  // design, so `requireAdminOnPartner()` passes for every portal caller.
  if (!(await isAdmin())) return { ok: false, error: 'Admin role required.' }
  const log = logger()
  try {
    const r = await partnerClient().billing.getPortalUrl()
    return { ok: true, url: r.url }
  } catch (err) {
    const msg = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
    log.warn({ err: msg }, 'getBillingPortalUrlAction failed')
    return { ok: false, error: msg }
  }
}
