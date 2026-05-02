'use server'

import { auth } from '@/auth'
import { env } from '@/env'
import { logger } from '@/lib/logger'
import { sendMail } from '@/lib/mail'

/** The 3 preview endpoints exposed by the platform — each renders a representative HTML
 *  document using the supplied draft branding so the partner can WYSIWYG. */
type PreviewKind = 'email-consent' | 'email-report' | 'report'

const PATHS: Record<PreviewKind, string> = {
  'email-consent': '/api/partner/branding/preview/email-consent',
  'email-report': '/api/partner/branding/preview/email-report',
  report: '/api/partner/branding/preview/report',
}

const SUBJECT_BY_KIND: Record<PreviewKind, string> = {
  'email-consent': '[Preview] Consent invitation email',
  'email-report': '[Preview] Report-ready email',
  report: '[Preview] Report viewer',
}

export interface BrandingDraft {
  name?: string
  primaryColor?: string
  logoUrl?: string
  footerText?: string
  contactEmail?: string
  theme?: 'dark' | 'light'
}

export interface PreviewResult {
  ok: boolean
  html?: string
  error?: string
}

/**
 * Fetch a rendered preview HTML for one of the 3 branding-aware templates.
 *
 * The preview endpoints aren't on the SDK — we POST directly with the
 * partner's API key (server-side). The API echoes back fully-rendered HTML
 * including a <base target="_blank"> so links inside the iframe don't try
 * to navigate the parent.
 */
export async function previewBrandingAction(
  kind: PreviewKind,
  draft: BrandingDraft,
): Promise<PreviewResult> {
  const e = env()
  const log = logger()
  const url = `${e.BAREF00T_API_BASE.replace(/\/$/, '')}${PATHS[kind]}`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-Key': e.BAREF00T_API_KEY,
      },
      body: JSON.stringify({ branding: draft }),
      // Server actions run in Node; no caching needed.
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      log.warn({ kind, status: res.status, body: body.slice(0, 300) }, 'Branding preview failed')
      return {
        ok: false,
        error: `Preview endpoint returned ${res.status}: ${body.slice(0, 200) || res.statusText}`,
      }
    }
    const html = await res.text()
    return { ok: true, html }
  } catch (err) {
    log.error({ kind, err: err instanceof Error ? err.message : String(err) }, 'Branding preview threw')
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface SendPreviewResult {
  ok: boolean
  message?: string
  error?: string
}

/**
 * Send a rendered branding preview to the signed-in user's mailbox.
 *
 * Uses the portal's own Microsoft Graph SendMail (Application permission
 * via `MAIL_FROM_ADDRESS`) — NOT the platform's `/v1/partner/mail/test`
 * endpoint, because that one ships a fixed canned email, not the
 * partner's draft-branding HTML.
 *
 * Why portal-side mail is correct here:
 *   - The branding draft is in-memory in the partner's session; sending
 *     it through the platform would require POSTing the draft HTML back
 *     up — a new endpoint, with arbitrary-HTML-send risks.
 *   - The partner's own Entra app has Mail.Send already (it's how mail
 *     for live customers flows in microsoft mode), so the capability
 *     and trust boundary are correctly scoped to the partner's tenant.
 *
 * If the portal isn't configured for outbound mail (`MAIL_FROM_ADDRESS`
 * unset), returns ok:false with a clear hint to set the env.
 */
export async function sendBrandingPreviewAction(
  kind: PreviewKind,
  draft: BrandingDraft,
): Promise<SendPreviewResult> {
  const e = env()
  const log = logger()

  if (!e.MAIL_FROM_ADDRESS) {
    return {
      ok: false,
      error:
        'Portal mail sending is not configured (MAIL_FROM_ADDRESS env unset). See docs/MAIL-SETUP.md.',
    }
  }

  const session = await auth()
  const recipient = session?.user?.email
  if (!recipient) {
    return { ok: false, error: 'Not signed in.' }
  }

  // Re-use previewBrandingAction so the rendered HTML is exactly what the
  // partner is seeing in the iframe — no drift between preview and send.
  const preview = await previewBrandingAction(kind, draft)
  if (!preview.ok || !preview.html) {
    return { ok: false, error: preview.error ?? 'Could not render preview HTML.' }
  }

  const result = await sendMail({
    to: recipient,
    subject: SUBJECT_BY_KIND[kind],
    html: preview.html,
  })
  if (!result.ok) {
    return { ok: false, error: result.error ?? 'sendMail returned ok:false' }
  }
  if (result.skipped) {
    return {
      ok: false,
      error: 'Mail was skipped — check that MAIL_FROM_ADDRESS is set and the portal has Graph credentials.',
    }
  }
  log.info({ kind, recipient }, 'Sent branding preview')
  return { ok: true, message: `Sent the ${kind} preview to ${recipient}.` }
}

// ── F14: Save branding to platform ──────────────────────────────────────
// Persists customer-facing branding (footer, brand color, contact email,
// company name) on the partner record via PUT /v1/partner/branding. This
// is the source of truth for outbound emails + report viewer.
//
// Portal-CHROME branding (portal nav/favicon/theme) stays env-driven —
// those load before the API call and need to be available pre-auth.

import { partnerClient } from '@/lib/api'
import { revalidatePath } from 'next/cache'

export interface SaveBrandingResult {
  ok: boolean
  fields?: number
  error?: string
}

export async function saveBrandingAction(draft: BrandingDraft): Promise<SaveBrandingResult> {
  const log = logger()
  const updates: Record<string, string> = {}
  if (draft.footerText !== undefined) updates.footerText = draft.footerText
  if (draft.contactEmail !== undefined) updates.contactEmail = draft.contactEmail
  if (draft.primaryColor !== undefined) updates.brandColor = draft.primaryColor
  if (draft.name !== undefined) updates.company = draft.name

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: 'No fields to save.' }
  }

  try {
    const result = await partnerClient().branding.update(updates)
    revalidatePath('/admin/branding')
    log.info({ fields: result.fields }, 'Saved branding to platform')
    return { ok: true, fields: result.fields }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.warn({ err: msg }, 'saveBrandingAction failed')
    return { ok: false, error: msg }
  }
}
