'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import type { PartnerCustomer } from '@baref00t/sdk/partner'
import { triggerAssessmentAction, type TriggerResult } from '../_actions'

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

  useEffect(() => {
    if (state?.ok && state.runId) {
      router.push(`/runs/${state.runId}`)
    }
  }, [state, router])

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

      {state && !state.ok && (
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
