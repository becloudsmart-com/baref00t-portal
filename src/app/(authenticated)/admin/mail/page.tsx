import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { env } from '@/env'
import { logger } from '@/lib/logger'
import { getMailStatus } from '@/lib/partner-mail-api'
import { MailManagement } from './MailManagement'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Email configuration' }

/**
 * Email configuration — TWO entirely separate sender systems, displayed
 * side-by-side so partners understand which one drives which emails.
 *
 * 1. Customer-facing platform email (consent, questionnaire, report-ready)
 *    - Sent by baref00t platform Functions
 *    - Authenticated via the multi-tenant `Partner Mail Sender` Entra app
 *      (lives in baref00t's tenant). Partner tenant admin grants delegated
 *      consent via the Connect flow, after which the platform sends mail
 *      AS the partner's mailbox (configured here).
 *    - Result: from-address is the partner's domain, but the OAuth app
 *      doing the actual sendMail is baref00t-owned. No need for partner
 *      to share their own app credentials.
 *
 * 2. Portal-direct admin email (branding test, future member invites)
 *    - Sent by THIS portal directly via Microsoft Graph
 *    - Uses the partner's OWN Entra app (`AZURE_AD_*` env) + `Mail.Send`
 *      Application permission + `MAIL_FROM_ADDRESS`
 *    - No OAuth dance — `client_credentials` grant runs at request time
 *    - Independent of the platform mail config above
 */
// F41 — Connect button now calls /v1/partner/mail/connect-init via the
// SDK; the OAuth callback at baref00t.io reads `state.returnTo` and
// bounces back to the portal automatically. No more deep-link.

export default async function EmailConfigurationPage() {
  const e = env()
  const portalSenderConfigured = !!e.MAIL_FROM_ADDRESS
  const azureConfigured = !!(e.AZURE_AD_TENANT_ID && e.AZURE_AD_CLIENT_ID && e.AZURE_AD_CLIENT_SECRET)

  // Fetch the platform-side mail status (provider, connected mailbox, etc.).
  const result = await getMailStatus()
  const platformStatus = result.ok ? result.data : null
  const platformError = result.ok ? null : `${result.status}: ${result.error}`
  if (platformError) {
    logger().warn({ err: platformError }, 'Email config: failed to read platform mail status')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email configuration</h1>
        <p className="mt-1 text-sm text-[color:var(--color-text-muted)]">
          Two independent sender systems. Most partners only need to configure (1) below.
        </p>
      </div>

      {/* (1) Customer-facing platform email */}
      <Card>
        <CardHeader>
          <CardTitle>Customer-facing email (consent, questionnaire, reports)</CardTitle>
          <Badge tone="brand">Primary</Badge>
        </CardHeader>
        <p className="mb-4 text-sm text-[color:var(--color-text-muted)]">
          Sent by the baref00t platform itself. Connect Microsoft mailbox below — your tenant
          admin grants delegated consent to the multi-tenant <em>baref00t Partner Mail Sender</em>{' '}
          app. After that, the platform sends consent invitations, questionnaire links, and
          report-ready notifications <strong>from your mailbox</strong> (e.g.{' '}
          <code>security@your-domain.com</code>) using that consented app — your branding, your
          domain, no need to share your own Entra app credentials with baref00t.
        </p>
        <MailManagement status={platformStatus} upstreamError={platformError} />
      </Card>

      {/* (2) Portal-direct admin mail */}
      <Card>
        <CardHeader>
          <CardTitle>Portal-direct mail (admin notifications)</CardTitle>
          <Badge tone={portalSenderConfigured && azureConfigured ? 'brand' : 'neutral'}>
            {portalSenderConfigured && azureConfigured ? 'Ready' : 'Optional'}
          </Badge>
        </CardHeader>
        <p className="mb-4 text-sm text-[color:var(--color-text-muted)]">
          Sent by THIS portal directly via Microsoft Graph using <strong>your own Entra app</strong>{' '}
          (the same one configured for SSO via <code>AZURE_AD_CLIENT_ID</code>) plus{' '}
          <code>Mail.Send</code> (Application) permission. No OAuth dance — runs as the
          application. Used for branding test sends, future member invites, and any future
          portal-internal notifications. <strong>Independent of (1) above.</strong>
        </p>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-[color:var(--color-text-muted)]">Entra tenant</dt>
          <dd className="col-span-2 font-mono text-xs">
            {e.AZURE_AD_TENANT_ID ? `${e.AZURE_AD_TENANT_ID.slice(0, 8)}…` : <em className="text-[color:var(--color-red)]">unset</em>}
          </dd>
          <dt className="text-[color:var(--color-text-muted)]">App reg</dt>
          <dd className="col-span-2 font-mono text-xs">
            {e.AZURE_AD_CLIENT_ID ? `${e.AZURE_AD_CLIENT_ID.slice(0, 8)}…` : <em className="text-[color:var(--color-red)]">unset</em>}
          </dd>
          <dt className="text-[color:var(--color-text-muted)]">From address</dt>
          <dd className="col-span-2">
            {e.MAIL_FROM_ADDRESS || <em className="text-[color:var(--color-text-muted)]">unset — portal-direct mail disabled</em>}
          </dd>
          <dt className="text-[color:var(--color-text-muted)]">From display name</dt>
          <dd className="col-span-2">
            {e.MAIL_FROM_DISPLAY_NAME || <em className="text-[color:var(--color-text-muted)]">unset</em>}
          </dd>
        </dl>
        <div className="mt-4 border-t border-[color:var(--color-border)] pt-3 text-xs text-[color:var(--color-text-muted)]">
          <strong>Setup checklist</strong> (only if you want portal-direct mail; the platform mail
          above is independent):
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Add <code>Mail.Send</code> (Application) permission to your portal Entra app
              <code className="ml-1">{e.AZURE_AD_CLIENT_ID?.slice(0, 8)}…</code>
            </li>
            <li>Tenant admin grants admin consent</li>
            <li>
              Set <code>MAIL_FROM_ADDRESS</code> to a mailbox in your tenant + restart
            </li>
            <li>
              See <code>docs/MAIL-SETUP.md</code>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
