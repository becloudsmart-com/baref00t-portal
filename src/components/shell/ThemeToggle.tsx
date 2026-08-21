'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const STORAGE_KEY = 'baref00t-portal-theme'

type Theme = 'dark' | 'light'

/**
 * Runtime theme toggle. Reads the current theme from the <html
 * data-theme> attribute (set server-side from env BRAND_THEME) on mount,
 * lets the user flip it, and persists the choice to localStorage so it
 * survives page reloads.
 *
 * The actual paint-time theme application happens in a tiny inline
 * script in layout.tsx (see <ThemePreloadScript>) — without it, every
 * non-default-theme load would FOUC briefly with the env theme before
 * the localStorage value takes over.
 *
 * #325 F29.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme | undefined) ?? 'dark'
    setTheme(current)
    setHydrated(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* private mode / quota — silently degrade */
    }
  }

  // SSR / pre-hydration: render a stable placeholder so the layout is
  // identical and React doesn't warn about hydration mismatch.
  if (!hydrated) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)]"
      >
        <Sun className="h-4 w-4" />
      </button>
    )
  }

  const Icon = theme === 'dark' ? Sun : Moon
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text)]"
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

/**
 * Inline `<script>` that runs in <head> before any paint — applies the
 * stored theme (if any) to the <html> element. Skips localStorage in
 * private mode without throwing. Default to whatever is already on the
 * element (set server-side from env). Renders nothing visible.
 */
export function ThemePreloadScript({ nonce }: { nonce: string }) {
  const code = `
    (function(){try{
      var t = window.localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
      if (t === 'light' || t === 'dark') {
        document.documentElement.dataset.theme = t;
      }
    }catch(e){}})()
  `.trim()
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: code }} />
}
