/**
 * Server-side fetch helpers for the platform's partner mail endpoints.
 *
 * The SDK doesn't expose mail methods (intentional — they're partner-owned
 * configuration, not the assessment data plane). We POST/PUT directly with
 * the partner's API key from server actions, matching the pattern used by
 * `branding/_actions.ts` for the preview endpoints.
 *
 * All endpoints require Admin role on the partner — the API key the portal
 * is configured with must have been issued to a partner Admin. The platform
 * enforces this server-side via `requireAdminOnPartner()` in
 * `apps/functions/src/functions/partnerMailApi.ts`.
 */

import { env } from '@/env'

export type MailProvider = 'resend' | 'microsoft' | 'off'

export interface MailStatus {
  provider: MailProvider
  /** UPN of the consenting Admin (or null if never connected). */
  connectedUserEmail: string | null
  /** UPN of the shared mailbox to send from (overrides connectedUserEmail). */
  sharedMailbox: string | null
  /** Whether a non-expired access token is currently cached. */
  hasValidToken: boolean
  /** ISO-8601 of the cached token's expiry, or null. */
  tokenExpiresAt: string | null
}

interface FetchResult<T> {
  ok: true
  data: T
}
interface FetchError {
  ok: false
  status: number
  error: string
}

async function call<T>(
  path: string,
  init: { method: 'GET' | 'POST' | 'PUT'; body?: unknown },
): Promise<FetchResult<T> | FetchError> {
  const e = env()
  const url = `${e.BAREF00T_API_BASE.replace(/\/$/, '')}${path}`
  try {
    const res = await fetch(url, {
      method: init.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-Key': e.BAREF00T_API_KEY,
      },
      ...(init.body !== undefined && { body: JSON.stringify(init.body) }),
      cache: 'no-store',
    })
    const text = await res.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        // Some 502/503 paths return plain text; fall through with text.
      }
    }
    if (!res.ok) {
      const errMsg =
        parsed && typeof parsed === 'object' && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : text.slice(0, 200) || res.statusText
      return { ok: false, status: res.status, error: errMsg }
    }
    return { ok: true, data: (parsed ?? {}) as T }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/** GET /v1/partner/mail/status — current provider + connection state. */
export function getMailStatus() {
  return call<MailStatus>('/api/v1/partner/mail/status', { method: 'GET' })
}

/** PUT /v1/partner/mail/mode — switch between resend / microsoft / off. */
export function setMailMode(mode: MailProvider) {
  return call<{ ok: true; mode: MailProvider }>('/api/v1/partner/mail/mode', {
    method: 'PUT',
    body: { mode },
  })
}

/** POST /v1/partner/mail/disconnect — revoke the cached refresh token, revert to Resend. */
export function disconnectMail() {
  return call<{ ok: true }>('/api/v1/partner/mail/disconnect', { method: 'POST' })
}

/** POST /v1/partner/mail/test — send a fixed test email to the calling Admin's address. */
export function sendMailTest() {
  return call<{
    delivered: true
    via: 'microsoft'
    recipient: string
    fromMailbox: string
  }>('/api/v1/partner/mail/test', { method: 'POST' })
}

/** PUT /v1/partner/mail/shared-mailbox — set/clear the shared-mailbox UPN to send as. */
export function setSharedMailbox(sharedMailbox: string | null) {
  return call<{ ok: true; sharedMailbox: string | null }>(
    '/api/v1/partner/mail/shared-mailbox',
    { method: 'PUT', body: { sharedMailbox } },
  )
}
