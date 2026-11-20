import * as React from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand'

const toneClass: Record<Tone, string> = {
  neutral: 'bg-[color:var(--color-bg-elev)] text-[color:var(--color-text-muted)]',
  success: 'bg-[color:var(--color-brand-muted)] text-[color:var(--color-brand)]',
  warning: 'bg-[#ffb02022] text-[color:var(--color-amber)]',
  danger: 'bg-[#ff444422] text-[color:var(--color-red)]',
  brand: 'bg-[color:var(--color-brand-muted)] text-[color:var(--color-brand)]',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  )
}
