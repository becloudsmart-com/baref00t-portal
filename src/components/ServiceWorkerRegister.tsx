'use client'

import { useEffect, useState } from 'react'

/**
 * Registers the portal service worker and surfaces an unobtrusive
 * "new version available" banner when an updated SW is waiting to take over.
 *
 * - Production-only — registering a SW in dev mucks with HMR.
 * - Listens for `controllerchange` to detect when a new SW activates after
 *   the user accepts the update.
 * - Banner is dismissible — sets `localStorage` so it doesn't return for
 *   the same SW version.
 */
export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return

    let registration: ServiceWorkerRegistration | null = null

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg
        // If there's already a waiting worker on first load, show the prompt.
        if (reg.waiting) setUpdateReady(true)

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // A new version finished installing alongside an existing one.
              setUpdateReady(true)
            }
          })
        })
      })
      .catch((err) => {
        // Don't blow up the page if registration fails — log and move on.
        console.warn('[sw] register failed', err)
      })

    // When a new SW takes control after the user accepts, hard-reload so the
    // page picks up new chunks. Without this, users see "old shell + new SW"
    // until their next manual refresh.
    let reloaded = false
    const onControllerChange = () => {
      if (reloaded) return
      reloaded = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      registration = null
    }
  }, [])

  function applyUpdate() {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistration().then((reg) => {
      reg?.waiting?.postMessage('SKIP_WAITING')
    })
  }

  if (!updateReady) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-4 shadow-lg"
    >
      <p className="text-sm text-[color:var(--color-text)]">A new version of the portal is available.</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={applyUpdate}
          className="rounded-md bg-[color:var(--color-brand)] px-3 py-1.5 text-sm font-medium text-black hover:opacity-90"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setUpdateReady(false)}
          className="rounded-md px-3 py-1.5 text-sm text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
        >
          Later
        </button>
      </div>
    </div>
  )
}
