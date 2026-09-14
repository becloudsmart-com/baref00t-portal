import Link from 'next/link'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Badge } from '@/components/ui/badge'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { TimeframeSelect } from '@/components/ui/timeframe-select'
import { productMeta } from '@/lib/products'
import { LocalTime } from '@/components/ui/local-time'
import { OverviewRunRow } from './OverviewRunRow'
import {
  resolveTimeframe,
  previousTimeframe,
  TIMEFRAME_OPTIONS,
  DEFAULT_TIMEFRAME,
  type Timeframe,
} from '@/components/ui/timeframe'
import { BareF00tApiError } from '@baref00t/sdk'
import type { PartnerRun, PartnerCustomer } from '@baref00t/sdk/partner'
import { logger } from '@/lib/logger'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ timeframe?: string }>
}

const ALLOWED_TIMEFRAMES: Timeframe[] = TIMEFRAME_OPTIONS.map((o) => o.value)

function isTimeframe(v: string | undefined): v is Timeframe {
  return !!v && (ALLOWED_TIMEFRAMES as string[]).includes(v)
}

/** Run status that counts as "in flight" (pre-completion). */
const IN_FLIGHT: ReadonlySet<string> = new Set(['queued', 'running'])

export default async function OverviewPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const timeframe: Timeframe = isTimeframe(sp.timeframe) ? sp.timeframe : DEFAULT_TIMEFRAME
  const client = partnerClient()
  const log = logger()

  let me: Awaited<ReturnType<typeof client.me.get>> | null = null
  let upstreamError: string | null = null

  try {
    me = await client.me.get()
  } catch (err) {
    if (err instanceof BareF00tApiError) {
      upstreamError = `${err.code}: ${err.message}`
    } else {
      upstreamError = err instanceof Error ? err.message : String(err)
    }
    log.error({ err: upstreamError }, 'Overview page failed to load partner profile')
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

  // Fetch runs across the timeframe by querying each spanned month.
  const window = resolveTimeframe(timeframe)
  const prev = previousTimeframe(timeframe)
  const fetchRuns = async (months: string[]): Promise<PartnerRun[]> => {
    if (months.length === 0) return []
    const results = await Promise.allSettled(
      months.map((month) => client.assessments.list({ month })),
    )
    const acc: PartnerRun[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') acc.push(...r.value.runs)
    }
    return acc
  }
  const [allCurrent, allPrev, customersResp] = await Promise.all([
    fetchRuns(window.months),
    fetchRuns(prev.months),
    client.customers.list().catch(() => ({ customers: [] as PartnerCustomer[] })),
  ])
  const customerById = new Map(customersResp.customers.map((c) => [c.customerId, c]))

  // Filter to the actual window (months are coarser than the day-precise range).
  const inWindow = (r: PartnerRun) => {
    const t = new Date(r.runAt).getTime()
    return t >= window.start.getTime() && t <= window.end.getTime()
  }
  const inPrevWindow = (r: PartnerRun) => {
    const t = new Date(r.runAt).getTime()
    return t >= prev.start.getTime() && t <= prev.end.getTime()
  }

  // De-duplicate by runId in case the API returns the same run for adjacent months.
  const dedupe = (runs: PartnerRun[]) => {
    const seen = new Set<string>()
    const out: PartnerRun[] = []
    for (const r of runs) {
      if (seen.has(r.runId)) continue
      seen.add(r.runId)
      out.push(r)
    }
    return out
  }
  const currentRuns = dedupe(allCurrent.filter(inWindow))
  const prevRuns = dedupe(allPrev.filter(inPrevWindow))

  const inFlight = currentRuns.filter((r) => IN_FLIGHT.has(r.status)).length
  const trendPct = (() => {
    if (prevRuns.length === 0) return currentRuns.length === 0 ? 0 : 100
    return Math.round(((currentRuns.length - prevRuns.length) / prevRuns.length) * 100)
  })()

  const planTier = formatPlan(me.planName || me.plan)
  const isUnlimited = me.runLimit < 0
  const usagePct = isUnlimited || me.runLimit === 0 ? 0 : Math.round((me.runsUsed / me.runLimit) * 100)
  const usageTone = isUnlimited ? 'brand' : usagePct >= 90 ? 'danger' : usagePct >= 80 ? 'warning' : 'brand'
  const quotaDisplay = isUnlimited ? `${me.runsUsed} / unlimited` : `${me.runsUsed} / ${me.runLimit}`

  const latestRuns = [...currentRuns]
    .sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {me.company} · plan: <Badge tone="brand">{me.planName}</Badge>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeframeSelect value={timeframe} />
          <Link href="/runs/new">
            <Button>Run new assessment</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Active customers"
          value={me.customerCount}
          hint={`tenants under ${me.company}`}
        />
        <StatCard
          label={`Runs (${window.label})`}
          value={currentRuns.length}
          hint={renderTrendHint(trendPct, prevRuns.length)}
        />
        <StatCard
          label="Runs in flight"
          value={inFlight}
          hint={inFlight > 0 ? 'queued or running' : 'all idle'}
          tone={inFlight > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Plan tier"
          value={planTier}
          hint={`quota: ${quotaDisplay}`}
          tone="brand"
        />
        <StatCard
          label="Quota used (this billing month)"
          value={isUnlimited ? 'unlimited' : `${me.runsUsed}/${me.runLimit}`}
          hint={isUnlimited ? 'no monthly cap' : `${usagePct}% of plan quota`}
          tone={usageTone}
        />
        <StatCard
          label="Account status"
          value={me.status}
          tone={me.status === 'active' ? 'brand' : 'warning'}
        />
      </div>

      {!isUnlimited && usagePct >= 80 && (
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
        {latestRuns.length > 0 ? (
          <Table>
            <THead>
              <TR>
                <TH>Assessment</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH className="text-right">Score</TH>
                <TH className="text-right">Started</TH>
                <TH className="text-right">Action</TH>
              </TR>
            </THead>
            <TBody>
              {latestRuns.map((run) => (
                <OverviewRunRow
                  key={run.assessmentId}
                  run={run}
                  customer={customerById.get(run.customerId)}
                />
              ))}
            </TBody>
          </Table>
        ) : (
          <p className="py-4 text-center text-sm text-[color:var(--color-text-muted)]">
            No assessments in this window. <Link className="underline" href="/runs/new">Run your first one</Link>.
          </p>
        )}
      </Card>
    </div>
  )
}

function formatPlan(plan: string): string {
  if (!plan) return 'Unknown'
  return plan
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

function renderTrendHint(trendPct: number, prevCount: number): string {
  if (prevCount === 0) {
    return trendPct === 0 ? 'no prior period data' : 'new activity vs prior period'
  }
  const dir = trendPct > 0 ? '+' : ''
  return `${dir}${trendPct}% vs prior period`
}

// Re-export the trend arrow icons so a future refactor that wants to render
// them inline can pull from one place. Currently the StatCard surface doesn't
// support inline icons in `hint` — wired as text for now.
export const _trendIcons = { ArrowUp, ArrowDown, Minus }
