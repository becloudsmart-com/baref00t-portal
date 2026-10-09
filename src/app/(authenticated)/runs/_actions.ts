'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { partnerClient } from '@/lib/api'
import { BareF00tApiError, BareF00tRateLimitError } from '@baref00t/sdk'

// ── Send consent email (#316 item 2) ─────────────────────────────────────
const sendConsentSchema = z.object({
  customerId: z.string().min(1),
  product: z.string().min(1),
  maturityTarget: z.string().optional(),
})

export interface SendConsentResult {
  ok: boolean
  sent?: number
  skipped?: number
  total?: number
  recipients?: string[]
  failed?: string[]
  consentUrl?: string
  emailConsentEnabled?: boolean
  skipReason?: 'partner_mail_off' | 'customer_channel_off' | 'customer_missing' | null
  error?: string
}

export async function sendConsentEmailAction(
  _prev: SendConsentResult | null,
  formData: FormData,
): Promise<SendConsentResult> {
  const parsed = sendConsentSchema.safeParse({
    customerId: formData.get('customerId'),
    product: formData.get('product'),
    maturityTarget: formData.get('maturityTarget') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }
  try {
    const result = await partnerClient().customers.sendConsentEmail(parsed.data.customerId, {
      product: parsed.data.product,
      maturityTarget: parsed.data.maturityTarget,
    })
    return {
      ok: true,
      sent: result.sent,
      skipped: result.skipped,
      total: result.total,
      recipients: result.recipients,
      failed: result.failed,
      consentUrl: result.consentUrl,
      emailConsentEnabled: result.emailConsentEnabled,
      skipReason: result.skipReason,
    }
  } catch (err) {
    if (err instanceof BareF00tApiError) {
      return { ok: false, error: `${err.code}: ${err.message}` }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

const triggerSchema = z.object({
  customerId: z.string().min(1),
  product: z.string().min(1),
  maturityTarget: z.string().optional(),
  /**
   * #526 — partner-supplied procedural-attestation answers, encoded by the
   * TriggerForm as a JSON string in a hidden field so the form-action shape
   * stays simple. Empty object when the product has no proceduralQuestionnaire.
   */
  attestationsJson: z.string().optional(),
})

export interface TriggerResult {
  ok: boolean
  assessmentId?: string
  runId?: string
  status?: string
  error?: string
  rateLimited?: boolean
  retryAfterSeconds?: number
  /** #316 item 3 — set when the API returns status='consent_required'.
   *  Surface to the user and link them to the consent flow before retrying. */
  consentRequired?: boolean
  consentUrl?: string
  /** Echoed back from the request so the UI can rebuild the send-consent
   *  form without keeping its own state. */
  customerId?: string
  product?: string
  maturityTarget?: string
}

export async function triggerAssessmentAction(
  _prev: TriggerResult | null,
  formData: FormData,
): Promise<TriggerResult> {
  const parsed = triggerSchema.safeParse({
    customerId: formData.get('customerId'),
    product: formData.get('product'),
    maturityTarget: formData.get('maturityTarget') || undefined,
    attestationsJson: formData.get('attestationsJson') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  // Decode the JSON-encoded attestation map (#526). Best-effort — malformed
  // JSON is logged and the trigger continues with no attestations rather
  // than failing the entire request.
  let attestations: Record<string, boolean> | undefined
  if (parsed.data.attestationsJson) {
    try {
      const decoded = JSON.parse(parsed.data.attestationsJson) as unknown
      if (decoded && typeof decoded === 'object' && !Array.isArray(decoded)) {
        const filtered: Record<string, boolean> = {}
        for (const [k, v] of Object.entries(decoded)) {
          if (typeof v === 'boolean') filtered[k] = v
        }
        if (Object.keys(filtered).length > 0) attestations = filtered
      }
    } catch {
      /* malformed; ignore — assessment continues without attestations */
    }
  }

  try {
    const result = await partnerClient().assessments.create({
      customerId: parsed.data.customerId,
      product: parsed.data.product,
      ...(parsed.data.maturityTarget && { maturityTarget: parsed.data.maturityTarget }),
      ...(attestations && { attestations }),
    })
    revalidatePath('/runs')
    revalidatePath('/')
    if (result.status === 'consent_required') {
      return {
        ok: false,
        status: result.status,
        consentRequired: true,
        consentUrl: result.consentUrl,
        customerId: result.customerId,
        product: result.product,
        maturityTarget: parsed.data.maturityTarget,
        error:
          'Customer has not granted Microsoft admin consent on their tenant. Share the consent link or use the send-consent action before retrying.',
      }
    }
    return {
      ok: true,
      assessmentId: result.assessmentId,
      runId: result.runId,
      status: result.status,
    }
  } catch (err) {
    if (err instanceof BareF00tRateLimitError) {
      return { ok: false, rateLimited: true, retryAfterSeconds: err.retryAfterSeconds, error: err.message }
    }
    if (err instanceof BareF00tApiError) {
      return { ok: false, error: `${err.code}: ${err.message}` }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function triggerAndRedirect(formData: FormData) {
  const result = await triggerAssessmentAction(null, formData)
  if (result.ok && result.runId) {
    redirect(`/runs/${result.runId}`)
  }
  return result
}
