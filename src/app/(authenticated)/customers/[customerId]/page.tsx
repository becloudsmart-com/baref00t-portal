import Link from 'next/link'
import { notFound } from 'next/navigation'
import { partnerClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BareF00tApiError } from '@baref00t/sdk'
import { CustomerDetailForm } from './CustomerDetailForm'
import { DeleteCustomerForm } from './DeleteCustomerForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ customerId: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { customerId } = await params
  return { title: `Customer ${customerId.slice(0, 8)}…` }
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { customerId } = await params
  const client = partnerClient()

  let customer: Awaited<ReturnType<typeof client.customers.get>> | null = null
  let recentRuns: Awaited<ReturnType<typeof client.assessments.list>> | null = null

  try {
    customer = await client.customers.get(customerId)
  } catch (err) {
    if (err instanceof BareF00tApiError && err.status === 404) notFound()
    throw err
  }
  try {
    recentRuns = await client.assessments.list({ customerId })
  } catch {
    // non-fatal — show the customer page without runs
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[color:var(--color-text-muted)]">
            <Link href="/customers" className="hover:underline">
              ← Customers
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{customer.name}</h1>
          <p className="font-mono text-xs text-[color:var(--color-text-muted)]">
            {customer.customerId}
          </p>
        </div>
        <Link href={`/runs/new?customerId=${encodeURIComponent(customer.customerId)}`}>
          <Button>Run assessment</Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer details</CardTitle>
            </CardHeader>
            <CustomerDetailForm customer={customer} />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent assessments</CardTitle>
              <Link
                href={`/runs?customerId=${encodeURIComponent(customer.customerId)}`}
                className="text-sm text-[color:var(--color-text-muted)] hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            {recentRuns && recentRuns.runs.length > 0 ? (
              <ul className="divide-y divide-[color:var(--color-border)]">
                {recentRuns.runs.slice(0, 10).map((run) => (
                  <li key={run.runId} className="py-2 text-sm">
                    <Link href={`/runs/${run.assessmentId}`} className="hover:underline">
                      {run.product}
                    </Link>{' '}
                    <Badge tone={run.status === 'completed' ? 'brand' : 'neutral'}>{run.status}</Badge>{' '}
                    <span className="text-[color:var(--color-text-muted)]">
                      — {new Date(run.runAt).toISOString().slice(0, 10)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[color:var(--color-text-muted)]">No assessments yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant</CardTitle>
            </CardHeader>
            <p className="font-mono text-xs">{customer.tenantId}</p>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-[color:var(--color-red)]">Danger zone</CardTitle>
            </CardHeader>
            <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
              Deleting a customer is permanent. Past assessments are retained.
            </p>
            <DeleteCustomerForm customerId={customer.customerId} customerName={customer.name} />
          </Card>
        </div>
      </div>
    </div>
  )
}
