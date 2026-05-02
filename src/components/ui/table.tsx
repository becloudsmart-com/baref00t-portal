import * as React from 'react'
import { cn } from '@/lib/cn'

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-md border border-[color:var(--color-border)]">
      <table className={cn('w-full text-left text-sm', className)} {...props} />
    </div>
  )
}

export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className="bg-[color:var(--color-bg-elev)] text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]"
      {...props}
    />
  )
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className="divide-y divide-[color:var(--color-border)]" {...props} />
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn('hover:bg-[color:var(--color-bg-elev)]', className)}
      {...props}
    />
  )
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn('px-4 py-2.5 font-medium', className)} {...props} />
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3', className)} {...props} />
}
