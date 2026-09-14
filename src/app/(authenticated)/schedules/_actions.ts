'use server'

import { revalidatePath } from 'next/cache'
import { partnerClient } from '@/lib/api'
import { BareF00tApiError } from '@baref00t/sdk'
import type { CadenceType } from '@baref00t/sdk/partner'

export interface ScheduleActionResult {
  ok: boolean
  error?: string
  overQuota?: boolean
}

function humanise(err: unknown): string {
  if (err instanceof BareF00tApiError) return `${err.code}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

export interface CreateScheduleInput {
  product: string
  cadenceType: CadenceType
  customIntervalDays?: number | null
  maturityTarget?: string | null
}

export async function createScheduleAction(
  customerId: string,
  input: CreateScheduleInput,
): Promise<ScheduleActionResult> {
  try {
    await partnerClient().schedules.create(customerId, {
      product: input.product,
      cadenceType: input.cadenceType,
      ...(input.customIntervalDays != null && { customIntervalDays: input.customIntervalDays }),
      ...(input.maturityTarget ? { maturityTarget: input.maturityTarget } : {}),
    })
    revalidatePath('/schedules')
    return { ok: true }
  } catch (err) {
    if (err instanceof BareF00tApiError && err.status === 409) {
      return { ok: false, error: 'A schedule already exists for this customer + product' }
    }
    return { ok: false, error: humanise(err) }
  }
}

export interface UpdateScheduleInput {
  cadenceType?: CadenceType
  customIntervalDays?: number | null
  maturityTarget?: string | null
  enabled?: boolean
}

export async function updateScheduleAction(
  scheduleId: string,
  input: UpdateScheduleInput,
): Promise<ScheduleActionResult> {
  try {
    await partnerClient().schedules.update(scheduleId, input)
    revalidatePath('/schedules')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

export async function deleteScheduleAction(scheduleId: string): Promise<ScheduleActionResult> {
  try {
    await partnerClient().schedules.delete(scheduleId)
    revalidatePath('/schedules')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}

export async function runScheduleNowAction(scheduleId: string): Promise<ScheduleActionResult> {
  try {
    const resp = await partnerClient().schedules.runNow(scheduleId)
    revalidatePath('/schedules')
    return { ok: true, overQuota: resp.overQuota }
  } catch (err) {
    return { ok: false, error: humanise(err) }
  }
}
