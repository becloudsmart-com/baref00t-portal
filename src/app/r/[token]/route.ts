import { NextResponse } from 'next/server'
import { env } from '@/env'

/**
 * Short-link report viewer — partner-domain.com/r/<token>
 *
 * Mirrors the URL pattern of www.baref00t.io/r/<token> so partners can
 * share customer-facing links on their own domain. The token is the
 * 64-char hex secret minted at assessment-completion time and exposed
 * via `PartnerRun.reportToken` from the Partner API.
 *
 * Resolution: 302-redirect to the platform's branded report viewer at
 * `<BAREF00T_API_BASE without /api>/r/<token>` — the platform-side viewer
 * already injects partner branding (footer, logo, color, contact email)
 * and handles SAS minting + rate limiting per IP.
 *
 * v0.3 follow-up: proxy the HTML inline so the URL stays partner-domain
 * the whole time (currently the address bar updates to baref00t.io after
 * the redirect).
 *
 * #325 F28.
 */

// 32–128 lowercase hex chars — matches the platform's TOKEN_RE.
const TOKEN_RE = /^[a-f0-9]{32,128}$/i

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params
  if (!TOKEN_RE.test(token)) {
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  // BAREF00T_API_BASE is `https://api.baref00t.io`; the public viewer
  // lives at `https://www.baref00t.io/r/<token>`. Derive the SITE base
  // by stripping the `api.` host prefix; partners can override via env
  // BAREF00T_REPORT_VIEWER_BASE if their platform deployment uses a
  // different DNS layout.
  const apiBase = env().BAREF00T_API_BASE
  const reportViewerBase =
    process.env.BAREF00T_REPORT_VIEWER_BASE ??
    apiBase.replace(/\/\/api\./, '//www.').replace(/\/api\/?$/, '').replace(/\/$/, '')

  return NextResponse.redirect(`${reportViewerBase}/r/${token}`, { status: 302 })
}
