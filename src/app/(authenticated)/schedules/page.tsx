import { partnerClient } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { BareF00tApiError } from '@baref00t/sdk'
import type { RecurringSchedule, QuotaForecast, PartnerCustomer } from '@baref00t/sdk/partner'
import { allowedProducts } from '@/lib/products'
import { SchedulesManager } from './SchedulesManager'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Schedules' }

export default async function SchedulesPage() {
  const client = partnerClient()
  let schedules: RecurringSchedule[] = []
  let customers: PartnerCustomer[] = []
  let productSlugs: string[] = []
  let forecast: QuotaForecast | null = null
  let error: string | null = null

  try {
    const [s, c, p, f] = await Promise.all([
      client.schedules.list(),
      client.customers.list(),
      client.products.list(),
      client.schedules.quotaForecast(),
    ])
    schedules = s.schedules ?? []
    customers = c.customers ?? []
    productSlugs = p ?? []
    forecast = f
  } catch (err) {
    error = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
  }

  const products = allowedProducts(productSlugs).map((pm) => ({ slug: pm.slug, label: pm.label }))
  const customerOpts = customers.map((c) => ({ id: c.customerId, name: c.name }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Recurring Assessments</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Schedule assessments to run automatically for your customers on a cadence.
        </p>
      </div>

      {error && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{error}</p>
        </Card>
      )}

      <SchedulesManager
        initialSchedules={schedules}
        customers={customerOpts}
        products={products}
        forecast={forecast}
      />
    </div>
  )
}
