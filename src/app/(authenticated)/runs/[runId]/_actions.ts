'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BareF00tApiError, BareF00tRateLimitError } from '@baref00t/sdk'

export interface RerunResult {
  ok: boolean
  error?: string
  rateLimited?: boolean
  retryAfterSeconds?: number
  consentRequired?: boolean
  consentUrl?: string
  newRunId?: string
}

/**
 * Re-trigger an assessment using the original run's customer + product.
 * Costs one credit. On success, redirects to the new run detail page.
 */
export async function rerunAssessmentAction(
  _prev: RerunResult | null,
  formData: FormData,
): Promise<RerunResult> {
  const runId = String(formData.get('runId') ?? '')
  if (!runId) return { ok: false, error: 'runId required' }
  const log = logger()

  try {
    const original = await partnerClient().assessments.get(runId)
    const result = await partnerClient().assessments.create({
      customerId: original.customerId,
      product: original.product,
    })
    revalidatePath('/runs')
    revalidatePath('/')
    if (result.status === 'consent_required') {
      return {
        ok: false,
        consentRequired: true,
        consentUrl: result.consentUrl,
        error:
          'Customer has not granted Microsoft admin consent. Re-send the consent invite before re-running.',
      }
    }
    log.info({ originalRunId: runId, newRunId: result.runId }, 'rerunAssessmentAction: queued new run')
    redirect(`/runs/${result.runId}`)
  } catch (err) {
    // `redirect()` throws — let it propagate.
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    if (err instanceof BareF00tRateLimitError) {
      return { ok: false, rateLimited: true, retryAfterSeconds: err.retryAfterSeconds, error: err.message }
    }
    if (err instanceof BareF00tApiError) {
      return { ok: false, error: `${err.code}: ${err.message}` }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
