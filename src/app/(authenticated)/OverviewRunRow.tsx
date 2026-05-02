import Link from 'next/link'
import { TR, TD } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LocalTime } from '@/components/ui/local-time'
import { productMeta } from '@/lib/products'
import type { PartnerRun, PartnerCustomer } from '@baref00t/sdk/partner'

/** One row of the overview "Recent assessments" table. */
export function OverviewRunRow({
  run,
  customer,
}: {
  run: PartnerRun
  customer: PartnerCustomer | undefined
}) {
  const product = productMeta(run.product)
  const isCompleted = run.status === 'completed'
  return (
    <TR>
      <TD>
        <Link href={`/runs/${run.assessmentId}`} className="hover:underline">
          {product.label}
        </Link>
      </TD>
      <TD>
        {customer ? (
          <Link href={`/customers/${run.customerId}`} className="hover:underline">
            {customer.name}
          </Link>
        ) : (
          <span className="font-mono text-xs text-[color:var(--color-text-muted)]">
            {run.customerId.slice(0, 8)}…
          </span>
        )}
      </TD>
      <TD>
        <Badge tone={isCompleted ? 'brand' : run.status === 'failed' ? 'danger' : 'neutral'}>
          {run.status}
        </Badge>
      </TD>
      {/*
        Score isn't exposed on the list endpoint today (API returns runs only,
        not findings). Render a placeholder + send the user into the report
        for the actual numbers. Tracked in #325 — add `score` to PartnerRun
        when the platform surfaces it.
      */}
      <TD className="text-right font-mono text-xs text-[color:var(--color-text-muted)]">
        —
      </TD>
      <TD className="text-right text-xs text-[color:var(--color-text-muted)]">
        <LocalTime iso={run.runAt} />
      </TD>
      <TD className="text-right">
        {isCompleted ? (
          <Link
            href={`/runs/${run.assessmentId}/report`}
            className="text-xs uppercase tracking-wide text-[color:var(--color-brand)] hover:underline"
          >
            View report
          </Link>
        ) : (
          <span className="text-xs text-[color:var(--color-text-muted)]">—</span>
        )}
      </TD>
    </TR>
  )
}
