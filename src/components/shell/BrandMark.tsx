'use client'

import { useState } from 'react'

interface Props {
  name: string
  logoUrl?: string
}

/**
 * Top-left brand mark. Renders the logo if BRAND_LOGO_URL resolves,
 * falls back to the brand name as text if the image errors out (broken
 * URL, CSP block, network error, etc.). Avoids the broken-image icon
 * that vanilla `<img>` shows when src is unreachable.
 *
 * #325 F31.
 */
export function BrandMark({ name, logoUrl }: Props) {
  const [errored, setErrored] = useState(false)

  if (!logoUrl || errored) {
    return <span className="text-lg">{name}</span>
  }

  return (
    <img
      src={logoUrl}
      alt={name}
      className="h-8 w-auto"
      onError={() => setErrored(true)}
    />
  )
}
