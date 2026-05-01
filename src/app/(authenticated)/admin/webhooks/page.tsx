import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = { title: 'Webhooks' }

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Webhooks</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Configure HTTPS endpoints to receive real-time event notifications from baref00t.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming in a future release</CardTitle>
        </CardHeader>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Partner-scoped webhook CRUD endpoints are not yet available on the baref00t Partner API.
          Follow{' '}
          <a
            href="https://github.com/becloudsmart-com/baref00t/issues"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            this issue
          </a>{' '}
          for progress. In the meantime, the SDK ships{' '}
          <code>verifyWebhookSignature</code> from{' '}
          <code>@baref00t/sdk/webhooks</code> ready for when delivery starts.
        </p>
      </Card>
    </div>
  )
}
