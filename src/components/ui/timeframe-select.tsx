'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { TIMEFRAME_OPTIONS, DEFAULT_TIMEFRAME, type Timeframe } from './timeframe'

export type { Timeframe } from './timeframe'

/**
 * URL-driven timeframe picker — button-group style matching the baref00t
 * SaaS health page (`apps/web/src/components/ui/stat-card.tsx#RangeSelector`).
 *
 * Changing the value updates `?timeframe=…` and triggers a server re-render,
 * so there's no client state and no hydration mismatch. The default value
 * is omitted from the URL to keep clean URLs (`/runs` not `/runs?timeframe=30d`).
 */
export function TimeframeSelect({ value }: { value: Timeframe }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()

  function setTo(next: Timeframe) {
    if (next === value) return
    const sp = new URLSearchParams(params?.toString() ?? '')
    if (next === DEFAULT_TIMEFRAME) sp.delete('timeframe')
    else sp.set('timeframe', next)
    const qs = sp.toString()
    start(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1"
      role="group"
      aria-label="Timeframe"
    >
      {TIMEFRAME_OPTIONS.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => setTo(o.value)}
            disabled={pending}
            aria-pressed={active}
            className={
              active
                ? 'rounded-[4px] border border-[color:var(--color-brand)] bg-[color:var(--color-brand-muted)] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[color:var(--color-brand)] disabled:opacity-60'
                : 'rounded-[4px] border border-transparent px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[color:var(--color-text-muted)] hover:border-[color:var(--color-brand)] hover:text-[color:var(--color-brand)] disabled:opacity-60'
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
