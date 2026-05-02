'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BareF00tApiError } from '@baref00t/sdk'
import type { BulkCustomerEntry } from '@baref00t/sdk/partner'

const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const createSchema = z.object({
  name: z.string().min(1, 'name required').max(120),
  tenantId: z.string().regex(guidRegex, 'tenantId must be a GUID'),
  email: z.string().email().or(z.literal('')).optional(),
  emailReportsEnabled: z.boolean().optional().default(false),
  emailConsentEnabled: z.boolean().optional().default(true),
  emailQuestionnaireEnabled: z.boolean().optional().default(true),
})

export interface ActionResult {
  ok: boolean
  error?: string
  customerId?: string
}

export async function createCustomerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    tenantId: formData.get('tenantId'),
    email: formData.get('email') || '',
    emailReportsEnabled: formData.get('emailReportsEnabled') === 'on',
    emailConsentEnabled: formData.get('emailConsentEnabled') !== null,
    emailQuestionnaireEnabled: formData.get('emailQuestionnaireEnabled') !== null,
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ') }
  }

  try {
    const result = await partnerClient().customers.create(parsed.data)
    revalidatePath('/customers')
    return { ok: true, customerId: result.customerId }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

const updateSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  tenantId: z.string().regex(guidRegex).optional(),
  emailReportsEnabled: z.boolean().optional(),
  emailConsentEnabled: z.boolean().optional(),
  emailQuestionnaireEnabled: z.boolean().optional(),
})

export async function updateCustomerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const customerId = String(formData.get('customerId') ?? '')
  const parsed = updateSchema.safeParse({
    customerId,
    name: formData.get('name') ?? undefined,
    email: formData.get('email') ?? undefined,
    tenantId: formData.get('tenantId') || undefined,
    emailReportsEnabled: formData.get('emailReportsEnabled') === 'on',
    emailConsentEnabled: formData.get('emailConsentEnabled') === 'on',
    emailQuestionnaireEnabled: formData.get('emailQuestionnaireEnabled') === 'on',
  })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }
  try {
    const { customerId: cid, ...rest } = parsed.data
    await partnerClient().customers.update(cid, rest)
    revalidatePath(`/customers/${customerId}`)
    revalidatePath('/customers')
    return { ok: true, customerId }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

export async function deleteCustomerAction(customerId: string) {
  try {
    await partnerClient().customers.delete(customerId)
  } catch (err) {
    logger().error({ customerId, err: humanise(err) }, 'deleteCustomerAction failed')
    throw new Error(humanise(err))
  }
  revalidatePath('/customers')
  redirect('/customers')
}

export async function bulkImportCustomersAction(
  _prev: { ok: boolean; total?: number; succeeded?: number; failed?: number; errors?: string[] } | null,
  formData: FormData,
): Promise<{ ok: boolean; total?: number; succeeded?: number; failed?: number; errors?: string[]; error?: string }> {
  const raw = formData.get('csv')
  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: 'CSV body is empty' }
  }

  // Lightweight CSV parser — name,tenantId,email,emailReportsEnabled
  // First line = header row.
  const rows = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (rows.length < 2) {
    return { ok: false, error: 'CSV must have a header row + at least one data row' }
  }
  const header = rows[0]!.split(',').map((s) => s.trim().toLowerCase())
  const idx = (col: string) => header.indexOf(col)
  const nameIdx = idx('name')
  const tenantIdx = idx('tenantid')
  const emailIdx = idx('email')
  if (nameIdx < 0 || tenantIdx < 0) {
    return { ok: false, error: 'CSV header must include `name` and `tenantId`' }
  }

  const entries: BulkCustomerEntry[] = []
  for (const row of rows.slice(1)) {
    const cells = row.split(',').map((c) => c.trim())
    const tenantIdRaw = cells[tenantIdx] ?? ''
    const nameRaw = cells[nameIdx] ?? ''
    if (!nameRaw || !guidRegex.test(tenantIdRaw)) continue
    const entry: BulkCustomerEntry = { name: nameRaw, tenantId: tenantIdRaw }
    if (emailIdx >= 0 && cells[emailIdx]) entry.email = cells[emailIdx]
    entries.push(entry)
  }
  if (entries.length === 0) {
    return { ok: false, error: 'No valid rows found (need name + GUID tenantId per row)' }
  }
  if (entries.length > 100) {
    return { ok: false, error: 'Maximum 100 customers per import' }
  }

  try {
    const result = await partnerClient().customers.bulkCreate({ customers: entries })
    revalidatePath('/customers')
    const errors = result.results.filter((r) => r.status === 'error').map((r) => `row ${r.index}: ${r.error}`)
    return {
      ok: result.failed === 0,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      errors,
    }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

function humanise(err: unknown): string {
  if (err instanceof BareF00tApiError) return `${err.code}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}
