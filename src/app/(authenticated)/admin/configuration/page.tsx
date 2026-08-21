import { partnerClient } from '@/lib/api'
import { env } from '@/env'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BareF00tApiError } from '@baref00t/sdk'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Configuration' }

export default async function ConfigurationPage() {
  const e = env()
  let apiOk = false
  let apiError: string | null = null
  let me: Awaited<ReturnType<ReturnType<typeof partnerClient>['me']['get']>> | null = null

  try {
    me = await partnerClient().me.get()
    apiOk = true
  } catch (err) {
    apiError = err instanceof BareF00tApiError ? `${err.code}: ${err.message}` : String(err)
  }

  const rows: Array<{ label: string; value: string; tone?: 'neutral' | 'brand' | 'warning' }> = [
    { label: 'BAREF00T_API_BASE', value: e.BAREF00T_API_BASE },
    { label: 'BAREF00T_API_KEY', value: maskKey(e.BAREF00T_API_KEY) },
    { label: 'AUTH_URL', value: e.AUTH_URL },
    { label: 'AZURE_AD_TENANT_ID', value: e.AZURE_AD_TENANT_ID },
    { label: 'AZURE_AD_CLIENT_ID', value: e.AZURE_AD_CLIENT_ID },
    { label: 'AZURE_AD_CLIENT_SECRET', value: '***' },
    { label: 'BRAND_NAME', value: e.BRAND_NAME },
    { label: 'BRAND_PRIMARY_COLOR', value: e.BRAND_PRIMARY_COLOR },
    { label: 'BRAND_LOGO_URL', value: e.BRAND_LOGO_URL ?? '(unset)' },
    { label: 'BRAND_THEME', value: e.BRAND_THEME },
    { label: 'MAIL_FROM_ADDRESS', value: e.MAIL_FROM_ADDRESS ?? '(mail disabled)', tone: e.MAIL_FROM_ADDRESS ? 'brand' : 'warning' },
    { label: 'LOG_LEVEL', value: e.LOG_LEVEL },
    { label: 'PORT', value: String(e.PORT) },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuration</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          Read-only view of the env vars this portal was started with. Set them via your container/host.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection to baref00t</CardTitle>
          <Badge tone={apiOk ? 'brand' : 'danger'}>{apiOk ? 'Connected' : 'Failed'}</Badge>
        </CardHeader>
        {apiOk ? (
          <p className="text-sm">
            Authenticated as <strong>{me!.company}</strong> on plan{' '}
            <Badge tone="brand">{me!.planName}</Badge>
          </p>
        ) : (
          <p className="text-sm text-[color:var(--color-red)]">{apiError}</p>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-[color:var(--color-border)]">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="py-2 font-mono text-xs text-[color:var(--color-text-muted)]">{row.label}</td>
                <td className="py-2 text-right font-mono">
                  {row.tone ? <Badge tone={row.tone}>{row.value}</Badge> : row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function maskKey(key: string): string {
  if (key.length < 12) return '***'
  return `${key.slice(0, 8)}…${key.slice(-4)}`
}
