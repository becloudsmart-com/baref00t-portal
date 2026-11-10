import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BareF00tApiError } from '@baref00t/sdk'
import type { PartnerBillingSnapshot, BillingInvoice } from '@baref00t/sdk/partner'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { LocalTime } from '@/components/ui/local-time'
import { ExternalLink, Download } from 'lucide-react'
import { ManagePaymentButton } from './ManagePaymentButton'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Billing' }

function formatAmount(cents: number, currency: string | null | undefined): string {
  const ccy = (currency ?? 'usd').toUpperCase()
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: ccy,
      currencyDisplay: 'symbol',
    }).format(cents / 100)
  } catch {
    // Fallback for unknown currency codes — show the raw cents/major.
    return `${(cents / 100).toFixed(2)} ${ccy}`
  }
}

function invoiceTone(status: string | null): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'paid':
      return 'success'
    case 'open':
    case 'draft':
      return 'warning'
    case 'uncollectible':
    case 'void':
      return 'danger'
    default:
      return 'neutral'
  }
}

function subscriptionTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'success'
    case 'past_due':
    case 'unpaid':
      return 'warning'
    case 'canceled':
    case 'incomplete_expired':
      return 'danger'
    default:
      return 'neutral'
  }
}

export default async function BillingPage() {
  const log = logger()
  let snapshot: PartnerBillingSnapshot | null = null
  let error: string | null = null

  try {
    snapshot = await partnerClient().billing.get()
  } catch (err) {
    if (err instanceof BareF00tApiError && err.status === 404) {
      error =
        'Billing requires baref00t platform v2.1.10 or later (X-Partner-Key auth on /partner/billing). Upgrade the backend or contact support.'
    } else {
      error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
      log.warn({ err }, 'billing.get failed')
    }
  }

  const primarySub = snapshot?.subscriptions?.[0] ?? null
  const invoices: BillingInvoice[] = snapshot?.invoices ?? []
  const portalUrl = snapshot?.portal_url ?? null

  const planLabel = primarySub?.plan ?? primarySub?.product ?? '—'
  const cadence = primarySub?.interval
    ? `${primarySub.interval_count && primarySub.interval_count > 1 ? `${primarySub.interval_count} ` : ''}${primarySub.interval}${primarySub.interval_count && primarySub.interval_count > 1 ? '' : 'ly'}`
    : '—'
  const status = primarySub?.status ?? 'unknown'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Subscription, invoices, and payment-method management. Plan changes happen on the
          baref00t SaaS dashboard or via the API — this view is read-only plus payment-method
          management through Stripe.
        </p>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-[color:var(--color-red)]">{error}</p>
        </Card>
      )}

      {snapshot && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Current plan"
              value={planLabel}
              hint={primarySub ? null : 'No active subscription'}
            />
            <StatCard
              label="Billing cadence"
              value={cadence}
              hint={primarySub?.amount != null ? formatAmount(primarySub.amount, primarySub.currency) : null}
            />
            <StatCard
              label="Status"
              value={
                <Badge tone={subscriptionTone(status)}>{status}</Badge>
              }
              hint={primarySub?.cancel_at_period_end ? 'Cancels at period end' : null}
            />
            <StatCard
              label="Next invoice"
              value={
                primarySub?.current_period_end ? (
                  <LocalTime iso={primarySub.current_period_end} />
                ) : (
                  '—'
                )
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment method</CardTitle>
            </CardHeader>
            <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
              Manage card, billing address, and tax IDs through Stripe&apos;s secure customer
              portal. Opens in a new tab.
            </p>
            <ManagePaymentButton initialUrl={portalUrl} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoices ({invoices.length})</CardTitle>
            </CardHeader>
            {invoices.length === 0 ? (
              <p className="rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text-muted)]">
                No invoices yet. They appear here as soon as Stripe finalises your first one.
              </p>
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Invoice</TH>
                    <TH>Date</TH>
                    <TH>Amount</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Download</TH>
                  </tr>
                </THead>
                <TBody>
                  {invoices.map((inv) => (
                    <TR key={inv.id ?? inv.number ?? inv.created}>
                      <TD>
                        <span className="font-mono text-xs">
                          {inv.number ?? inv.id?.slice(0, 12) ?? '—'}
                        </span>
                      </TD>
                      <TD className="text-xs text-[color:var(--color-text-muted)]">
                        <LocalTime iso={inv.created} />
                      </TD>
                      <TD>{formatAmount(inv.amount_due, inv.currency)}</TD>
                      <TD>
                        <Badge tone={invoiceTone(inv.status)}>{inv.status ?? 'unknown'}</Badge>
                      </TD>
                      <TD className="text-right">
                        <div className="flex justify-end gap-3 text-xs">
                          {inv.invoice_pdf && (
                            <a
                              href={inv.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[color:var(--color-brand)] hover:underline"
                            >
                              <Download className="h-3.5 w-3.5" /> PDF
                            </a>
                          )}
                          {inv.hosted_invoice_url && (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> View
                            </a>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
