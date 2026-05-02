'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

const DISMISS_KEY = 'baref00t-portal-install-dismissed'

/** Chrome/Edge-typed wrapper around the otherwise-untyped beforeinstallprompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Renders a small "Install" banner when the browser fires
 * `beforeinstallprompt` (Chrome/Edge/Brave on supported platforms).
 *
 * - Stashes the event so we can fire `prompt()` on user click.
 * - Hides on `appinstalled` (user accepted via the system dialog).
 * - Persists "dismissed" to localStorage so we don't pester returning users.
 * - Safari/iOS doesn't fire the event — the install path there is the
 *   browser's Share → "Add to Home Screen" UI; this banner just won't
 *   appear, which is the right behavior.
 */
export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem(DISMISS_KEY) === '1') return

    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstallEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installEvent) return
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') {
      setInstallEvent(null)
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setInstallEvent(null)
  }

  if (!installEvent) return null

  return (
    <div
      role="dialog"
      aria-label="Install Baref00t Partner Portal"
      className="fixed bottom-4 left-1/2 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] p-3 shadow-lg sm:left-4 sm:translate-x-0"
    >
      <Download className="h-5 w-5 shrink-0 text-[color:var(--color-brand)]" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium text-[color:var(--color-text)]">Install the portal</p>
        <p className="text-xs text-[color:var(--color-text-muted)]">
          Add Baref00t to your home screen for one-tap access.
        </p>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="rounded-md bg-[color:var(--color-brand)] px-3 py-1.5 text-xs font-medium text-black hover:opacity-90"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="rounded-md p-1 text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text)]"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}
