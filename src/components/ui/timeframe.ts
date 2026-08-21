/**
 * Server-safe timeframe helpers — no `'use client'`. Imported from both
 * the overview server component (for window math) and the client-only
 * <TimeframeSelect> picker (for the dropdown options).
 */

export type Timeframe = '1d' | '5d' | '30d' | 'ytd' | '1y' | 'all'

export const TIMEFRAME_OPTIONS: { value: Timeframe; label: string }[] = [
  { value: '1d', label: '1D' },
  { value: '5d', label: '5D' },
  { value: '30d', label: '30D' },
  { value: 'ytd', label: 'YTD' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
]

/** Default timeframe when none is set in the URL. Picked to match what
 *  partners typically care about on first load: this billing month. */
export const DEFAULT_TIMEFRAME: Timeframe = '30d'

/** Resolve a timeframe to a {start,end} range and the YYYY-MM months it spans. */
export function resolveTimeframe(tf: Timeframe, now = new Date()): {
  start: Date
  end: Date
  months: string[]
  label: string
} {
  const end = new Date(now)
  let start: Date
  let label: string
  switch (tf) {
    case '1d':
      start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
      label = 'last 24 hours'
      break
    case '5d':
      start = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      label = 'last 5 days'
      break
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      label = 'last 30 days'
      break
    case 'ytd':
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
      label = 'year to date'
      break
    case '1y':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      label = 'last 12 months'
      break
    case 'all':
    default:
      // 5y is the practical "all" — partner accounts older than that are
      // rare and the unbounded list endpoint isn't free.
      start = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000)
      label = 'all time'
      break
  }
  const months: string[] = []
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  while (cursor <= end) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return { start, end, months, label }
}

/** Resolve the *previous* equal-length window (for trend comparisons). */
export function previousTimeframe(tf: Timeframe, now = new Date()): {
  start: Date
  end: Date
  months: string[]
} {
  const current = resolveTimeframe(tf, now)
  const span = current.end.getTime() - current.start.getTime()
  const prevEnd = new Date(current.start.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - span)
  const months: string[] = []
  const cursor = new Date(Date.UTC(prevStart.getUTCFullYear(), prevStart.getUTCMonth(), 1))
  while (cursor <= prevEnd) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`)
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return { start: prevStart, end: prevEnd, months }
}
