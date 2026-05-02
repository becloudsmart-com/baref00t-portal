import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { brandingTokens, brandingCssVars } from '@/lib/branding'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'
import { InstallPrompt } from '@/components/InstallPrompt'
import './globals.css'

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
    <html lang="en" data-theme={b.theme}>
      <head>
        {/* Branding CSS vars — request-scoped, nonce-protected per CSP. */}
        <style nonce={nonce} dangerouslySetInnerHTML={{ __html: brandingCssVars(b) }} />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  )
}
