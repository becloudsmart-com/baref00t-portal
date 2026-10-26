import { headers } from 'next/headers'

let counter = 0

/**
 * CSP-safe colour swatch — renders a small inline `<style nonce>` block
 * scoped to a unique class instead of using a `style="..."` attribute.
 *
 * The portal's CSP nukes inline `style=` attributes (only nonce'd
 * `<style>` blocks are allowed). Swatches need dynamic per-render
 * colours so we generate a per-instance class + style, both nonced.
 *
 * #325.
 */
export async function ColorSwatch({
  color,
  className = '',
}: {
  color: string
  className?: string
}) {
  const h = await headers()
  const nonce = h.get('x-nonce') ?? undefined
  const id = `cs-${counter++}-${Math.floor(Math.random() * 100000)}`
  return (
    <>
      <style
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: `.${id}{background:${escapeCss(color)};}` }}
      />
      <span
        aria-hidden
        className={`inline-block h-5 w-5 rounded border border-[color:var(--color-border)] ${id} ${className}`}
      />
    </>
  )
}

function escapeCss(input: string): string {
  // Defensive — only allow hex / rgb / rgba / named colour shapes.
  // Anything else collapses to default brand colour to avoid CSS injection.
  if (/^#[0-9a-f]{3,8}$/i.test(input)) return input
  if (/^rgba?\([\d.\s,]+\)$/i.test(input)) return input
  if (/^[a-z]+$/i.test(input)) return input
  return 'var(--color-brand)'
}
