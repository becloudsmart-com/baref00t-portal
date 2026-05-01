'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { partnerClient } from '@/lib/api'
import { BareF00tApiError, BareF00tRateLimitError } from '@baref00t/sdk'

const triggerSchema = z.object({
  customerId: z.string().min(1),
  product: z.string().min(1),
  maturityTarget: z.string().optional(),
})

export interface TriggerResult {
  ok: boolean
  assessmentId?: string
  runId?: string
  status?: string
  error?: string
  rateLimited?: boolean
  retryAfterSeconds?: number
}

export async function triggerAssessmentAction(
  _prev: TriggerResult | null,
  formData: FormData,
): Promise<TriggerResult> {
  const parsed = triggerSchema.safeParse({
    customerId: formData.get('customerId'),
    product: formData.get('product'),
    maturityTarget: formData.get('maturityTarget') || undefined,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  try {
    const result = await partnerClient().assessments.create(parsed.data)
    revalidatePath('/runs')
    revalidatePath('/')
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
