#!/usr/bin/env node
/**
 * Generate the PWA icon set from a single SVG source.
 *
 * The portal ships placeholder icons rendered from `public/icons/source.svg` —
 * partners override by replacing the PNGs (or by setting BRAND_LOGO_URL and
 * pointing manifest icons at it via a future env-driven manifest).
 *
 * Usage:  node scripts/generate-pwa-icons.mjs
 *
 * Requires `sharp` (already a transitive dep via Next.js). Skips silently if
 * sharp is not resolvable so the build pipeline never breaks on this script.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT_DIR = join(ROOT, 'public', 'icons')

let sharp
try {
  ({ default: sharp } = await import('sharp'))
} catch {
  console.error('sharp is not installed — cannot regenerate icons. Skipping.')
  process.exit(0)
}

const BRAND_COLOR = process.env.BRAND_PRIMARY_COLOR ?? '#00cc66'
const BG_COLOR = '#0a0a0a'

function makeSvg(size) {
  // Maskable-safe inner area: PWA spec recommends keeping content within
  // the inner 80% of the icon so OS-applied masks (round/squircle/etc) don't
  // crop it. We render a centered rounded square with the brand color and
  // a single "B" letterform sized to the safe zone.
  const padding = size * 0.1
  const inner = size - padding * 2
  const radius = inner * 0.22
  const fontSize = inner * 0.62
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG_COLOR}"/>
  <rect x="${padding}" y="${padding}" width="${inner}" height="${inner}" rx="${radius}" ry="${radius}" fill="${BRAND_COLOR}"/>
  <text x="50%" y="50%"
        text-anchor="middle"
        dominant-baseline="central"
        fill="#0a0a0a"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-weight="700"
        font-size="${fontSize}">B</text>
</svg>`
}

async function generate() {
  await mkdir(OUT_DIR, { recursive: true })

  // Save the source SVG so partners can edit + regenerate.
  const sourceSvg = makeSvg(512)
  await writeFile(join(OUT_DIR, 'source.svg'), sourceSvg, 'utf8')

  for (const size of [192, 512]) {
    const svg = makeSvg(size)
    const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer()
    await writeFile(join(OUT_DIR, `icon-${size}.png`), png)
    console.log(`wrote icon-${size}.png (${png.byteLength} bytes)`)
  }

  // Apple touch icon — same as 192 but named per Apple conventions
  const apple = await sharp(Buffer.from(makeSvg(180))).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(join(OUT_DIR, 'apple-touch-icon.png'), apple)
  console.log(`wrote apple-touch-icon.png (${apple.byteLength} bytes)`)

  // Favicon — 32x32 PNG (modern browsers happy, IE not supported)
  const fav = await sharp(Buffer.from(makeSvg(32))).png({ compressionLevel: 9 }).toBuffer()
  await writeFile(join(ROOT, 'public', 'favicon.png'), fav)
  console.log(`wrote favicon.png (${fav.byteLength} bytes)`)
}

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})
