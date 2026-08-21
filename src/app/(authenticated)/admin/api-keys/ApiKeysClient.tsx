'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { generateKeyAction, revokeKeyAction, type CreateKeyResult } from './_actions'
import { Copy, Check } from 'lucide-react'
import type { PartnerKeySlot } from '@baref00t/sdk/partner'

export function ApiKeysClient({
  currentSuffix,
  keys,
}: {
  currentSuffix: string
  keys: PartnerKeySlot[]
}) {
  const [pending, start] = useTransition()
  const [created, setCreated] = useState<CreateKeyResult | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)
  const [revokeError, setRevokeError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    setRevokeError(null)
    start(async () => {
      const result = await generateKeyAction()
      setCreated(result)
      setAcknowledged(false)
    })
  }

  function handleCopy(value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleRevoke(slot: 1 | 2, suffix: string) {
    const portalIsUsingThisSlot = suffix === currentSuffix
    const isOnlyKey = keys.length === 1
    if (isOnlyKey) {
      alert(
        'You cannot revoke your only active API key — that would lock the portal out of the platform with no way to authenticate. Generate a second key first, update your env, then come back here to revoke this one.',
      )
      return
    }
    const confirmMsg = portalIsUsingThisSlot
      ? `WARNING: this portal is currently authenticating with slot ${slot} (suffix …${suffix}). Revoking it will lock this portal out until you redeploy with a new key.\n\nAre you ABSOLUTELY SURE?`
      : `Revoke API key in slot ${slot} (suffix …${suffix})? This is permanent.`
    if (!confirm(confirmMsg)) return

    setRevokeError(null)
    start(async () => {
      const result = await revokeKeyAction(slot, true /* force after explicit confirm */)
      if (!result.ok) setRevokeError(result.error ?? 'Revoke failed')
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active keys</CardTitle>
          <Button onClick={handleGenerate} disabled={pending}>
            {pending ? 'Generating…' : 'Generate new key'}
          </Button>
        </CardHeader>

        <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
          The portal is currently authenticating with a key ending in{' '}
          <span className="font-mono">…{currentSuffix}</span>.
        </p>

        {keys.length === 0 ? (
          <p className="rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text-muted)]">
            No active API keys returned by the platform. This is unusual for a
            signed-in partner — refresh the page or contact support.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {keys.map(({ slot, suffix }) => {
              const isCurrentlyUsed = suffix === currentSuffix
              return (
                <div
                  key={slot}
                  className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] p-3"
                >
                  <div>
                    <div className="text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
                      Slot {slot}
                      {isCurrentlyUsed && (
                        <span className="ml-2 rounded bg-[color:var(--color-brand)] bg-opacity-20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--color-brand)]">
                          in use
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm">pk_…{suffix}</div>
                    <div className="text-xs text-[color:var(--color-text-muted)]">
                      {isCurrentlyUsed
                        ? 'Active key for this portal — revoking locks you out.'
                        : 'Safe to revoke if no other system uses it.'}
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRevoke(slot, suffix)}
                    disabled={pending || keys.length === 1}
                    title={
                      keys.length === 1
                        ? 'Cannot revoke your only key — generate a second key first'
                        : undefined
                    }
                  >
                    Revoke
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {revokeError && (
          <p className="mt-3 text-sm text-[color:var(--color-red)]">{revokeError}</p>
        )}
      </Card>

      {created?.ok && created.rawKey && (
        <Card className="border-[color:var(--color-brand)]">
          <CardHeader>
            <CardTitle>New key generated — store it now</CardTitle>
          </CardHeader>
          <p className="mb-3 text-sm text-[color:var(--color-text-muted)]">
            This is the <strong>only time</strong> the raw key value will be shown.
            Copy it to your secrets store before navigating away.
          </p>
          <div className="flex items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3">
            <code className="flex-1 break-all font-mono text-xs">{created.rawKey}</code>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopy(created.rawKey!)}
              className="shrink-0"
            >
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </Button>
          </div>
          <p className="mt-3 text-xs text-[color:var(--color-text-muted)]">
            Slot {created.slot} · suffix …{created.suffix}
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            I have saved the key value to my secrets store and updated my portal&apos;s env.
          </label>
          <Button
            disabled={!acknowledged}
            onClick={() => setCreated(null)}
            className="mt-3"
            variant="secondary"
          >
            Done
          </Button>
        </Card>
      )}

      {created && !created.ok && (
        <Card className="border-[color:var(--color-red)]">
          <p className="text-sm text-[color:var(--color-red)]">{created.error}</p>
        </Card>
      )}
    </div>
  )
}
