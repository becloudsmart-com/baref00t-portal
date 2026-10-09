/**
 * Service worker for the baref00t Partner Portal.
 *
 * Hand-rolled (no `next-pwa` / `workbox` deps — keeps the portal lean).
 *
 * Strategies:
 *   - HTML navigations  → network-first, cache fallback, then /offline
 *   - Static assets     → cache-first, stale-while-revalidate refresh
 *   - /api/*            → never cached (auth + data freshness)
 *
 * Cache name is versioned — bump CACHE_VERSION on breaking changes so old
 * clients evict their stale entries on the next `activate`.
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `baref00t-portal-static-${CACHE_VERSION}`
const RUNTIME_CACHE = `baref00t-portal-runtime-${CACHE_VERSION}`
const OFFLINE_URL = '/offline'

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // Each addAll is atomic — if one fails the cache is rolled back.
        // Wrap each fetch with `{ cache: 'reload' }` so the install pulls
        // fresh copies, not whatever the HTTP cache happens to hold.
        Promise.all(
          PRECACHE_URLS.map((url) =>
            fetch(url, { cache: 'reload' })
              .then((res) => {
                if (!res.ok) throw new Error(`precache ${url} → ${res.status}`)
                return cache.put(url, res)
              })
              .catch((err) => {
                // Don't fail the whole install if one optional asset 404s.
                console.warn('[sw] precache skip', url, err.message)
              }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith('baref00t-portal-') && name !== STATIC_CACHE && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never touch cross-origin (Graph, Microsoft login, etc.).
  if (url.origin !== self.location.origin) return

  // Never cache API or auth routes — these have auth + freshness semantics
  // that caching would silently break (e.g. serving a stale 401 response
  // to a now-signed-in user).
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return
  }

  // HTML navigation — network-first with offline fallback.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request))
    return
  }

  // Static assets — stale-while-revalidate.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || /\.(png|jpe?g|svg|gif|webp|ico|woff2?|ttf|css|js)$/i.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Everything else — try network, fall back to cache if we have it.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((res) => res ?? Response.error())),
  )
})

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    if (offline) return offline
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {})
      return response
    })
    .catch(() => null)
  return cached ?? (await network) ?? Response.error()
}

// Allow the page to ping the SW to take over without waiting for the next
// navigation — used by the update banner.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
