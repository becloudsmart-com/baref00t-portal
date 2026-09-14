import { partnerClient } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { BareF00tApiError } from '@baref00t/sdk'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Usage' }

interface MonthBucket {
  month: string
  count: number
}

export default async function UsagePage() {
  const client = partnerClient()
  let me: Awaited<ReturnType<typeof client.me.get>> | null = null
  let products: string[] = []
  let buckets: MonthBucket[] = []
  let error: string | null = null

  try {
    ;[me, products] = await Promise.all([client.me.get(), client.products.list()])
  } catch (err) {
    error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
  }

  if (me) {
    // Build last 12 months and pull each via the assessments endpoint.
    const monthKeys: string[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    // Sequential to avoid hammering the per-key 60/min rate limit.
    buckets = []
    for (const month of monthKeys) {
      try {
        const list = await client.assessments.list({ month })
        buckets.push({ month, count: list.total })
      } catch {
        buckets.push({ month, count: 0 })
      }
    }
  }

  const usagePct = me?.runLimit ? Math.round((me.runsUsed / me.runLimit) * 100) : 0
  const usageTone = usagePct >= 90 ? 'danger' : usagePct >= 80 ? 'warning' : 'brand'

  const maxBucket = Math.max(1, ...buckets.map((b) => b.count))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Usage</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Assessment consumption, plan quota, and product entitlement.
        </p>
      </div>

      {error && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{error}</p>
        </Card>
      )}

      {me && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Plan" value={me.planName} hint={me.billing} />
            <StatCard
              label="This month"
              value={`${me.runsUsed}/${me.runLimit}`}
              hint={`${usagePct}% of quota`}
              tone={usageTone}
            />
            <StatCard label="Customers" value={me.customerCount} />
          </div>

          {usagePct >= 80 && (
            <Card className="border-[color:var(--color-amber)]">
              <p className="text-sm">
                You&apos;ve used <strong>{usagePct}%</strong> of your monthly quota — pace remaining
                runs or upgrade your plan.
              </p>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Allowed products</CardTitle>
            </CardHeader>
            {products.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {products.map((p) => (
                  <Badge key={p} tone="brand">
                    {p}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--color-text-muted)]">
                No products available — contact your distributor to upgrade your plan.
              </p>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Last 12 months</CardTitle>
            </CardHeader>
            <div className="space-y-2">
              {buckets.map((b) => {
                const pct = (b.count / maxBucket) * 100
                return (
                  <div key={b.month} className="flex items-center gap-3 text-xs">
                    <span className="w-16 font-mono text-[color:var(--color-text-muted)]">{b.month}</span>
                    <div className="flex-1">
                      <ProgressBar pct={pct} />
                    </div>
                    <span className="w-10 text-right font-mono">{b.count}</span>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
