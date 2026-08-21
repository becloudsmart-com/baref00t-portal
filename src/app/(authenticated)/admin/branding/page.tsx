import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { ColorSwatch } from '@/components/ui/color-swatch'
import { envBrandingTokens, getBrandingTokens } from '@/lib/branding'
import { partnerClient } from '@/lib/api'
import { logger } from '@/lib/logger'
import { BrandingPreviewClient } from './BrandingPreviewClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Branding' }

export default async function BrandingPage() {
  // Platform-first (with env fallback inside getBrandingTokens). #325 F27.
  // Both the form initial values and the "Currently deployed" card pull
  // from this single source — no more nav-vs-form-vs-preview mismatch.
  const b = await getBrandingTokens()
  const env = envBrandingTokens()
  const sourcedFromEnv = b.source === 'env'

  // F33 — surface partnerId so users can verify their portal API key
  // resolves to the SAME partner record as the baref00t SaaS dashboard.
  // (Most "branding doesn't sync" reports turn out to be two different
  // partner records: portal env BAREF00T_API_KEY belongs to partner A,
  // baref00t SaaS MSAL session is signed in as partner B.)
  let partnerId = ''
  try {
    const me = await partnerClient().me.get()
    partnerId = me.partnerId
  } catch (err) {
    logger().warn({ err }, 'Branding page: failed to resolve partnerId for diagnostics')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Branding</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Live preview of how customers see baref00t-generated content (consent invitations,
          report-ready emails, and the report viewer). Save persists to the platform — both this
          portal&apos;s nav and your customers&apos; emails update with the same values, no
          restart needed.
        </p>
        {partnerId && (
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            Source: <code className="font-mono">partner&nbsp;{partnerId}</code> · Read from{' '}
            <code className="font-mono">{b.source === 'platform' ? 'platform record' : 'env fallback'}</code>
          </p>
        )}
      </div>

      {sourcedFromEnv && (
        <Card className="border-[color:var(--color-amber,#d97706)]">
          <p className="text-sm">
            <strong>Heads up:</strong> Showing env defaults — couldn&apos;t reach the platform to
            read your saved branding. Save below will retry the connection.
          </p>
        </Card>
      )}

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
          <CardTitle>Currently deployed</CardTitle>
        </CardHeader>
        <p className="mb-3 text-xs text-[color:var(--color-text-muted)]">
          What appears across the portal nav, outbound emails, and the report viewer right now.
          Source: <span className="font-mono">{b.source}</span>.
        </p>
        <dl className="grid grid-cols-3 gap-y-3 text-sm">
          <dt className="text-[color:var(--color-text-muted)]">Brand name</dt>
          <dd className="col-span-2 font-medium">{b.name}</dd>

          <dt className="text-[color:var(--color-text-muted)]">Color</dt>
          <dd className="col-span-2 flex items-center gap-2">
            <ColorSwatch color={b.primaryColor} />
            <span className="font-mono text-xs">{b.primaryColor}</span>
          </dd>

          <dt className="text-[color:var(--color-text-muted)]">Footer</dt>
          <dd className="col-span-2 text-xs">{b.footerText || '(empty)'}</dd>

          <dt className="text-[color:var(--color-text-muted)]">Contact</dt>
          <dd className="col-span-2 text-xs">{b.contactEmail || '(unset)'}</dd>

          <dt className="text-[color:var(--color-text-muted)]">Logo</dt>
          <dd className="col-span-2">
            {b.logoUrl ? (
              <img src={b.logoUrl} alt="logo" className="h-10 w-auto" />
            ) : (
              <span className="text-[color:var(--color-text-muted)]">(unset)</span>
            )}
            <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
              Logo URL is portal env-driven (<code>BRAND_LOGO_URL</code>) — host the image
              wherever you want.
            </p>
          </dd>

          <dt className="text-[color:var(--color-text-muted)]">Theme</dt>
          <dd className="col-span-2 font-mono text-xs">
            {b.theme}
            <span className="ml-2 text-[color:var(--color-text-muted)]">
              (env <code>BRAND_THEME</code>, requires restart to change)
            </span>
          </dd>
        </dl>

        {/* Show the env defaults too if they differ — useful when the
            partner is debugging why the platform value isn't taking effect. */}
        {b.source === 'platform' &&
          (env.name !== b.name ||
            env.primaryColor !== b.primaryColor ||
            env.footerText !== b.footerText ||
            (env.contactEmail ?? '') !== (b.contactEmail ?? '')) && (
            <div className="mt-4 border-t border-[color:var(--color-border)] pt-3">
              <p className="text-xs text-[color:var(--color-text-muted)]">
                <strong>Env defaults</strong> (used as fallback when the platform is unreachable):
              </p>
              <dl className="mt-2 grid grid-cols-3 gap-y-1 text-xs text-[color:var(--color-text-muted)]">
                {env.name !== b.name && (
                  <>
                    <dt>Brand name</dt>
                    <dd className="col-span-2 font-mono">{env.name}</dd>
                  </>
                )}
                {env.primaryColor !== b.primaryColor && (
                  <>
                    <dt>Color</dt>
                    <dd className="col-span-2 font-mono">{env.primaryColor}</dd>
                  </>
                )}
                {env.footerText !== b.footerText && (
                  <>
                    <dt>Footer</dt>
                    <dd className="col-span-2">{env.footerText || '(empty)'}</dd>
                  </>
                )}
                {(env.contactEmail ?? '') !== (b.contactEmail ?? '') && (
                  <>
                    <dt>Contact</dt>
                    <dd className="col-span-2">{env.contactEmail || '(unset)'}</dd>
                  </>
                )}
              </dl>
            </div>
          )}
      </Card>
    </div>
  )
}
