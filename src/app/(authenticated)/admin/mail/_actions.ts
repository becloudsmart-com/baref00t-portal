'use server'

import { revalidatePath } from 'next/cache'
import {
  disconnectMail,
  sendMailTest,
  setMailMode,
  setSharedMailbox,
  type MailProvider,
} from '@/lib/partner-mail-api'

export interface ActionResult {
  ok: boolean
  message?: string
  error?: string
}

export async function setMailModeAction(mode: MailProvider): Promise<ActionResult> {
  if (mode !== 'resend' && mode !== 'microsoft' && mode !== 'off') {
    return { ok: false, error: 'Invalid mode' }
  }
  const result = await setMailMode(mode)
  if (!result.ok) return { ok: false, error: result.error }
  revalidatePath('/admin/mail')
  return { ok: true, message: `Mail provider set to ${mode}.` }
}

export async function disconnectMailAction(): Promise<ActionResult> {
  const result = await disconnectMail()
  if (!result.ok) return { ok: false, error: result.error }
  revalidatePath('/admin/mail')
  return { ok: true, message: 'Microsoft mailbox disconnected. Outbound mail will fall back to Resend until reconnected.' }
}

export async function sendMailTestAction(): Promise<ActionResult> {
  const result = await sendMailTest()
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
    }
  }
  return {
    ok: true,
    message: `Test email queued — check ${result.data.recipient} (sent from ${result.data.fromMailbox}).`,
  }
}

export async function setSharedMailboxAction(upn: string | null): Promise<ActionResult> {
  const trimmed = upn?.trim() || null
  if (trimmed && !trimmed.includes('@')) {
    return { ok: false, error: 'Shared mailbox must be a UPN (looks like an email).' }
  }
  const result = await setSharedMailbox(trimmed)
  if (!result.ok) return { ok: false, error: result.error }
  revalidatePath('/admin/mail')
  return {
    ok: true,
    message: trimmed ? `Shared mailbox set to ${trimmed}.` : 'Shared mailbox cleared — sending as the connected user.',
  }
}
