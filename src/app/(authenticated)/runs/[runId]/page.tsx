import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BareF00tApiError } from '@baref00t/sdk'
import { StatusTimeline } from './StatusTimeline'
import { RerunButton } from './RerunButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ runId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { runId } = await params
  return { title: `Run ${runId.slice(0, 8)}…` }
}

export default async function RunDetailPage({ params }: PageProps) {
  const { runId } = await params
  // Partner API treats `assessmentId` as the lookup key — runId == assessmentId in v1.
  let run: Awaited<ReturnType<ReturnType<typeof partnerClient>['assessments']['get']>> | null = null
  try {
    run = await partnerClient().assessments.get(runId)
  } catch (err) {
    if (err instanceof BareF00tApiError && err.status === 404) notFound()
    throw err
  }

  const isCompleted = run.status === 'completed'
  const isFailed = run.status === 'failed'
  const isInFlight = !isCompleted && !isFailed

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          <Link href="/runs" className="hover:underline">
            ← Assessments
          </Link>
        </p>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{run.product}</h1>
          <Badge tone={isCompleted ? 'brand' : isFailed ? 'danger' : 'neutral'}>{run.status}</Badge>
        </div>
        <p className="font-mono text-xs text-[color:var(--color-text-muted)]">
          run id: {run.runId} · assessment id: {run.assessmentId}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <StatusTimeline status={run.status} runAt={run.runAt} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap items-start gap-2">
          {isCompleted ? (
            <Link href={`/runs/${run.assessmentId}/report`}>
              <Button>View report</Button>
            </Link>
          ) : (
            <p className="text-sm text-[color:var(--color-text-muted)]">
              Report becomes available once the run reaches <strong>completed</strong>.
            </p>
          )}
          <RerunButton runId={run.runId} />
        </div>
        {isInFlight && (
          <p className="mt-3 text-xs text-[color:var(--color-text-muted)]">
            Refresh this page to check progress — runs typically complete in 5–15 minutes.
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <Link
            href={`/customers/${encodeURIComponent(run.customerId)}`}
            className="font-mono text-xs hover:underline"
          >
            {run.customerId}
          </Link>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run started</CardTitle>
          </CardHeader>
          <p className="text-sm">{new Date(run.runAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing month</CardTitle>
          </CardHeader>
          <p className="font-mono">{run.billingMonth}</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        {isCompleted ? (
          <ResultsBreakdown runId={run.runId} assessmentId={run.assessmentId} />
        ) : isFailed ? (
          <p className="text-sm text-[color:var(--color-red)]">
            This run failed before producing a report. You can re-run it using the action above.
          </p>
        ) : (
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Results will appear once the run reaches <strong>completed</strong> status.
          </p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook deliveries</CardTitle>
          <Link href="/admin/webhooks" className="text-sm text-[color:var(--color-text-muted)] hover:underline">
            View all →
          </Link>
        </CardHeader>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Per-run delivery filtering is not currently exposed by the Partner API. Configure your
          webhook endpoints under{' '}
          <Link href="/admin/webhooks" className="underline">
            Settings → Webhooks
          </Link>{' '}
          to inspect the full delivery log across endpoints.
        </p>
      </Card>
    </div>
  )
}

/**
 * Results breakdown panel — shown only for completed runs.
 *
 * What we surface inline today:
 *   - Report SAS URL availability + expiry (so partners know when the
 *     pre-signed link goes stale and they need to re-fetch)
 *   - Direct links to the HTML report and PDF download
 *
 * What we DON'T surface inline (yet):
 *   - Score / top risks / quick wins / per-control findings
 *   The Partner API today exposes the same lightweight row from both
 *   GET /v1/partner/assessments and GET /v1/partner/assessments/:id
 *   (runId, customerId, product, assessmentId, status, runAt,
 *   billingMonth) — there's no scored-findings field on the wire. To
 *   show a real breakdown inline, the platform needs a new endpoint
 *   like GET /v1/partner/assessments/:id/findings returning structured
 *   { score, controls[], risks[], quickWins[] } JSON. That's a backend
 *   change tracked separately; until then the placeholder copy below
 *   directs partners to the full report.
 */
async function ResultsBreakdown({ runId, assessmentId }: { runId: string; assessmentId: string }) {
  let reportInfo: { url: string; expiresAt: string } | null = null
  let reportError: string | null = null
  try {
    const r = await partnerClient().assessments.getReport(assessmentId)
    reportInfo = { url: r.url, expiresAt: r.expiresAt }
  } catch (err) {
    if (err instanceof BareF00tApiError) {
      reportError = `${err.status}: ${err.message}`
    } else {
      reportError = err instanceof Error ? err.message : String(err)
    }
    logger().info({ assessmentId, err: reportError }, 'Report SAS fetch failed for results breakdown')
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-[color:var(--color-text-muted)]">
        Detailed score breakdown, top risks and quick wins are available in the full report. The
        Partner API does not yet expose scored findings as structured JSON — open the report below
        for the full picture.
      </p>

      {reportInfo && (
        <dl className="grid grid-cols-3 gap-y-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-xs">
          <dt className="text-[color:var(--color-text-muted)]">Report status</dt>
          <dd className="col-span-2 font-medium text-[color:var(--color-brand)]">Ready</dd>
          <dt className="text-[color:var(--color-text-muted)]">Pre-signed link expires</dt>
          <dd className="col-span-2 font-mono">
            {new Date(reportInfo.expiresAt).toISOString().replace('T', ' ').slice(0, 19)} UTC
          </dd>
        </dl>
      )}

      {reportError && (
        <p className="text-xs text-[color:var(--color-text-muted)]">
          Report metadata couldn&apos;t be fetched ({reportError}) — opening the report viewer
          below will retry.
        </p>
      )}

      <div className="flex gap-2">
        <Link href={`/runs/${assessmentId}/report`}>
          <Button>View full report</Button>
        </Link>
      </div>
    </div>
  )
}
