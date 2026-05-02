import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BareF00tApiError } from '@baref00t/sdk'

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
          <Badge tone={run.status === 'completed' ? 'brand' : run.status === 'failed' ? 'danger' : 'neutral'}>
            {run.status}
          </Badge>
        </div>
        <p className="font-mono text-xs text-[color:var(--color-text-muted)]">
          run id: {run.runId} · assessment id: {run.assessmentId}
        </p>
      </div>

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
          <CardTitle>Report</CardTitle>
        </CardHeader>
        {run.status === 'completed' ? (
          <div className="space-y-3 text-sm">
            <p className="text-[color:var(--color-text-muted)]">
              The full HTML and PDF report are available once the assessment completes processing.
            </p>
            <div className="flex gap-2">
              <Link href={`/runs/${run.runId}/report`}>
                <Button>View HTML report</Button>
              </Link>
              <Link href={`/runs/${run.runId}/report.pdf`}>
                <Button variant="secondary">Download PDF</Button>
              </Link>
            </div>
            <p className="text-xs text-[color:var(--color-text-muted)]">
              ⚠ Report viewer requires Partner API to expose <code>/v1/partner/assessments/:id/report</code> —
              tracked in Sprint 2 prerequisites; if unavailable, links return 404.
            </p>
          </div>
        ) : (
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Report will be available once the run reaches <strong>completed</strong> status.
          </p>
        )}
      </Card>
    </div>
  )
}
