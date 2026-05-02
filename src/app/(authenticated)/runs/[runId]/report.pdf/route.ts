import { partnerClient } from '@/lib/api'
import { BareF00tApiError } from '@baref00t/sdk'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Report PDF download — fetches the 30-day SAS URL for the PDF render
 * and 302-redirects to it. The browser then downloads from blob storage
 * directly; the portal never streams the bytes itself.
 *
 * If the SDK's getReport returns a 404 (assessment not found / not
 * completed yet), surface that as a 404 plain-text response so the
 * browser shows something legible instead of breaking the redirect.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string }> },
): Promise<Response> {
  const { runId } = await params
  const assessmentId = runId
  const log = logger()
  try {
    const { url } = await partnerClient().assessments.getReport(assessmentId, { format: 'pdf' })
    return NextResponse.redirect(url, { status: 302 })
  } catch (err) {
    if (err instanceof BareF00tApiError && err.status === 404) {
      return new Response('Assessment not found or report not yet available.', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    }
    const msg = err instanceof Error ? err.message : String(err)
    log.warn({ assessmentId, err: msg }, 'Failed to mint report PDF SAS')
    return new Response(`Failed to fetch report: ${msg}`, {
      status: 502,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}
