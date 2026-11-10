import { headers } from 'next/headers'

let counter = 0

/**
 * CSP-safe progress bar. Renders a small nonce'd `<style>` block defining
 * the bar's width via a unique class instead of using a `style="width:N%"`
 * attribute (the portal CSP blocks inline `style=` attributes).
 *
 * #325.
 */
export async function ProgressBar({
  pct,
  className = '',
  trackClassName = 'bg-[color:var(--color-bg-elev)]',
  fillClassName = 'bg-[color:var(--color-brand)]',
}: {
  /** 0–100 — values outside the range are clamped. */
  pct: number
  className?: string
  trackClassName?: string
  fillClassName?: string
}) {
  const h = await headers()
  const nonce = h.get('x-nonce') ?? undefined
  const id = `pb-${counter++}-${Math.floor(Math.random() * 100000)}`
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <>
      <style
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: `.${id}{width:${clamped.toFixed(2)}%;}` }}
      />
      <div className={`relative h-4 overflow-hidden rounded ${trackClassName} ${className}`}>
        <div className={`absolute inset-y-0 left-0 ${fillClassName} ${id}`} aria-hidden />
      </div>
    </>
  )
}
