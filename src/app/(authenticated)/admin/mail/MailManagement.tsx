'use client'

import { useState, useTransition } from 'react'
import { Loader2, Send, Unplug, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import {
  disconnectMailAction,
  sendMailTestAction,
  setMailModeAction,
  setSharedMailboxAction,
  type ActionResult,
} from './_actions'
import type { MailProvider, MailStatus } from '@/lib/partner-mail-api'

interface Props {
  status: MailStatus | null
  /** Public OAuth-connect URL (deep-link to the hosted SaaS). */
  connectUrl: string
  /** Whether the platform-side error means we couldn't read status at all. */
  upstreamError: string | null
}

export function MailManagement({ status, connectUrl, upstreamError }: Props) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [sharedMailboxDraft, setSharedMailboxDraft] = useState(status?.sharedMailbox ?? '')

  const provider: MailProvider = status?.provider ?? 'resend'
  const connected = Boolean(status?.connectedUserEmail)
  const tokenValid = status?.hasValidToken ?? false

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      setFeedback(null)
      try {
        const result = await action()
        setFeedback(result)
      } catch (err) {
        setFeedback({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    })
  }

  return (
    <div className="space-y-6">
      {upstreamError && (
        <Card className="border-[color:var(--color-amber)]">
          <p className="text-sm text-[color:var(--color-text-muted)]">
            Could not read mail provider state from the platform: {upstreamError}
          </p>
        </Card>
      )}

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.ok
              ? 'border-[color:var(--color-brand)] bg-[color:var(--color-brand)]/10 text-[color:var(--color-text)]'
              : 'border-[color:var(--color-red)] bg-[color:var(--color-red)]/10 text-[color:var(--color-text)]'
          }`}
        >
          {feedback.ok ? feedback.message : feedback.error}
        </div>
      )}

      {/* Mode selector — Stage-1 gate that drives whether outbound mail goes
          through the partner's mailbox, the platform's Resend account, or is
          suppressed entirely. */}
      <Card>
        <CardHeader>
          <CardTitle>Sender</CardTitle>
          <Badge tone={provider === 'microsoft' ? 'brand' : provider === 'off' ? 'danger' : 'neutral'}>
            {provider === 'microsoft' ? 'Microsoft 365' : 'Disabled'}
          </Badge>
        </CardHeader>
        <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
          Send customer-facing email (consent invitations, report-ready notifications) from your
          own Microsoft 365 tenant, or disable outbound mail entirely. Switching to{' '}
          <strong>Microsoft 365</strong> requires a connected mailbox below. When{' '}
          <strong>Disabled</strong>, the platform falls back to its default sender for any required
          system mail.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={provider === 'microsoft' ? 'primary' : 'secondary'}
            disabled={isPending || provider === 'microsoft' || !connected}
            title={!connected ? 'Connect a Microsoft mailbox first' : undefined}
            onClick={() => run(() => setMailModeAction('microsoft'))}
          >
            Use Microsoft 365
          </Button>
          <Button
            type="button"
            variant={provider === 'off' || provider === 'resend' ? 'primary' : 'secondary'}
            disabled={isPending || provider === 'off' || provider === 'resend'}
            onClick={() => run(() => setMailModeAction('off'))}
          >
            Disable
          </Button>
        </div>
      </Card>

      {/* Microsoft mailbox connection. The actual OAuth dance is hosted by
          baref00t (the Partner Mail Sender Entra app reg is platform-owned,
          multi-tenant). The portal just deep-links to it; the consent
          callback on baref00t.io persists tokens and the next status read
          from this portal will reflect the new connection. */}
      <Card>
        <CardHeader>
          <CardTitle>Microsoft mailbox connection</CardTitle>
          {connected && (
            <Badge tone={tokenValid ? 'brand' : 'warning'}>
              {tokenValid ? 'Connected' : 'Token expired'}
            </Badge>
          )}
        </CardHeader>

        {connected ? (
          <>
            <dl className="mb-4 grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-[color:var(--color-text-muted)]">Mailbox</dt>
              <dd className="col-span-2 font-mono">{status?.connectedUserEmail}</dd>
              <dt className="text-[color:var(--color-text-muted)]">Token expires</dt>
              <dd className="col-span-2 font-mono text-xs">
                {status?.tokenExpiresAt
                  ? new Date(status.tokenExpiresAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
                  : '(unknown)'}
              </dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={isPending}
                onClick={() => run(sendMailTestAction)}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send test to me
              </Button>
              <a href={connectUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="secondary">
                  <ExternalLink className="h-4 w-4" /> Reconnect mailbox
                </Button>
              </a>
              <Button
                type="button"
                variant="danger"
                disabled={isPending}
                onClick={() => {
                  if (!confirm('Disconnect the Microsoft mailbox? Outbound mail will fall back to Resend.')) return
                  run(disconnectMailAction)
                }}
              >
                <Unplug className="h-4 w-4" /> Disconnect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
              Connect a Microsoft 365 mailbox to send customer-facing mail from your own tenant.
              Consent is granted by an Admin on your tenant; the resulting refresh token is stored
              encrypted at rest by the platform.
            </p>
            <a href={connectUrl} target="_blank" rel="noreferrer">
              <Button type="button">
                <ExternalLink className="h-4 w-4" /> Connect Microsoft mailbox
              </Button>
            </a>
            <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
              Opens the Microsoft consent screen on baref00t.io. After consenting, return here and
              refresh — the status above will update.
            </p>
          </>
        )}
      </Card>

      {/* Optional shared-mailbox UPN — sends as a shared mailbox the
          consenting Admin owns rather than as their personal address.
          Hidden until the partner has connected. */}
      {connected && (
        <Card>
          <CardHeader>
            <CardTitle>Send-as shared mailbox (optional)</CardTitle>
          </CardHeader>
          <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
            By default mail goes out from <strong>{status?.connectedUserEmail}</strong>. Set a shared
            mailbox UPN below to send as a shared identity instead — the connecting Admin must own
            <em> Send As</em> permissions on the shared mailbox.
          </p>
          <form
            className="flex flex-wrap items-end gap-2"
            action={(formData) => {
              const upn = String(formData.get('sharedMailbox') ?? '')
              run(() => setSharedMailboxAction(upn || null))
            }}
          >
            <div className="min-w-[20rem] flex-1">
              <Label htmlFor="shared-mailbox-upn">Shared mailbox UPN</Label>
              <Input
                id="shared-mailbox-upn"
                name="sharedMailbox"
                type="email"
                value={sharedMailboxDraft}
                onChange={(e) => setSharedMailboxDraft(e.target.value)}
                placeholder="hello@yourcompany.com"
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {sharedMailboxDraft.trim() ? 'Set shared mailbox' : 'Clear shared mailbox'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
