import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { brandingTokens } from '@/lib/branding'
import { BrandingPreviewClient } from './BrandingPreviewClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Branding' }

export default function BrandingPage() {
  const b = brandingTokens()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Branding</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Live preview of how customers see baref00t-generated content (consent invitations, report
          emails, and the report viewer). Edit the draft on the left to preview changes — to make
          them stick, update the matching <code>BRAND_*</code> env vars and restart the container.
        </p>
      </div>

      <BrandingPreviewClient
        initial={{
          name: b.name,
          primaryColor: b.primaryColor,
          logoUrl: b.logoUrl ?? '',
          footerText: b.footerText,
          contactEmail: b.contactEmail ?? '',
          theme: b.theme,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Currently deployed branding</CardTitle>
        </CardHeader>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-[color:var(--color-text-muted)]">Name</dt>
          <dd className="col-span-2 font-medium">{b.name}</dd>

          <dt className="text-[color:var(--color-text-muted)]">Theme</dt>
          <dd className="col-span-2 font-mono">{b.theme}</dd>

          <dt className="text-[color:var(--color-text-muted)]">Primary color</dt>
          <dd className="col-span-2 flex items-center gap-2">
            <span
              className="inline-block h-5 w-5 rounded border border-[color:var(--color-border)]"
              style={{ background: b.primaryColor }}
              aria-hidden
            />
            <span className="font-mono text-xs">{b.primaryColor}</span>
          </dd>

          <dt className="text-[color:var(--color-text-muted)]">Logo</dt>
          <dd className="col-span-2">
            {b.logoUrl ? (
              <img src={b.logoUrl} alt="logo" className="h-10 w-auto" />
            ) : (
              <span className="text-[color:var(--color-text-muted)]">(unset)</span>
            )}
          </dd>

          <dt className="text-[color:var(--color-text-muted)]">Footer</dt>
          <dd className="col-span-2 text-xs">{b.footerText || '(empty)'}</dd>

          <dt className="text-[color:var(--color-text-muted)]">Contact</dt>
          <dd className="col-span-2 text-xs">{b.contactEmail || '(unset)'}</dd>
        </dl>
      </Card>
    </div>
  )
}
