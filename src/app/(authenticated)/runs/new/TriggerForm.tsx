'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import type { PartnerCustomer } from '@baref00t/sdk/partner'
import {
  triggerAssessmentAction,
  sendConsentEmailAction,
  type TriggerResult,
  type SendConsentResult,
} from '../_actions'

interface Props {
  customers: PartnerCustomer[]
  products: string[]
  preselectedCustomerId: string | undefined
}

export function TriggerForm({ customers, products, preselectedCustomerId }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<TriggerResult | null, FormData>(
    triggerAssessmentAction,
    null,
  )
  const [consentState, consentAction, consentPending] = useActionState<SendConsentResult | null, FormData>(
    sendConsentEmailAction,
    null,
  )
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (state?.ok && state.runId) {
      router.push(`/runs/${state.runId}`)
    }
  }, [state, router])

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(t)
    }
  }, [copied])

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="customerId">Customer *</Label>
        <select
          id="customerId"
          name="customerId"
          required
          defaultValue={preselectedCustomerId ?? ''}
          className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select a customer…
          </option>
          {customers.map((c) => (
            <option key={c.customerId} value={c.customerId}>
              {c.name} ({c.tenantId.slice(0, 8)}…)
            </option>
          ))}
        </select>
        {customers.length === 0 && (
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            No customers yet. <Link className="underline" href="/customers/new">Create one first</Link>.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="product">Product *</Label>
        <select
          id="product"
          name="product"
          required
          className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select a product…
          </option>
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="maturityTarget">Maturity target (optional)</Label>
        <Input id="maturityTarget" name="maturityTarget" placeholder="e.g. level-2" />
        <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
          Product-specific. See product docs for valid values.
        </p>
      </div>

      {state && !state.ok && state.consentRequired && state.consentUrl && (
        <div className="space-y-3 rounded-md border border-[color:var(--color-amber,#d97706)] bg-[#d9770611] p-4 text-sm">
          <div>
            <strong className="block text-[color:var(--color-text)]">Customer consent required</strong>
            <p className="mt-1 text-[color:var(--color-text-muted)]">
              The selected customer hasn&apos;t granted Microsoft admin consent on their tenant yet. No
              credit was used. Share the consent link with them or send the consent email — once they
              accept, retry the assessment.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="consentUrl">Consent URL</Label>
            <div className="flex gap-2">
              <Input
                id="consentUrl"
                readOnly
                value={state.consentUrl}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (state.consentUrl) {
                    await navigator.clipboard.writeText(state.consentUrl)
                    setCopied(true)
                  }
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>

          <form action={consentAction} className="flex items-center justify-between gap-3 border-t border-[color:var(--color-border)] pt-3">
            <input type="hidden" name="customerId" value={state.customerId ?? ''} />
            <input type="hidden" name="product" value={state.product ?? ''} />
            <input type="hidden" name="maturityTarget" value={state.maturityTarget ?? ''} />
            <p className="text-xs text-[color:var(--color-text-muted)]">
              Or email the consent link to the customer&apos;s configured recipients.
            </p>
            <Button type="submit" disabled={consentPending}>
              {consentPending ? 'Sending…' : 'Send consent email'}
            </Button>
          </form>

          {consentState?.ok && (
            <div className="rounded border border-[color:var(--color-green,#15803d)] bg-[#15803d11] p-2 text-xs">
              {consentState.emailConsentEnabled === false ? (
                <>
                  Email <strong>not sent</strong> ({consentState.skipReason}). Share the consent URL
                  manually instead.
                </>
              ) : (
                <>
                  Sent to {consentState.sent}/{consentState.total} recipient
                  {consentState.total === 1 ? '' : 's'}
                  {consentState.failed && consentState.failed.length > 0 && (
                    <> — {consentState.failed.length} failed</>
                  )}.
                </>
              )}
            </div>
          )}
          {consentState && !consentState.ok && (
            <div className="rounded border border-[color:var(--color-red)] bg-[#ff444411] p-2 text-xs text-[color:var(--color-red)]">
              {consentState.error}
            </div>
          )}
        </div>
      )}

      {state && !state.ok && !state.consentRequired && (
        <div className="rounded-md border border-[color:var(--color-red)] bg-[#ff444411] p-3 text-sm text-[color:var(--color-red)]">
          {state.rateLimited ? (
            <>Rate-limited — retry after {state.retryAfterSeconds ?? '?'}s.</>
          ) : (
            state.error
          )}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Link href="/runs">
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isPending || customers.length === 0}>
          {isPending ? 'Triggering…' : 'Run assessment'}
        </Button>
      </div>
    </form>
  )
}
