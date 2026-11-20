# Branding

All branding is env-driven and applied at runtime — change a `BRAND_*` env var and restart the container; **no rebuild required**.

## Tokens

| Env var | Default | Effect |
|---|---|---|
| `BRAND_NAME` | `Baref00t Partner Portal` | `<title>`, nav, footer, sign-in heading |
| `BRAND_PRIMARY_COLOR` | `#00cc66` | Primary buttons, links, focus rings, badges |
| `BRAND_LOGO_URL` | (none) | Renders in nav + sign-in page |
| `BRAND_FAVICON_URL` | (none) | Browser tab icon |
| `BRAND_FOOTER_TEXT` | `© <year> <name>` | Footer copy |
| `BRAND_CONTACT_EMAIL` | (none) | Linked from footer + sign-in support copy |
| `BRAND_THEME` | `dark` | `dark` or `light` |

## How it's wired

The portal's middleware mints a per-request CSP nonce. The root layout reads `process.env.BRAND_*` and emits a single `<style nonce="…">:root { --color-brand: …; }</style>` block in the document head. Every component references CSS variables (`var(--color-brand)`) — Tailwind doesn't see the colour at build time.

This means you can swap branding at runtime without rebuilding the image, and your CSP can stay strict (`style-src 'self' 'nonce-…'`).

## Limits

- **One Entra app per portal** — single-tenant only. If you need to host multiple white-labels, run multiple portal containers.
- **No in-app branding editor** — by design. The portal config is partner-devops territory; admin users can preview the live values at `/admin/branding`, not change them.
- **Logo is a URL, not a file mount** — to avoid docker volume management. Host the logo on your own CDN / static origin. Make sure CORS allows `<img>` (most CDNs do by default).

## Customer-facing branding (separate from portal chrome)

The `BRAND_*` env vars above style the **portal UI itself** — what your operators see. The branding shown to your **customers** (report viewer chrome, consent emails, report emails) is stored on the platform and edited via `/admin/branding` (the "Save to platform" button).

Customer-facing fields persisted on the platform:

| Field | What it controls |
|---|---|
| `name` (Brand Name) | Report viewer header · "Delivered by …" attribution. Up to 80 chars. Distinct from `company` (legal/registration entity from signup). |
| `brandColor` | Report viewer accent · Email button colour. |
| `logoUrl` | Report viewer header · Email header. (Currently set via the SaaS portal's logo upload — partner-portal accepts a URL only.) |
| `footerText` | Email footer copy. Up to 500 chars. |
| `contactEmail` | Reply-To on customer emails. |

These fields write to the same `partner.name` / `partner.brandColor` / etc. that the SaaS branding page edits, so updating either UI is reflected on the next report or email.

## Examples

### Acme MSP (dark, brand orange)

```env
BRAND_NAME="Acme MSP Security Console"
BRAND_PRIMARY_COLOR=#ff6b35
BRAND_LOGO_URL=https://cdn.acmemsp.com/logo-dark.svg
BRAND_THEME=dark
BRAND_FOOTER_TEXT=© 2026 Acme MSP · Powered by baref00t
BRAND_CONTACT_EMAIL=help@acmemsp.com
```

### Globex Cyber (light, navy)

```env
BRAND_NAME="Globex Cyber Risk"
BRAND_PRIMARY_COLOR=#1f3a8a
BRAND_LOGO_URL=https://globex.example.com/brand/logo-light.png
BRAND_THEME=light
```
