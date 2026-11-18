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

export interface DeleteResult {
  ok: boolean
  error?: string
}

/**
 * Hard-delete an assessment (#542). Removes the run + proposal + narrative
 * rows and the rendered report blobs. Irreversible. Admin-role enforced
 * server-side. On success, redirects back to the runs list.
 */
export async function deleteAssessmentAction(
  _prev: DeleteResult | null,
  formData: FormData,
): Promise<DeleteResult> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  if (!assessmentId) return { ok: false, error: 'assessmentId required' }
  const log = logger()
  try {
    await partnerClient().assessments.delete(assessmentId)
    log.info({ assessmentId }, 'deleteAssessmentAction: deleted assessment + report')
    revalidatePath('/runs')
    revalidatePath('/')
    redirect('/runs')
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err
    if (err instanceof BareF00tApiError) {
      return { ok: false, error: `${err.code}: ${err.message}` }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
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
