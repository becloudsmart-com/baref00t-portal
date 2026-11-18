import { brandingTokens } from '@/lib/branding'

export const metadata = { title: 'Offline' }

/**
 * Offline fallback rendered by the service worker when an HTML navigation
 * fails (no network and no cached copy). Static — no data dependencies — so
 * it's safe to precache at install time.
 */
export default function OfflinePage() {
  const b = brandingTokens()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        {b.logoUrl ? (
          <img src={b.logoUrl} alt={b.name} className="mx-auto h-12 w-auto" />
        ) : (
          <p className="text-2xl font-semibold text-[color:var(--color-text)]">{b.name}</p>
        )}
        <h1 className="text-3xl font-semibold text-[color:var(--color-text)]">You&apos;re offline</h1>
        <p className="text-sm text-[color:var(--color-text-muted)]">
          The portal couldn&apos;t reach the network. Check your connection and try again — most data
          is fetched live, so previously visited pages may still load from cache.
        </p>
        <div className="pt-2">
          <a
            href="/"
            className="inline-flex items-center rounded-md bg-[color:var(--color-brand)] px-4 py-2 text-sm font-medium text-black hover:opacity-90"
          >
            Retry
          </a>
        </div>
      </div>
    </div>
  )
}
