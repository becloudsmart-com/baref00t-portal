/**
 * Branding tokens derived from env. Server-only — these are read on every
 * request so the same image can be redeployed for a different partner
 * without rebuilding.
 */

import { env } from '../env'

export interface BrandingTokens {
  name: string
  primaryColor: string
  primaryColorHover: string
  primaryColorMuted: string
  logoUrl: string | undefined
  faviconUrl: string | undefined
  footerText: string
  contactEmail: string | undefined
  theme: 'dark' | 'light'
}

export function brandingTokens(): BrandingTokens {
  const e = env()
  const primary = e.BRAND_PRIMARY_COLOR
  return {
    name: e.BRAND_NAME,
    primaryColor: primary,
    primaryColorHover: shadeHex(primary, -10),
    primaryColorMuted: hexAlpha(primary, 0.12),
    logoUrl: e.BRAND_LOGO_URL,
    faviconUrl: e.BRAND_FAVICON_URL,
    footerText: e.BRAND_FOOTER_TEXT,
    contactEmail: e.BRAND_CONTACT_EMAIL,
    theme: e.BRAND_THEME,
  }
}

/** Lighten/darken a hex color by `delta` percent. */
function shadeHex(hex: string, delta: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) + Math.round((255 * delta) / 100)
  let g = ((num >> 8) & 0xff) + Math.round((255 * delta) / 100)
  let b = (num & 0xff) + Math.round((255 * delta) / 100)
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')
}

function hexAlpha(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = (num >> 16) & 0xff
  const g = (num >> 8) & 0xff
  const b = num & 0xff
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** CSS variable block to inject in <style nonce="…">. */
export function brandingCssVars(b: BrandingTokens): string {
  return `:root {
  --color-brand: ${b.primaryColor};
  --color-brand-hover: ${b.primaryColorHover};
  --color-brand-muted: ${b.primaryColorMuted};
}`
}
