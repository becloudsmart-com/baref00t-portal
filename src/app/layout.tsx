import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { brandingTokens, brandingCssVars } from '@/lib/branding'
import './globals.css'

export async function generateMetadata(): Promise<Metadata> {
  const b = brandingTokens()
  return {
    title: { default: b.name, template: `%s · ${b.name}` },
    description: `${b.name} — partner portal for the baref00t platform`,
    icons: b.faviconUrl ? { icon: b.faviconUrl } : undefined,
    robots: { index: false, follow: false },
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
      <body>{children}</body>
    </html>
  )
}
