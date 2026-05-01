'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { generateKeyAction, revokeKeyAction, type CreateKeyResult } from './_actions'
import { Copy, Check } from 'lucide-react'

export function ApiKeysClient({ currentSuffix }: { currentSuffix: string }) {
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

  function handleRevoke(slot: 1 | 2) {
    const portalIsUsingThisSlot = slot === 1 // best-guess heuristic, see _actions.ts comment
    const confirmMsg = portalIsUsingThisSlot
      ? `WARNING: this portal may be authenticating with slot ${slot}. Revoking it will lock this portal out until you redeploy with a new key.\n\nAre you ABSOLUTELY SURE?`
      : `Revoke API key in slot ${slot}? This is permanent.`
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

        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2].map((slot) => (
            <div
              key={slot}
              className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] p-3"
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-[color:var(--color-text-muted)]">
                  Slot {slot}
                </div>
                <div className="font-mono text-sm">pk_…(unknown)</div>
                <div className="text-xs text-[color:var(--color-text-muted)]">
                  Click revoke if you&apos;re sure this slot is no longer in use.
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRevoke(slot as 1 | 2)}
                disabled={pending}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>

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
