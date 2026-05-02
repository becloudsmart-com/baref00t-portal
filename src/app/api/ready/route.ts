/**
 * Readiness probe — pings the upstream baref00t API to confirm the portal
 * can talk to it AND that our API key is valid. Returns 503 on any failure
 * so Kubernetes / fly.io / k8s orchestrators stop sending traffic until
 * upstream is healthy again.
 */

import { partnerClient } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const startedAt = Date.now()
  try {
    const me = await partnerClient().me.get()
    return Response.json({
      status: 'ready',
      service: 'baref00t-partner-portal',
      partnerId: me.partnerId,
      plan: me.plan,
      upstreamLatencyMs: Date.now() - startedAt,
      ts: Date.now(),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return Response.json(
      {
        status: 'not_ready',
        service: 'baref00t-partner-portal',
        error: message,
        ts: Date.now(),
      },
      { status: 503 },
    )
  }
}
