import Link from 'next/link'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { BareF00tApiError } from '@baref00t/sdk'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const client = partnerClient()
  const log = logger()

  let me: Awaited<ReturnType<typeof client.me.get>> | null = null
  let recent: Awaited<ReturnType<typeof client.assessments.list>> | null = null
  let upstreamError: string | null = null

  try {
    ;[me, recent] = await Promise.all([
      client.me.get(),
      client.assessments.list({}),
    ])
  } catch (err) {
    if (err instanceof BareF00tApiError) {
      upstreamError = `${err.code}: ${err.message}`
    } else {
      upstreamError = err instanceof Error ? err.message : String(err)
    }
    log.error({ err: upstreamError }, 'Overview page failed to load partner data')
  }

  if (upstreamError || !me) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not reach baref00t</CardTitle>
        </CardHeader>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          {upstreamError ?? 'Unknown upstream error'}
        </p>
        <p className="mt-3 text-sm">
          Check your <Link className="underline" href="/admin/configuration">configuration</Link>.
        </p>
      </Card>
    )
  }

  const usagePct = me.runLimit ? Math.round((me.runsUsed / me.runLimit) * 100) : 0
  const usageTone = usagePct >= 90 ? 'danger' : usagePct >= 80 ? 'warning' : 'brand'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {me.company} · plan: <Badge tone="brand">{me.planName}</Badge>
          </p>
        </div>
        <Link href="/runs/new">
          <Button>Run new assessment</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={me.customerCount} hint={`tenants under ${me.company}`} />
        <StatCard
          label="Assessments this month"
          value={`${me.runsUsed}/${me.runLimit}`}
          hint={`${usagePct}% of plan quota`}
          tone={usageTone}
        />
        <StatCard
          label="Recent runs"
          value={recent?.runs.length ?? 0}
          hint={`for ${me.billingMonth}`}
        />
        <StatCard
          label="Account status"
          value={me.status}
          tone={me.status === 'active' ? 'brand' : 'warning'}
        />
      </div>

      {usagePct >= 80 && (
        <Card className="border-[color:var(--color-amber)]">
          <p className="text-sm">
            You&apos;ve used <strong>{usagePct}%</strong> of your monthly assessment quota.
            Consider upgrading your plan or pacing the rest of the month.
          </p>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent assessments</CardTitle>
          <Link href="/runs" className="text-sm text-[color:var(--color-text-muted)] hover:underline">
            View all →
          </Link>
        </CardHeader>
        {recent && recent.runs.length > 0 ? (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {recent.runs.slice(0, 5).map((run) => (
              <li key={run.runId} className="py-2 text-sm">
                <Link href={`/runs/${run.runId}`} className="hover:underline">
                  {run.product}
                </Link>{' '}
                <span className="text-[color:var(--color-text-muted)]">— {run.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-[color:var(--color-text-muted)]">
            No assessments this month yet. <Link className="underline" href="/runs/new">Run your first one</Link>.
          </p>
        )}
      </Card>
    </div>
  )
}
