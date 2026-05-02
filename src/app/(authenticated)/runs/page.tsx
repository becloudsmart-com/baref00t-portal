import Link from 'next/link'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { TimeframeSelect } from '@/components/ui/timeframe-select'
import {
  resolveTimeframe,
  previousTimeframe,
  TIMEFRAME_OPTIONS,
  DEFAULT_TIMEFRAME,
  type Timeframe,
} from '@/components/ui/timeframe'
import { BareF00tApiError } from '@baref00t/sdk'
import type { PartnerRun, PartnerCustomer } from '@baref00t/sdk/partner'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { allowedProducts, productMeta } from '@/lib/products'
import { LocalTime } from '@/components/ui/local-time'
import { RunsFilters } from './RunsFilters'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Assessments' }

interface PageProps {
  searchParams: Promise<{ timeframe?: string; product?: string; customerId?: string }>
}

const ALLOWED_TIMEFRAMES: Timeframe[] = TIMEFRAME_OPTIONS.map((o) => o.value)
function isTimeframe(v: string | undefined): v is Timeframe {
  return !!v && (ALLOWED_TIMEFRAMES as string[]).includes(v)
}

const IN_FLIGHT: ReadonlySet<string> = new Set(['queued', 'running'])

/** Fan out a multi-month list call so the runs page can show a window
 *  longer than 1 month. Bounded to keep request fan-out reasonable. */
async function listAcrossMonths(
  client: ReturnType<typeof partnerClient>,
  months: string[],
  filters: { product?: string; customerId?: string },
): Promise<{ runs: PartnerRun[]; usedThisMonth: number; runLimit: number }> {
  if (months.length === 0) return { runs: [], usedThisMonth: 0, runLimit: 0 }
  const calls = months.slice(-12).map((month) => client.assessments.list({ month, ...filters }))
  const results = await Promise.all(calls)
  const flat = results.flatMap((r) => r.runs)
  const seen = new Set<string>()
  const dedup: PartnerRun[] = []
  for (const r of flat) {
    if (seen.has(r.assessmentId)) continue
    seen.add(r.assessmentId)
    dedup.push(r)
  }
  dedup.sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime())
  const last = results[results.length - 1]
  return { runs: dedup, usedThisMonth: last?.runsUsed ?? 0, runLimit: last?.runLimit ?? 0 }
}

function pctDelta(current: number, previous: number): { delta: number; sign: 'up' | 'down' | 'flat' } {
  if (previous === 0 && current === 0) return { delta: 0, sign: 'flat' }
  if (previous === 0) return { delta: 100, sign: 'up' }
  const d = Math.round(((current - previous) / previous) * 100)
  return { delta: Math.abs(d), sign: d > 0 ? 'up' : d < 0 ? 'down' : 'flat' }
}

export default async function RunsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const timeframe: Timeframe = isTimeframe(sp.timeframe) ? sp.timeframe : DEFAULT_TIMEFRAME
  const window = resolveTimeframe(timeframe)
  const prevWindow = previousTimeframe(timeframe)
  const client = partnerClient()
  const filters = { product: sp.product, customerId: sp.customerId }

  let current: Awaited<ReturnType<typeof listAcrossMonths>> | null = null
  let previous: Awaited<ReturnType<typeof listAcrossMonths>> | null = null
  let customers: PartnerCustomer[] = []
  let allowedProductSlugs: string[] = []
  let error: string | null = null

  try {
    const [c, p, customersResp, productsResp] = await Promise.all([
      listAcrossMonths(client, window.months, filters),
      listAcrossMonths(client, prevWindow.months, filters),
      client.customers.list(),
      client.products.list(),
    ])
    current = c
    previous = p
    customers = customersResp.customers ?? []
    allowedProductSlugs = productsResp ?? []
  } catch (err) {
    error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
  }

  const customerById = new Map(customers.map((c) => [c.customerId, c]))
  const productCatalog = allowedProducts(allowedProductSlugs)

  const inWindow = (current?.runs ?? []).filter((r) => {
    const t = new Date(r.runAt).getTime()
    return t >= window.start.getTime() && t <= window.end.getTime()
  })
  const inPrevWindow = (previous?.runs ?? []).filter((r) => {
    const t = new Date(r.runAt).getTime()
    return t >= prevWindow.start.getTime() && t <= prevWindow.end.getTime()
  })

  const totalRuns = inWindow.length
  const completed = inWindow.filter((r) => r.status === 'completed').length
  const failed = inWindow.filter((r) => r.status === 'failed').length
  const inFlight = inWindow.filter((r) => IN_FLIGHT.has(r.status)).length
  const trend = pctDelta(totalRuns, inPrevWindow.length)
  const TrendIcon = trend.sign === 'up' ? ArrowUp : trend.sign === 'down' ? ArrowDown : Minus

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Assessments</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {totalRuns} runs in the {window.label}
            {current && current.runLimit > 0 && (
              <>
                {' '}
                · {current.usedThisMonth}/{current.runLimit} used this month
              </>
            )}
            {current && current.runLimit < 0 && <> · {current.usedThisMonth} used this month (unlimited plan)</>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimeframeSelect value={timeframe} />
          <Link href="/runs/new">
            <Button>Run new assessment</Button>
          </Link>
        </div>
      </div>

      <RunsFilters
        product={sp.product ?? ''}
        customerId={sp.customerId ?? ''}
        productOptions={productCatalog}
        customerOptions={customers}
      />

      {error && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{error}</p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Runs in window" value={totalRuns}>
          <span className="inline-flex items-center gap-1 text-xs text-[color:var(--color-text-muted)]">
            <TrendIcon className="h-3 w-3" /> {trend.delta}% vs previous {window.label}
          </span>
        </StatCard>
        <StatCard label="Completed" value={completed} />
        <StatCard label="Failed" value={failed} />
        <StatCard label="In flight" value={inFlight} />
      </div>

      {(!current || inWindow.length === 0) && !error ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-[color:var(--color-text-muted)]">No assessments match these filters in this window.</p>
            <Link href="/runs/new">
              <Button className="mt-3">Run an assessment</Button>
            </Link>
          </div>
        </Card>
      ) : (
        current && (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH className="text-right">Started</TH>
              </TR>
            </THead>
            <TBody>
              {inWindow.map((run) => {
                const product = productMeta(run.product)
                const customer = customerById.get(run.customerId)
                return (
                  <TR key={run.assessmentId}>
                    <TD>
                      <Link href={`/runs/${run.assessmentId}`} className="hover:underline">
                        {product.label}
                      </Link>
                    </TD>
                    <TD>
                      {customer ? (
                        <Link
                          href={`/customers/${run.customerId}`}
                          className="hover:underline"
                        >
                          {customer.name}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
                          {run.customerId.slice(0, 8)}…
                        </span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={run.status === 'completed' ? 'brand' : run.status === 'failed' ? 'danger' : 'neutral'}>
                        {run.status}
                      </Badge>
                    </TD>
                    <TD className="text-right text-xs text-[color:var(--color-text-muted)]">
                      <LocalTime iso={run.runAt} />
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )
      )}
    </div>
  )
}
