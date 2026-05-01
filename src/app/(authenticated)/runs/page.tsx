import Link from 'next/link'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BareF00tApiError } from '@baref00t/sdk'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Assessments' }

interface PageProps {
  searchParams: Promise<{ month?: string; product?: string; customerId?: string }>
}

export default async function RunsPage({ searchParams }: PageProps) {
  const filters = await searchParams
  let result: Awaited<ReturnType<ReturnType<typeof partnerClient>['assessments']['list']>> | null = null
  let error: string | null = null

  try {
    result = await partnerClient().assessments.list({
      month: filters.month,
      product: filters.product,
      customerId: filters.customerId,
    })
  } catch (err) {
    error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Assessments</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {result ? `${result.total} runs · ${result.runsUsed}/${result.runLimit} used this month` : '…'}
          </p>
        </div>
        <Link href="/runs/new">
          <Button>Run new assessment</Button>
        </Link>
      </div>

      {error && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{error}</p>
        </Card>
      )}

      {result && result.runs.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-[color:var(--color-text-muted)]">No assessments match your filters.</p>
            <Link href="/runs/new">
              <Button className="mt-3">Run an assessment</Button>
            </Link>
          </div>
        </Card>
      ) : (
        result && (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH>Run id</TH>
                <TH className="text-right">Started</TH>
              </TR>
            </THead>
            <TBody>
              {result.runs.map((run) => (
                <TR key={run.runId}>
                  <TD>
                    <Link href={`/runs/${run.runId}`} className="hover:underline">
                      {run.product}
                    </Link>
                  </TD>
                  <TD className="font-mono text-xs">{run.customerId.slice(0, 8)}…</TD>
                  <TD>
                    <Badge tone={run.status === 'completed' ? 'brand' : run.status === 'failed' ? 'danger' : 'neutral'}>
                      {run.status}
                    </Badge>
                  </TD>
                  <TD className="font-mono text-xs">{run.runId.slice(0, 8)}…</TD>
                  <TD className="text-right text-xs text-[color:var(--color-text-muted)]">
                    {new Date(run.runAt).toISOString().slice(0, 16).replace('T', ' ')}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )
      )}
    </div>
  )
}
