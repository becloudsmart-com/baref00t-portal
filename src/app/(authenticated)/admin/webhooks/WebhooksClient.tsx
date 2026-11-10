'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import type {
  PartnerWebhookEvent,
  WebhookDelivery,
  WebhookEndpoint,
} from '@baref00t/sdk/partner'
import {
  createWebhookAction,
  toggleWebhookEnabledAction,
  rotateWebhookSecretAction,
  deleteWebhookAction,
  testWebhookAction,
  listDeliveriesAction,
  type CreateWebhookResult,
  type TestWebhookResult,
} from './_actions'

interface Props {
  initialEndpoints: WebhookEndpoint[]
  availableEvents: PartnerWebhookEvent[]
}

export function WebhooksClient({ initialEndpoints, availableEvents }: Props) {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>(initialEndpoints)
  const [secretReveal, setSecretReveal] = useState<{ endpointId: string; secret: string } | null>(
    null,
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [pending, start] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  function refreshEndpoint(updated: WebhookEndpoint) {
    setEndpoints((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
  }

  function handleCreate(formData: FormData) {
    setGlobalError(null)
    start(async () => {
      const result: CreateWebhookResult = await createWebhookAction(formData)
      if (!result.ok || !result.endpoint || !result.secret) {
        setGlobalError(result.error ?? 'Create failed')
        return
      }
      setEndpoints((prev) => [result.endpoint!, ...prev])
      setSecretReveal({ endpointId: result.endpoint.id, secret: result.secret })
      setCreateOpen(false)
    })
  }

  function handleToggle(endpoint: WebhookEndpoint) {
    setGlobalError(null)
    start(async () => {
      const result = await toggleWebhookEnabledAction(endpoint.id, !endpoint.enabled)
      if (!result.ok || !result.endpoint) {
        setGlobalError(result.error ?? 'Toggle failed')
        return
      }
      refreshEndpoint(result.endpoint)
    })
  }

  function handleDelete(endpoint: WebhookEndpoint) {
    if (
      !confirm(
        `Delete webhook ${endpoint.url}?\n\nThis stops all retries for any in-flight deliveries. Past delivery logs are preserved server-side for audit.`,
      )
    ) {
      return
    }
    setGlobalError(null)
    start(async () => {
      const result = await deleteWebhookAction(endpoint.id)
      if (!result.ok) {
        setGlobalError(result.error ?? 'Delete failed')
        return
      }
      setEndpoints((prev) => prev.filter((e) => e.id !== endpoint.id))
    })
  }

  return (
    <div className="space-y-4">
      {globalError && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{globalError}</p>
        </Card>
      )}

      {secretReveal && (
        <SecretRevealCard
          secret={secretReveal.secret}
          onAcknowledge={() => setSecretReveal(null)}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Endpoints ({endpoints.length})</CardTitle>
          {!createOpen ? (
            <Button onClick={() => setCreateOpen(true)} disabled={pending}>
              Add endpoint
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={pending}>
              Cancel
            </Button>
          )}
        </CardHeader>

        {createOpen && (
          <CreateForm
            availableEvents={availableEvents}
            onSubmit={handleCreate}
            disabled={pending}
          />
        )}

        {endpoints.length === 0 && !createOpen ? (
          <p className="py-6 text-center text-sm text-[color:var(--color-text-muted)]">
            No webhook endpoints configured yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--color-border)]">
            {endpoints.map((endpoint) => (
              <EndpointRow
                key={endpoint.id}
                endpoint={endpoint}
                onToggle={() => handleToggle(endpoint)}
                onDelete={() => handleDelete(endpoint)}
                onRotated={(updated, secret) => {
                  refreshEndpoint(updated)
                  setSecretReveal({ endpointId: updated.id, secret })
                }}
                pending={pending}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function CreateForm({
  availableEvents,
  onSubmit,
  disabled,
}: {
  availableEvents: PartnerWebhookEvent[]
  onSubmit: (fd: FormData) => void
  disabled: boolean
}) {
  return (
    <form
      action={onSubmit}
      className="mt-4 space-y-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-4"
    >
      <div>
        <Label htmlFor="wh-url">Endpoint URL</Label>
        <Input
          id="wh-url"
          name="url"
          type="url"
          required
          placeholder="https://hooks.example.com/baref00t"
        />
        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
          Must be HTTPS. baref00t signs every payload — verify with{' '}
          <code>verifyWebhookSignature</code> from <code>@baref00t/sdk/webhooks</code>.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Events</legend>
        <p className="mb-2 text-xs text-[color:var(--color-text-muted)]">
          Pick at least one event type. Use <code>*</code> to subscribe to everything (including
          future events).
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[...availableEvents, '*' as PartnerWebhookEvent]
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .map((ev) => (
              <label key={ev} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="events" value={ev} />
                <code className="text-xs">{ev}</code>
              </label>
            ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="wh-desc">Description (optional)</Label>
        <Input id="wh-desc" name="description" maxLength={200} placeholder="Slack channel, Pager bot, …" />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={disabled}>
          {disabled ? 'Creating…' : 'Create endpoint'}
        </Button>
      </div>
    </form>
  )
}

function EndpointRow({
  endpoint,
  onToggle,
  onDelete,
  onRotated,
  pending,
}: {
  endpoint: WebhookEndpoint
  onToggle: () => void
  onDelete: () => void
  onRotated: (updated: WebhookEndpoint, secret: string) => void
  pending: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [deliveries, setDeliveries] = useState<WebhookDelivery[] | null>(null)
  const [loadingDeliveries, setLoadingDeliveries] = useState(false)
  const [testResult, setTestResult] = useState<TestWebhookResult | null>(null)
  const [rowPending, startRow] = useTransition()
  const [rowError, setRowError] = useState<string | null>(null)

  function handleExpand() {
    const next = !expanded
    setExpanded(next)
    if (next && !deliveries) {
      setLoadingDeliveries(true)
      startRow(async () => {
        const result = await listDeliveriesAction(endpoint.id)
        setLoadingDeliveries(false)
        if (result.ok) setDeliveries(result.deliveries ?? [])
        else setRowError(result.error ?? 'Failed to load deliveries')
      })
    }
  }

  function handleTest() {
    setTestResult(null)
    setRowError(null)
    startRow(async () => {
      const result = await testWebhookAction(endpoint.id)
      setTestResult(result)
      if (!result.ok) setRowError(result.error ?? 'Test failed')
      // Refresh deliveries since the test creates one.
      if (expanded) {
        const refreshed = await listDeliveriesAction(endpoint.id)
        if (refreshed.ok) setDeliveries(refreshed.deliveries ?? [])
      }
    })
  }

  function handleRotate() {
    if (
      !confirm(
        `Rotate signing secret for ${endpoint.url}?\n\nThe previous secret stops working immediately — you'll need to update your receiver before the next delivery can be verified.`,
      )
    ) {
      return
    }
    setRowError(null)
    startRow(async () => {
      const result = await rotateWebhookSecretAction(endpoint.id)
      if (!result.ok || !result.endpoint || !result.secret) {
        setRowError(result.error ?? 'Rotate failed')
        return
      }
      onRotated(result.endpoint, result.secret)
    })
  }

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleExpand}
          className="mt-0.5 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
          aria-label={expanded ? 'Collapse' : 'Expand'}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-sm" title={endpoint.url}>
              {endpoint.url}
            </span>
            {endpoint.enabled ? (
              <Badge tone="success">enabled</Badge>
            ) : (
              <Badge tone="neutral">disabled</Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {endpoint.events.map((ev) => (
              <Badge key={ev} tone="brand">
                {ev}
              </Badge>
            ))}
          </div>
          {endpoint.description && (
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
              {endpoint.description}
            </p>
          )}
          <p className="mt-1 text-[11px] text-[color:var(--color-text-muted)]">
            Secret <code>{endpoint.secretPreview}</code> · Last success{' '}
            {endpoint.lastSuccessAt ? short(endpoint.lastSuccessAt) : 'never'} · Failures{' '}
            <span
              className={
                endpoint.failureCount > 0
                  ? 'text-[color:var(--color-amber,#d97706)]'
                  : ''
              }
            >
              {endpoint.failureCount}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={endpoint.enabled}
              onChange={onToggle}
              disabled={pending || rowPending}
            />
            on
          </label>
          <Button size="sm" variant="secondary" onClick={handleTest} disabled={pending || rowPending}>
            Test
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRotate} disabled={pending || rowPending}>
            Rotate secret
          </Button>
          <Button size="sm" variant="danger" onClick={onDelete} disabled={pending || rowPending}>
            Delete
          </Button>
        </div>
      </div>

      {(testResult || rowError) && (
        <div className="ml-7 mt-2">
          {rowError && <p className="text-xs text-[color:var(--color-red)]">{rowError}</p>}
          {testResult && testResult.ok && (
            <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-2 text-xs">
              <strong>Test fired:</strong> {testResult.delivered ? 'delivered' : 'failed'} · status{' '}
              {testResult.statusCode ?? 'n/a'} · {testResult.durationMs}ms
              {testResult.lastError && (
                <div className="mt-1 text-[color:var(--color-red)]">error: {testResult.lastError}</div>
              )}
              {testResult.responseBody && (
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[10px] text-[color:var(--color-text-muted)]">
                  {testResult.responseBody}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="ml-7 mt-3 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-muted)]">
            Recent deliveries (last 50)
          </h4>
          {loadingDeliveries ? (
            <p className="text-xs text-[color:var(--color-text-muted)]">Loading…</p>
          ) : deliveries === null ? (
            <p className="text-xs text-[color:var(--color-text-muted)]">No data.</p>
          ) : deliveries.length === 0 ? (
            <p className="text-xs text-[color:var(--color-text-muted)]">
              No deliveries yet. Hit <strong>Test</strong> above to fire a synthetic event.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {deliveries.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-0.5 rounded border border-[color:var(--color-border)] p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <DeliveryStatusBadge status={d.status} />
                    <code>{d.eventType}</code>
                    <span className="text-[color:var(--color-text-muted)]">
                      attempt {d.attemptCount} · {d.statusCode ?? 'n/a'} · {d.durationMs}ms
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-[color:var(--color-text-muted)]">
                      {short(d.createdAt)}
                    </span>
                  </div>
                  {d.lastError && (
                    <span className="text-[color:var(--color-red)]">last error: {d.lastError}</span>
                  )}
                  {d.nextRetryAt && (
                    <span className="text-[color:var(--color-text-muted)]">
                      next retry: {short(d.nextRetryAt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

function DeliveryStatusBadge({ status }: { status: WebhookDelivery['status'] }) {
  switch (status) {
    case 'Delivered':
      return <Badge tone="success">{status}</Badge>
    case 'Failed':
    case 'Abandoned':
      return <Badge tone="danger">{status}</Badge>
    case 'Pending':
    default:
      return <Badge tone="warning">{status}</Badge>
  }
}

function SecretRevealCard({
  secret,
  onAcknowledge,
}: {
  secret: string
  onAcknowledge: () => void
}) {
  const [acknowledged, setAcknowledged] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(secret).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Card className="border-[color:var(--color-brand)]">
      <CardHeader>
        <CardTitle>New signing secret — store it now</CardTitle>
      </CardHeader>
      <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
        This is the <strong>only time</strong> the raw secret will be shown. Copy it into your
        receiver&apos;s config before clicking <strong>I&apos;ve saved it</strong>.
      </p>
      <div className="flex items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
        <code className="flex-1 break-all font-mono text-xs">{secret}</code>
        <Button variant="secondary" size="sm" onClick={handleCopy} className="shrink-0">
          {copied ? (
            <>
              <Check className="h-4 w-4" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy
            </>
          )}
        </Button>
      </div>
      <label className="mt-4 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        I have stored the secret in my receiver&apos;s config.
      </label>
      <Button
        disabled={!acknowledged}
        onClick={onAcknowledge}
        className="mt-3"
        variant="secondary"
      >
        I&apos;ve saved it
      </Button>
    </Card>
  )
}

function short(iso: string): string {
  try {
    return new Date(iso).toISOString().replace('T', ' ').slice(0, 19)
  } catch {
    return iso
  }
}
