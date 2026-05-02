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
  startConnectAction,
  type ActionResult,
} from './_actions'
import type { MailProvider, MailStatus } from '@/lib/partner-mail-api'

interface Props {
  status: MailStatus | null
  /** Whether the platform-side error means we couldn't read status at all. */
  upstreamError: string | null
}

export function MailManagement({ status, upstreamError }: Props) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [sharedMailboxDraft, setSharedMailboxDraft] = useState(status?.sharedMailbox ?? '')

  // F41 — start the consent flow via SDK (init returns the authorize URL)
  // and navigate the browser there. The OAuth callback at baref00t.io
  // bounces back here when complete, so the partner never has to log
  // into baref00t.io.
  function startConnect() {
    setFeedback(null)
    startTransition(async () => {
      const returnTo = `${window.location.origin}/admin/mail`
      const result = await startConnectAction({ returnTo })
      if (result.ok && result.authorizeUrl) {
        window.location.href = result.authorizeUrl
      } else {
        setFeedback({ ok: false, error: result.error ?? 'Failed to start consent flow.' })
      }
    })
  }

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

      {/* Sender selection — 3 options:
            • Off — platform doesn't send customer-facing email at all
            • On (Resend default) — generic baref00t-provider sender
            • Microsoft 365 (baref00t Partner Mail Sender) — Connect via
              the consent flow below; tokens stored on platform, mail
              sent FROM your mailbox using baref00t's multi-tenant Entra
              app authenticated by partner-tenant-resident permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Sender</CardTitle>
          <Badge tone={provider === 'microsoft' ? 'brand' : provider === 'off' ? 'danger' : 'neutral'}>
            {provider === 'microsoft'
              ? 'Microsoft 365'
              : provider === 'resend'
                ? 'On (Resend default)'
                : 'Off'}
          </Badge>
        </CardHeader>
        <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
          Choose how the platform sends customer-facing email (consent invitations, questionnaire
          links, report-ready notifications).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={provider === 'off' ? 'primary' : 'secondary'}
            disabled={isPending || provider === 'off'}
            onClick={() => run(() => setMailModeAction('off'))}
            title="No customer-facing emails sent"
          >
            Off
          </Button>
          <Button
            type="button"
            variant={provider === 'resend' ? 'primary' : 'secondary'}
            disabled={isPending || provider === 'resend'}
            onClick={() => run(() => setMailModeAction('resend'))}
            title="Platform sends via Resend default — generic baref00t-provider from-address"
          >
            On (Resend default)
          </Button>
          <Button
            type="button"
            variant={provider === 'microsoft' ? 'primary' : 'secondary'}
            disabled={isPending || provider === 'microsoft' || !connected}
            title={
              connected
                ? 'Platform sends via Microsoft Graph, FROM your mailbox'
                : 'Connect a Microsoft mailbox below first'
            }
            onClick={() => run(() => setMailModeAction('microsoft'))}
          >
            Microsoft 365 (FROM your mailbox)
          </Button>
        </div>
        <p className="mt-3 text-xs text-[color:var(--color-text-muted)]">
          <strong>Microsoft 365</strong> uses baref00t&apos;s multi-tenant Entra app (consented in
          your tenant via the Connect flow below) to send mail FROM your mailbox — your domain,
          no need to share your own Entra app credentials with baref00t.
        </p>
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
              <Button type="button" variant="secondary" disabled={isPending} onClick={startConnect}>
                <ExternalLink className="h-4 w-4" /> Reconnect mailbox
              </Button>
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
            <Button type="button" disabled={isPending} onClick={startConnect}>
              <ExternalLink className="h-4 w-4" /> Connect Microsoft mailbox
            </Button>
            <p className="mt-2 text-xs text-[color:var(--color-text-muted)]">
              Opens the Microsoft consent screen for your tenant. The OAuth callback briefly
              touches baref00t.io to exchange the auth code for tokens, then redirects back here
              automatically.
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
