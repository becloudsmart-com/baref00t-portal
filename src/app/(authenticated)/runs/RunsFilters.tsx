'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import type { PartnerCustomer } from '@baref00t/sdk/partner'
import type { ProductMeta } from '@/lib/products'

interface Props {
  product: string
  customerId: string
  productOptions: ProductMeta[]
  customerOptions: PartnerCustomer[]
}

/**
 * Server-driven filters — selecting a value pushes a URL search param
 * change; the page server-renders against the new filters. No client
 * state and no hydration mismatch.
 */
export function RunsFilters({ product, customerId, productOptions, customerOptions }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  function update(key: 'product' | 'customerId', value: string) {
    const sp = new URLSearchParams(params?.toString() ?? '')
    if (value) sp.set(key, value)
    else sp.delete(key)
    const qs = sp.toString()
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  function clearAll() {
    const sp = new URLSearchParams(params?.toString() ?? '')
    sp.delete('product')
    sp.delete('customerId')
    const qs = sp.toString()
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  const hasFilter = !!(product || customerId)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
        <span className="uppercase tracking-wide">Product</span>
        <select
          value={product}
          onChange={(e) => update('product', e.target.value)}
          disabled={pending}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2 py-1 text-sm text-[color:var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] disabled:opacity-60"
        >
          <option value="">All products</option>
          {productOptions.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
        <span className="uppercase tracking-wide">Customer</span>
        <select
          value={customerId}
          onChange={(e) => update('customerId', e.target.value)}
          disabled={pending}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2 py-1 text-sm text-[color:var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] disabled:opacity-60"
        >
          <option value="">All customers</option>
          {customerOptions.map((c) => (
            <option key={c.customerId} value={c.customerId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {hasFilter && (
        <button
          type="button"
          onClick={clearAll}
          disabled={pending}
          className="rounded-md border border-transparent px-2 py-1 text-xs uppercase tracking-wide text-[color:var(--color-text-muted)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)] disabled:opacity-60"
        >
          Clear
        </button>
      )}
    </div>
  )
}
