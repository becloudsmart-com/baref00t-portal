import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { brandingTokens } from '@/lib/branding'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Branding' }

export default function BrandingPage() {
  const b = brandingTokens()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Branding</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Read-only view of the branding tokens this portal was started with. To change, update the
          BRAND_* env vars and restart the container.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <dl className="grid grid-cols-3 gap-y-3 text-sm">
            <dt className="text-[color:var(--color-text-muted)]">Name</dt>
            <dd className="col-span-2 font-medium">{b.name}</dd>

            <dt className="text-[color:var(--color-text-muted)]">Theme</dt>
            <dd className="col-span-2 font-mono">{b.theme}</dd>

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

        <Card>
          <CardHeader>
            <CardTitle>Colours</CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {[
              { label: 'Primary', value: b.primaryColor },
              { label: 'Hover', value: b.primaryColorHover },
              { label: 'Muted', value: b.primaryColorMuted },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 text-sm">
                <div className="h-8 w-12 rounded border border-[color:var(--color-border)]" style={{ background: c.value }} />
                <span className="w-20 text-[color:var(--color-text-muted)]">{c.label}</span>
                <span className="font-mono text-xs">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Live preview</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md px-4 py-2 text-sm font-medium text-black"
              style={{ background: b.primaryColor }}
            >
              Primary button
            </button>
            <button className="rounded-md border border-[color:var(--color-border)] px-4 py-2 text-sm">
              Secondary button
            </button>
            <span className="rounded-full px-3 py-0.5 text-xs font-medium" style={{ background: b.primaryColorMuted, color: b.primaryColor }}>
              Brand badge
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}
