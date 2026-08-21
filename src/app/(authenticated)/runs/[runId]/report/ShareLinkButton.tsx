'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'

interface Props {
  url: string
  expiresAt: string | null
  /** Short report token (#325 F28). When present, prefer the
   *  partner-domain.com/r/<token> URL over the long SAS URL. */
  reportToken?: string
}

/**
 * Customer-facing share button.
 *
 * If we have a `reportToken`, copy the short partner-domain URL
 * `https://<portal-domain>/r/<token>` — pretty, on-brand, and the
 * underlying viewer is rate-limited per IP so the link can be shared
 * widely without portal login.
 *
 * Otherwise (older platforms that don't expose reportToken yet) fall
 * back to copying the SAS-signed blob URL — public until the SAS
 * expires, no portal login required.
 *
 * #325 F28.
 */
export function ShareLinkButton({ url, expiresAt, reportToken }: Props) {
  const [copied, setCopied] = useState(false)

  // Build the short URL on the client since we need window.location.origin.
  const shortUrl =
    reportToken && typeof window !== 'undefined'
      ? `${window.location.origin}/r/${reportToken}`
      : null
  const linkToCopy = shortUrl ?? url
  const isShort = shortUrl === linkToCopy

  function handleCopy() {
    void navigator.clipboard.writeText(linkToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    })
  }

  const expiryLabel =
    !isShort && expiresAt
      ? new Date(expiresAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleCopy} variant="primary">
        {copied ? <><Check className="h-4 w-4" /> Copied — paste into your email/Teams/etc</> : <><Copy className="h-4 w-4" /> Copy customer link</>}
      </Button>
      <span className="text-[10px] text-[color:var(--color-text-muted)]">
        {isShort ? (
          <>Short link on your portal domain · doesn&apos;t expire</>
        ) : (
          <>Long SAS link · expires {expiryLabel}</>
        )}
      </span>
    </div>
  )
}
