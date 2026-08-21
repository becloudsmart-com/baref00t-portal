'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useMemo } from 'react'
import type { PartnerCustomer } from '@baref00t/sdk/partner'
import { groupByCategory, type ProductMeta } from '@/lib/products'

interface Props {
  product: string
  customerId: string
  /** Optional category filter — purely client-side; gates the product
   *  dropdown but doesn't affect the server fetch (rows are filtered by
   *  product/customer on the server, category is derived). */
  category: string
  productOptions: ProductMeta[]
  customerOptions: PartnerCustomer[]
}

/**
 * Server-driven filters — selecting a value pushes a URL search param
 * change; the page server-renders against the new filters. No client
 * state and no hydration mismatch.
 *
 * v2.4.0 RC+1: split the single grouped product picker into two dependent
 * dropdowns (Category → Product) so the 31-product list is filtered down
 * to ~4–12 options per category before the user picks a SKU.
 */
export function RunsFilters({ product, customerId, category, productOptions, customerOptions }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  // Category facets — only categories that have at least one allowed
  // product show up so partners on a starter plan don't see empty groups.
  const groups = useMemo(() => groupByCategory(productOptions), [productOptions])

  function update(patch: Record<string, string>) {
    const sp = new URLSearchParams(params?.toString() ?? '')
    for (const [key, value] of Object.entries(patch)) {
      if (value) sp.set(key, value)
      else sp.delete(key)
    }
    const qs = sp.toString()
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  function clearAll() {
    const sp = new URLSearchParams(params?.toString() ?? '')
    sp.delete('product')
    sp.delete('customerId')
    sp.delete('category')
    const qs = sp.toString()
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  const hasFilter = !!(product || customerId || category)

  // Product list filtered by selected category (if any).
  const visibleProducts = useMemo(() => {
    if (!category) return productOptions
    return productOptions.filter((p) => p.category === category)
  }, [productOptions, category])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
        <span className="uppercase tracking-wide">Category</span>
        <select
          value={category}
          onChange={(e) => {
            const next = e.target.value
            // Drop the product filter if the currently-selected product no
            // longer belongs to the new category — prevents a "filters
            // show no rows" dead state.
            const patch: Record<string, string> = { category: next }
            if (next && product) {
              const meta = productOptions.find((p) => p.slug === product)
              if (meta && meta.category !== next) patch.product = ''
            }
            update(patch)
          }}
          disabled={pending}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2 py-1 text-sm text-[color:var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] disabled:opacity-60"
        >
          <option value="">All categories</option>
          {groups.map((g) => (
            <option key={g.category} value={g.category}>
              {g.label}
            </option>
          ))}
        </select>
      </label>

      <label className="inline-flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
        <span className="uppercase tracking-wide">Product</span>
        <select
          value={product}
          onChange={(e) => update({ product: e.target.value })}
          disabled={pending}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-2 py-1 text-sm text-[color:var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-brand)] disabled:opacity-60"
        >
          <option value="">All products</option>
          {visibleProducts.map((p) => {
            const suffix = p.comingSoon ? ' (Coming Soon)' : ''
            return (
              <option key={p.slug} value={p.slug} disabled={p.comingSoon}>
                {p.label}{suffix}
              </option>
            )
          })}
        </select>
      </label>

      <label className="inline-flex items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
        <span className="uppercase tracking-wide">Customer</span>
        <select
          value={customerId}
          onChange={(e) => update({ customerId: e.target.value })}
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
