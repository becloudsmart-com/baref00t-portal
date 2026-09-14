import { notFound } from 'next/navigation'
import Link from 'next/link'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { BareF00tApiError } from '@baref00t/sdk'
import { logger } from '@/lib/logger'
import { ShareLinkButton } from './ShareLinkButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ runId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { runId } = await params
  return { title: `Report ${runId.slice(0, 8)}…` }
}

/**
 * Report viewer — fetches the 30-day SAS URL for the rendered HTML report
 * and iframes it. The SDK's `getReport()` returns the SAS URL without
 * following the redirect, so we can hand it straight to the iframe and
 * the report blob storage serves it directly to the browser.
 *
 * The iframe is sandboxed (no scripts, no top navigation) — the report
 * HTML is partner-customer-facing content that we render but don't trust
 * to mutate the parent.
 */
export default async function ReportPage({ params }: PageProps) {
  const { runId } = await params
  const log = logger()
  const assessmentId = runId

  let url: string | null = null
  let expiresAt: string | null = null
  let reportToken: string | undefined
  let error: string | null = null
  try {
    const client = partnerClient()
    const [result, run] = await Promise.all([
      client.assessments.getReport(assessmentId, { format: 'html' }),
      client.assessments.get(assessmentId).catch(() => null),
    ])
    url = result.url
    expiresAt = result.expiresAt
    if (run && 'reportToken' in run && typeof run.reportToken === 'string') {
      reportToken = run.reportToken
    }
  } catch (err) {
    if (err instanceof BareF00tApiError && err.status === 404) notFound()
    error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
    log.warn({ assessmentId, err: error }, 'Failed to fetch report SAS URL')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link href={`/runs/${runId}`} className="text-sm text-[color:var(--color-text-muted)] hover:underline">
            ← Back to run
          </Link>
          <h1 className="mt-1 text-xl font-semibold">Assessment report</h1>
          <p className="text-xs text-[color:var(--color-text-muted)]">
            Internal viewer · requires portal login. Share with customer via the
            <strong> Copy customer link</strong> button (no login required).
          </p>
        </div>
        <div className="flex items-start gap-3">
          {url && (
            <a href={url} target="_blank" rel="noreferrer">
              <Button variant="ghost">Open in new tab</Button>
            </a>
          )}
          {url && <ShareLinkButton url={url} expiresAt={expiresAt} reportToken={reportToken} />}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-[color:var(--color-red)] bg-[#ff444411] p-3 text-sm text-[color:var(--color-red)]">
          {error}
        </div>
      )}

      {url && (
        <iframe
          src={url}
          title="Assessment report"
          sandbox="allow-same-origin allow-popups"
          className="h-[calc(100vh-200px)] w-full rounded-md border border-[color:var(--color-border)] bg-white"
        />
      )}
    </div>
  )
}
