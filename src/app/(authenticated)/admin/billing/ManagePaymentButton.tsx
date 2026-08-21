'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'
import { getBillingPortalUrlAction } from './_actions'

interface Props {
  /** Cached portal URL from the page-load snapshot — used as the
   *  initial fallback if the fresh fetch fails. May be null when the
   *  partner has no Stripe customer or session creation failed. */
  initialUrl: string | null
}

/**
 * Click-time minted Stripe Customer Portal launcher.
 *
 * Stripe portal sessions are short-lived (~1h) so we mint fresh on click
 * via a server action; if that fails we fall back to whatever URL the
 * page-load snapshot returned (which may also be stale, but better than
 * a dead button).
 */
export function ManagePaymentButton({ initialUrl }: Props) {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    start(async () => {
      const r = await getBillingPortalUrlAction()
      if (r.ok && r.url) {
        window.open(r.url, '_blank', 'noopener,noreferrer')
        return
      }
      if (initialUrl) {
        // Fallback to the snapshot URL — may also be stale, but it's
        // the best we have. Surface the error so the user knows.
        window.open(initialUrl, '_blank', 'noopener,noreferrer')
      }
      setError(r.error ?? 'Could not mint a fresh portal session.')
    })
  }

  if (!initialUrl) {
    return (
      <div className="rounded-md border border-dashed border-[color:var(--color-border)] p-3 text-sm text-[color:var(--color-text-muted)]">
        Stripe Customer Portal is not available — typically because no Stripe customer
        is linked to this partner account. Contact baref00t support to enable billing.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={pending}>
        {pending ? 'Opening…' : 'Manage payment method on Stripe'} <ExternalLink className="h-4 w-4" />
      </Button>
      {error && <p className="text-xs text-[color:var(--color-red)]">{error}</p>}
    </div>
  )
}
