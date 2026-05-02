import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { partnerClient } from '@/lib/api'
import { BareF00tApiError } from '@baref00t/sdk'
import { logger } from '@/lib/logger'
import { WebhooksClient } from './WebhooksClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Webhooks' }

const FALLBACK_EVENTS = [
  'assessment.completed',
  'assessment.failed',
  'customer.created',
  'customer.updated',
  'customer.deleted',
] as const

export default async function WebhooksPage() {
  let endpoints: Awaited<ReturnType<ReturnType<typeof partnerClient>['webhooks']['list']>> | null =
    null
  let listError: string | null = null
  try {
    endpoints = await partnerClient().webhooks.list()
  } catch (err) {
    listError =
      err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err instanceof Error ? err.message : err)
    logger().error({ err: listError }, 'Failed to list webhook endpoints')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Configure HTTPS endpoints to receive real-time event notifications from baref00t. Every
          payload is signed — verify with <code>verifyWebhookSignature</code> from{' '}
          <code>@baref00t/sdk/webhooks</code>.
        </p>
      </div>

      {listError && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{listError}</p>
        </Card>
      )}

      <WebhooksClient
        initialEndpoints={endpoints?.endpoints ?? []}
        availableEvents={endpoints?.availableEvents ?? [...FALLBACK_EVENTS]}
      />
    </div>
  )
}
