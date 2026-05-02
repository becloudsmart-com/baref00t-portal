'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BareF00tApiError } from '@baref00t/sdk'
import type {
  PartnerWebhookEvent,
  WebhookDelivery,
  WebhookEndpoint,
} from '@baref00t/sdk/partner'

// ── Shapes returned to the client ────────────────────────────────────────

export interface CreateWebhookResult {
  ok: boolean
  endpoint?: WebhookEndpoint
  /** Raw signing secret — surfaced to the user ONCE on creation. */
  secret?: string
  error?: string
}

export interface RotateSecretResult {
  ok: boolean
  endpoint?: WebhookEndpoint
  secret?: string
  error?: string
}

export interface UpdateWebhookResult {
  ok: boolean
  endpoint?: WebhookEndpoint
  error?: string
}

export interface DeleteWebhookResult {
  ok: boolean
  error?: string
}

export interface TestWebhookResult {
  ok: boolean
  delivered?: boolean
  statusCode?: number | null
  durationMs?: number
  lastError?: string | null
  responseBody?: string | null
  error?: string
}

export interface DeliveriesResult {
  ok: boolean
  deliveries?: WebhookDelivery[]
  total?: number
  error?: string
}

// ── Validation ────────────────────────────────────────────────────────────

const createSchema = z.object({
  url: z.string().url('URL must include the scheme').refine((u) => u.startsWith('https://'), {
    message: 'URL must use https://',
  }),
  events: z.array(z.string().min(1)).min(1, 'pick at least one event'),
  description: z.string().max(200).optional().default(''),
})

// ── Server actions ────────────────────────────────────────────────────────

export async function createWebhookAction(formData: FormData): Promise<CreateWebhookResult> {
  const eventsRaw = formData.getAll('events').map(String).filter(Boolean)
  const parsed = createSchema.safeParse({
    url: formData.get('url'),
    events: eventsRaw,
    description: formData.get('description') ?? '',
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') }
  }
  try {
    const result = await partnerClient().webhooks.create({
      url: parsed.data.url,
      events: parsed.data.events as PartnerWebhookEvent[],
      description: parsed.data.description,
    })
    revalidatePath('/admin/webhooks')
    return { ok: true, endpoint: result.endpoint, secret: result.secret }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

export async function toggleWebhookEnabledAction(
  endpointId: string,
  enabled: boolean,
): Promise<UpdateWebhookResult> {
  if (!endpointId) return { ok: false, error: 'endpointId required' }
  try {
    const result = await partnerClient().webhooks.update(endpointId, { enabled })
    revalidatePath('/admin/webhooks')
    return { ok: true, endpoint: result.endpoint }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

export async function rotateWebhookSecretAction(endpointId: string): Promise<RotateSecretResult> {
  if (!endpointId) return { ok: false, error: 'endpointId required' }
  try {
    const result = await partnerClient().webhooks.update(endpointId, { rotateSecret: true })
    revalidatePath('/admin/webhooks')
    return { ok: true, endpoint: result.endpoint, secret: result.secret }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

export async function deleteWebhookAction(endpointId: string): Promise<DeleteWebhookResult> {
  if (!endpointId) return { ok: false, error: 'endpointId required' }
  try {
    await partnerClient().webhooks.delete(endpointId)
    revalidatePath('/admin/webhooks')
    return { ok: true }
  } catch (err) {
    logger().error({ endpointId, err: humanise(err) }, 'deleteWebhookAction failed')
    return { ok: false, error: humanise(err) }
  }
}

export async function testWebhookAction(endpointId: string): Promise<TestWebhookResult> {
  if (!endpointId) return { ok: false, error: 'endpointId required' }
  try {
    const result = await partnerClient().webhooks.test(endpointId)
    return {
      ok: true,
      delivered: result.delivered,
      statusCode: result.statusCode,
      durationMs: result.durationMs,
      lastError: result.lastError,
      responseBody: result.responseBody,
    }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

export async function listDeliveriesAction(endpointId: string): Promise<DeliveriesResult> {
  if (!endpointId) return { ok: false, error: 'endpointId required' }
  try {
    const result = await partnerClient().webhooks.listDeliveries(endpointId, { limit: 50 })
    return { ok: true, deliveries: result.deliveries, total: result.total }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

function humanise(err: unknown): string {
  if (err instanceof BareF00tApiError) return `${err.code}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}
