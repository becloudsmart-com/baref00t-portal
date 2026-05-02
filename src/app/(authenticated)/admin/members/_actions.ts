'use server'

import { revalidatePath } from 'next/cache'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BareF00tApiError } from '@baref00t/sdk'
import type { MemberRole } from '@baref00t/sdk/partner'

export interface ActionResult {
  ok: boolean
  error?: string
}

function toMessage(err: unknown): string {
  if (err instanceof BareF00tApiError) return `${err.code}: ${err.message}`
  return err instanceof Error ? err.message : String(err)
}

export async function inviteMemberAction(
  email: string,
  role: MemberRole,
): Promise<ActionResult> {
  const log = logger()
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) {
    return { ok: false, error: 'Valid email required.' }
  }
  try {
    await partnerClient().members.invite({ email: trimmed, role })
    revalidatePath('/admin/members')
    log.info({ email: trimmed, role }, 'Invited partner member')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err) }
  }
}

export async function changeRoleAction(
  emailHash: string,
  role: MemberRole,
): Promise<ActionResult> {
  try {
    await partnerClient().members.update(emailHash, { role })
    revalidatePath('/admin/members')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err) }
  }
}

export async function removeMemberAction(emailHash: string): Promise<ActionResult> {
  try {
    await partnerClient().members.remove(emailHash)
    revalidatePath('/admin/members')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err) }
  }
}

export async function resendInviteAction(emailHash: string): Promise<ActionResult> {
  try {
    await partnerClient().members.resendInvite(emailHash)
    revalidatePath('/admin/members')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: toMessage(err) }
  }
}
