import Link from 'next/link'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BareF00tApiError } from '@baref00t/sdk'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Customers' }

export default async function CustomersPage() {
  let result: Awaited<ReturnType<ReturnType<typeof partnerClient>['customers']['list']>> | null = null
  let error: string | null = null
  try {
    result = await partnerClient().customers.list()
  } catch (err) {
    error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {result?.total ?? '?'} total
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/customers/import">
            <Button variant="secondary">Bulk import</Button>
          </Link>
          <Link href="/customers/new">
            <Button>New customer</Button>
          </Link>
        </div>
      </div>

      {error && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{error}</p>
        </Card>
      )}

      {result && result.customers.length === 0 ? (
        <Card>
          <div className="py-8 text-center">
            <p className="text-[color:var(--color-text-muted)]">No customers yet.</p>
            <Link href="/customers/new">
              <Button className="mt-3">Add your first customer</Button>
            </Link>
          </div>
        </Card>
      ) : (
        result && (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Email</TH>
                <TH>Tenant id</TH>
                <TH>Status</TH>
                <TH className="text-right">Created</TH>
              </TR>
            </THead>
            <TBody>
              {result.customers.map((c) => (
                <TR key={c.customerId}>
                  <TD>
                    <Link className="hover:underline" href={`/customers/${c.customerId}`}>
                      {c.name}
                    </Link>
                  </TD>
                  <TD className="text-[color:var(--color-text-muted)]">{c.email || '—'}</TD>
                  <TD className="font-mono text-xs">{c.tenantId}</TD>
                  <TD>
                    <Badge tone={c.status === 'archived' ? 'neutral' : 'brand'}>
                      {c.status || 'active'}
                    </Badge>
                  </TD>
                  <TD className="text-right text-xs text-[color:var(--color-text-muted)]">
                    {new Date(c.createdAt).toISOString().slice(0, 10)}
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
