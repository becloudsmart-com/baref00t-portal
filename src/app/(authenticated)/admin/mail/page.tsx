import { getMailStatus } from '@/lib/partner-mail-api'
import { logger } from '@/lib/logger'
import { MailManagement } from './MailManagement'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email configuration' }

/** Where the hosted SaaS exposes the OAuth consent flow. The Partner Mail
 *  Sender Entra app is platform-owned (multi-tenant), so the actual consent
 *  dance has to happen on baref00t.io — the portal opens it in a new tab and
 *  shows a "refresh after consenting" hint. After tokens are persisted on
 *  the platform side, the portal's status read picks them up automatically. */
const HOSTED_CONNECT_URL = 'https://www.baref00t.io/api/auth/partner-mail-connect'

export default async function EmailConfigurationPage() {
  const result = await getMailStatus()
  let status = null
  let upstreamError: string | null = null
  if (result.ok) {
    status = result.data
  } else {
    upstreamError = `${result.status}: ${result.error}`
    logger().warn({ err: upstreamError }, 'Email configuration page failed to read /v1/partner/mail/status')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email configuration</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Choose how baref00t sends customer-facing email from your account: from your own
          Microsoft 365 tenant, or disabled entirely. Settings are read from and saved to the
          baref00t platform — this is the source of truth for all outbound mail (consent, report,
          and questionnaire). When disabled, the platform falls back to its default sender for any
          required system mail.
        </p>
      </div>

      <MailManagement
        status={status}
        connectUrl={HOSTED_CONNECT_URL}
        upstreamError={upstreamError}
      />
    </div>
  )
}
