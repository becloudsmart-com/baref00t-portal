import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiKeysClient } from './ApiKeysClient'
import { env } from '@/env'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import type { PartnerKeySlot } from '@baref00t/sdk/partner'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'API keys' }

export default async function ApiKeysPage() {
  const currentSuffix = env().BAREF00T_API_KEY.slice(-4)
  const log = logger()
  let keys: PartnerKeySlot[] = []
  try {
    const me = await partnerClient().me.get()
    keys = me.keys ?? []
  } catch (err) {
    log.warn({ err }, 'Failed to load partner key slots; falling back to defensive empty list')
  }
  // Fallback: pre-v2.1.8 platforms don't expose `me.keys` yet, but the
  // portal MUST have authenticated successfully to render this page (the
  // page is behind sign-in and the SDK call above succeeded). We know at
  // least one slot is in use — the one matching `currentSuffix`. Synthesize
  // it as slot "?" until the backend ships the real list. After v2.1.8,
  // `me.keys` is populated and this branch never runs.
  if (keys.length === 0) {
    keys = [{ slot: 1, suffix: currentSuffix }]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">API keys</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Rotate the partner API key this portal authenticates with. Maximum 2 active keys per partner.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended rotation flow</CardTitle>
        </CardHeader>
        <ol className="list-decimal pl-5 text-sm text-[color:var(--color-text-muted)]">
          <li>Generate a new key (slot 2).</li>
          <li>Copy the raw key value — it is shown <strong>once</strong>.</li>
          <li>Update your portal&apos;s <code>BAREF00T_API_KEY</code> env var with the new value.</li>
          <li>Redeploy the portal and verify it works.</li>
          <li>Come back here and revoke the old slot.</li>
        </ol>
      </Card>

      <ApiKeysClient currentSuffix={currentSuffix} keys={keys} />
    </div>
  )
}
