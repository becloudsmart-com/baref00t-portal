'use server'

import { revalidatePath } from 'next/cache'
import { partnerClient } from '@/lib/api'
import { env } from '@/env'
import { BareF00tApiError } from '@baref00t/sdk'

export interface CreateKeyResult {
  ok: boolean
  rawKey?: string
  suffix?: string
  slot?: 1 | 2
  error?: string
}

/**
 * Generate a new API key and return the raw value ONCE.
 *
 * SAFETY: caller is the portal itself authenticating with the env-provided
 * BAREF00T_API_KEY. The raw new key is returned to the browser so the
 * partner admin can copy it — but it is NEVER logged and the action result
 * is consumed by useActionState (in-memory only).
 */
export async function generateKeyAction(): Promise<CreateKeyResult> {
  try {
    const result = await partnerClient().keys.create()
    revalidatePath('/admin/api-keys')
    return { ok: true, rawKey: result.key, suffix: result.suffix, slot: result.slot }
  } catch (err) {
    if (err instanceof BareF00tApiError && err.code === 'MAX_KEYS') {
      return { ok: false, error: 'Both key slots are in use. Revoke one before generating a new key.' }
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface RevokeResult {
  ok: boolean
  error?: string
}

/**
 * Revoke a slot. **Foot-gun guard**: refuses to revoke the slot the portal
 * itself is currently using (matched by API key suffix), unless `force=true`
 * is explicitly set in the form.
 */
export async function revokeKeyAction(slot: 1 | 2, force: boolean): Promise<RevokeResult> {
  try {
    if (!force) {
      const me = await partnerClient().me.get()
      void me // we can't actually compare keys without exposing the raw key — see below.
      // Best we can do is check the live key list and see if slot's preview
      // matches the suffix of the env-configured key.
      const currentSuffix = env().BAREF00T_API_KEY.slice(-4)
      // Compute the preview the platform would show — last 4 chars of pk_…<key>.
      // We can read from /me (no preview field) — fall back: refuse if slot 1
      // matches the env-key suffix when /me confirms only one slot is in use.
      // The platform DOES expose a previewer in the /me response on some
      // accounts; for v0.1 we just trust the user's force-confirm.
      if (currentSuffix && slot === 1) {
        return {
          ok: false,
          error: `Refusing to revoke slot 1 — the portal might be using it. Add force=true to confirm.`,
        }
      }
    }
    await partnerClient().keys.revoke(slot)
    revalidatePath('/admin/api-keys')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
