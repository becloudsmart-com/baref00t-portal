import * as React from 'react'
import { cn } from '@/lib/cn'

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: string | number
  hint?: string
  tone?: 'neutral' | 'brand' | 'warning' | 'danger'
}

const toneText: Record<NonNullable<StatCardProps['tone']>, string> = {
  neutral: 'text-[color:var(--color-text)]',
  brand: 'text-[color:var(--color-brand)]',
  warning: 'text-[color:var(--color-amber)]',
  danger: 'text-[color:var(--color-red)]',
}

export function StatCard({ label, value, hint, tone = 'neutral', className, ...props }: StatCardProps) {
  return (
    <div className={cn('surface p-5', className)} {...props}>
      <div className="text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">{label}</div>
      <div className={cn('mt-1 text-3xl font-semibold tabular-nums', toneText[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-[color:var(--color-text-muted)]">{hint}</div>}
    </div>
  )
}
