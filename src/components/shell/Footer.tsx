import { getBrandingTokens } from '@/lib/branding'

export async function Footer() {
  // Platform-first branding (#325 F27) — falls back to env on API error.
  const b = await getBrandingTokens()
  return (
    <footer className="mt-12 border-t border-[color:var(--color-border)] py-6">
      <div className="flex flex-col items-center justify-between gap-2 px-6 text-xs text-[color:var(--color-text-muted)] md:flex-row">
        <span>{b.footerText || `© ${new Date().getFullYear()} ${b.name}`}</span>
        <span className="flex items-center gap-3">
          {b.contactEmail && (
            <a href={`mailto:${b.contactEmail}`} className="hover:text-[color:var(--color-text)]">
              {b.contactEmail}
            </a>
          )}
          <span>Powered by baref00t</span>
        </span>
      </div>
    </footer>
  )
}
