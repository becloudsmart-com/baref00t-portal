/**
 * Branding tokens — single source of truth.
 *
 * The PLATFORM partner record is canonical for customer-facing branding
 * (brand name, color, footer, contact email). Env BRAND_* vars are the
 * fallback when the API is unreachable, and stay authoritative for things
 * that load before any API call: logo URL (rendered as an <img src>),
 * favicon URL, and theme (dark/light, baked into the CSS bundle).
 *
 * Server-only. Cached per request via React `cache()` so a single page
 * render makes at most one platform call regardless of how many components
 * read branding (Nav + Footer + page + layout would otherwise be 4 calls).
 *
 * #325 F27.
 */

import { cache } from 'react'
import { env } from '../env'
import { partnerClient } from './api'
import { logger } from './logger'

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
  /** Where this token's value came from. Useful for the branding admin UI. */
  source: 'platform' | 'env'
}

/** Env-only tokens. Used as the fallback when the API is unreachable + as
 *  the source of truth for things the platform doesn't store (logo URL,
 *  favicon, theme). */
export function envBrandingTokens(): BrandingTokens {
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
    source: 'env',
  }
}

/** Backwards-compat alias. Existing call sites that don't yet need
 *  platform branding can continue using `brandingTokens()` and get env
 *  values synchronously. New call sites should prefer
 *  `getBrandingTokens()` which fetches platform values. */
export function brandingTokens(): BrandingTokens {
  return envBrandingTokens()
}

/**
 * Async branding tokens — platform-first, env fallback. Cached per
 * request so multiple components in the same render share one API call.
 *
 * Returns env tokens if the platform is unreachable (API down, expired
 * key, etc.) so the portal still renders. The `source` field tells the
 * caller which path was taken.
 */
export const getBrandingTokens = cache(async (): Promise<BrandingTokens> => {
  const envTokens = envBrandingTokens()
  try {
    const platform = await partnerClient().branding.get()
    const primary =
      platform.brandColor && /^#[0-9a-f]{6}$/i.test(platform.brandColor)
        ? platform.brandColor
        : envTokens.primaryColor
    return {
      name: platform.company || envTokens.name,
      primaryColor: primary,
      primaryColorHover: shadeHex(primary, -10),
      primaryColorMuted: hexAlpha(primary, 0.12),
      // F34 — Prefer platform-uploaded logo (SAS URL) over env. If no
      // platform logo, fall back to env BRAND_LOGO_URL (allows partners
      // who self-host their logo on a CDN to skip the upload flow).
      logoUrl: platform.logoUrl ?? envTokens.logoUrl,
      faviconUrl: envTokens.faviconUrl,
      footerText: platform.footerText || envTokens.footerText,
      contactEmail: platform.contactEmail || envTokens.contactEmail,
      // Theme stays env-driven — the platform doesn't store theme; it's
      // baked into the CSS bundle at build time.
      theme: envTokens.theme,
      source: 'platform',
    }
  } catch (err) {
    logger().warn(
      { err: err instanceof Error ? err.message : String(err) },
      'Branding API unreachable; falling back to env BRAND_* values',
    )
    return envTokens
  }
})

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
