'use client'

import { useEffect, useState } from 'react'

interface Props {
  /** ISO-8601 timestamp (UTC). */
  iso: string
  /** Render style. `short` = `2026-05-02 14:23`, `full` = `May 2, 2026, 2:23 PM`. */
  style?: 'short' | 'full'
}

/**
 * Renders an ISO timestamp in the browser's local timezone.
 *
 * Server-side renders the UTC short form (so the page is meaningful even
 * before JS hydrates), then on mount swaps to the locale-formatted local
 * version. Avoids hydration mismatch by gating the locale render on a
 * client-only state.
 */
export function LocalTime({ iso, style = 'short' }: Props) {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])

  if (!hydrated) {
    // SSR fallback — UTC short form, never throws on weird input.
    try {
      return <>{new Date(iso).toISOString().slice(0, 16).replace('T', ' ')} UTC</>
    } catch {
      return <>—</>
    }
  }

  try {
    const d = new Date(iso)
    if (style === 'full') {
      return (
        <time dateTime={iso} title={iso}>
          {d.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </time>
      )
    }
    // Short: yyyy-mm-dd HH:MM in local timezone with browser's locale conventions.
    const date = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const time = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return (
      <time dateTime={iso} title={iso}>
        {date} {time}
      </time>
    )
  } catch {
    return <>—</>
  }
}
