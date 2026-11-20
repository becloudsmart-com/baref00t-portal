import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { DM_Sans, Space_Mono } from 'next/font/google'
import { brandingTokens, brandingCssVars } from '@/lib/branding'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { InstallPrompt } from '@/components/InstallPrompt'
import { ThemePreloadScript } from '@/components/shell/ThemeToggle'
import './globals.css'

// Match baref00t SaaS chrome (apps/web/src/app/layout.tsx) so the
// portal feels visually consistent with the platform it fronts.
// Variables are consumed by globals.css as `var(--font-dm-sans)` /
// `var(--font-space-mono)` (see the @theme block).
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})
const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
})

export async function generateMetadata(): Promise<Metadata> {
  const b = brandingTokens()
  return {
    title: { default: b.name, template: `%s · ${b.name}` },
    description: `${b.name} — partner portal for the baref00t platform`,
    // Custom favicon trumps the partner-supplied URL only when set;
    // otherwise fall back to the generated PNG favicon.
    icons: {
      icon: b.faviconUrl ?? '/favicon.png',
      apple: '/icons/apple-touch-icon.png',
    },
    manifest: '/manifest.webmanifest',
    appleWebApp: {
      capable: true,
      title: b.name,
      statusBarStyle: 'black-translucent',
    },
    robots: { index: false, follow: false },
  }
}

export function generateViewport(): Viewport {
  const b = brandingTokens()
  return {
    themeColor: b.primaryColor,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const b = brandingTokens()
  const h = await headers()
  const nonce = h.get('x-nonce') ?? undefined

  return (
    <html
      lang="en"
      data-theme={b.theme}
      className={`${dmSans.variable} ${spaceMono.variable}`}
    >
      <head>
        {/* Branding CSS vars — request-scoped, nonce-protected per CSP. */}
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: brandingCssVars(b) }} />
        {/* Apply persisted user theme before paint — avoids FOUC when
            the user's choice differs from BRAND_THEME env. (#325 F29) */}
        {nonce && <ThemePreloadScript nonce={nonce} />}
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  )
}
