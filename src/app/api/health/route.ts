/**
 * Liveness probe. Returns 200 as long as the Node process is alive and
 * the HTTP server is accepting requests. Does NOT touch the upstream API
 * (use /api/ready for that).
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json({
    status: 'ok',
    service: 'baref00t-partner-portal',
    ts: Date.now(),
  })
}
