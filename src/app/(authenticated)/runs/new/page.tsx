import { partnerClient } from '@/lib/api'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { TriggerForm } from './TriggerForm'
import Link from 'next/link'
import { BareF00tApiError } from '@baref00t/sdk'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Run new assessment' }

interface PageProps {
  searchParams: Promise<{ customerId?: string }>
}

export default async function NewRunPage({ searchParams }: PageProps) {
  const { customerId } = await searchParams
  const client = partnerClient()

  let customers: Awaited<ReturnType<typeof client.customers.list>> | null = null
  let products: string[] = []
  let me: Awaited<ReturnType<typeof client.me.get>> | null = null
  let error: string | null = null

  try {
    ;[customers, products, me] = await Promise.all([
      client.customers.list(),
      client.products.list(),
      client.me.get(),
    ])
  } catch (err) {
    error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          <Link href="/runs" className="hover:underline">
            ← Assessments
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Run new assessment</h1>
        {me && (
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {me.runsUsed}/{me.runLimit} used this month on plan {me.planName}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>

        {error ? (
          <p className="text-sm text-[color:var(--color-red)]">{error}</p>
        ) : (
          <TriggerForm
            customers={customers?.customers ?? []}
            products={products}
            preselectedCustomerId={customerId}
          />
        )}
      </Card>
    </div>
  )
}
