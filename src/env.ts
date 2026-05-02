/**
 * Boot-time environment validation.
 *
 * Throws at module load if any required env var is missing, malformed,
 * or implausible. The portal will refuse to serve a single request rather
 * than start up half-configured — surfacing the failure to the partner
 * at `docker run` time, not during their first user's sign-in attempt.
 *
 * Imported from `instrumentation.ts` so it runs on the Next.js server
 * boot, not on client bundles.
 */

import { z } from 'zod'

const envSchema = z.object({
  // ── baref00t platform ──────────────────────────────────────────────────
  BAREF00T_API_KEY: z
    .string()
    .regex(/^pk_(live|test)_[A-Za-z0-9_-]+$/, 'must be a partner API key (pk_live_… or pk_test_…)'),
  BAREF00T_API_BASE: z
    .string()
    .url()
    .default('https://api.baref00t.io'),

  // ── NextAuth ───────────────────────────────────────────────────────────
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 chars (use `openssl rand -base64 32`)'),
  AUTH_URL: z.string().url('AUTH_URL must be the externally-reachable URL of this portal'),

  // ── Partner Entra app (BYO; same app for SSO + Mail.Send) ──────────────
  AZURE_AD_TENANT_ID: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'must be a tenant GUID'),
  AZURE_AD_CLIENT_ID: z
    .string()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'must be an app client GUID'),
  AZURE_AD_CLIENT_SECRET: z.string().min(1),

  // ── Branding (all required so the deployed portal looks intentional) ──
  BRAND_NAME: z.string().min(1).default('Baref00t Partner Portal'),
  BRAND_PRIMARY_COLOR: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, 'must be a 6-digit hex color, e.g. #00cc66')
    .default('#00cc66'),
  BRAND_LOGO_URL: z.string().url().optional(),
  BRAND_FAVICON_URL: z.string().url().optional(),
  BRAND_FOOTER_TEXT: z.string().default(''),
  BRAND_CONTACT_EMAIL: z.string().email().optional(),
  BRAND_THEME: z.enum(['dark', 'light']).default('dark'),

  // ── Outbound mail (Microsoft Graph SendMail via partner Entra app) ────
  MAIL_FROM_ADDRESS: z
    .string()
    .email()
    .optional()
    .describe('Mailbox in partner tenant used as the From address. Optional — if unset, mail is disabled.'),
  MAIL_FROM_DISPLAY_NAME: z.string().optional(),

  // ── Optional ──────────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
})

export type PortalEnv = z.infer<typeof envSchema>

/**
 * Validate `process.env` and return a strongly-typed config object.
 * Throws a single human-readable error listing every problem at once.
 */
export function validateEnv(source: NodeJS.ProcessEnv = process.env): PortalEnv {
  const result = envSchema.safeParse(source)
  if (result.success) return result.data

  const lines = result.error.issues.map((issue) => {
    const path = issue.path.join('.')
    return `  - ${path}: ${issue.message}`
  })
  throw new Error(
    [
      '─────────────────────────────────────────────────────────────',
      '  baref00t portal — REQUIRED ENV VARS MISSING / INVALID',
      '─────────────────────────────────────────────────────────────',
      ...lines,
      '',
      'See docs/ENV-REFERENCE.md for the full list with examples.',
      '',
    ].join('\n'),
  )
}

/** Singleton validated env. Importing this in any module will fail boot if env is bad. */
let _env: PortalEnv | null = null

/**
 * During `next build`, Next pre-renders server components to detect static
 * pages. We don't want env validation to crash the build for partners who
 * are running `docker build` without secrets — validation happens at runtime
 * via instrumentation.ts instead.
 */
function isBuildPhase(): boolean {
  return (
    process.env['NEXT_PHASE'] === 'phase-production-build' ||
    process.env['NEXT_PHASE'] === 'phase-development-build'
  )
}

const BUILD_PLACEHOLDER: PortalEnv = {
  BAREF00T_API_KEY: 'pk_test_buildplaceholder',
  BAREF00T_API_BASE: 'https://api.baref00t.io',
  AUTH_SECRET: 'this-is-a-build-time-placeholder-only-do-not-use!',
  AUTH_URL: 'https://portal.example.com',
  AZURE_AD_TENANT_ID: '00000000-0000-0000-0000-000000000000',
  AZURE_AD_CLIENT_ID: '00000000-0000-0000-0000-000000000000',
  AZURE_AD_CLIENT_SECRET: 'build-placeholder',
  BRAND_NAME: 'Baref00t Partner Portal',
  BRAND_PRIMARY_COLOR: '#00cc66',
  BRAND_LOGO_URL: undefined,
  BRAND_FAVICON_URL: undefined,
  BRAND_FOOTER_TEXT: '',
  BRAND_CONTACT_EMAIL: undefined,
  BRAND_THEME: 'dark',
  MAIL_FROM_ADDRESS: undefined,
  MAIL_FROM_DISPLAY_NAME: undefined,
  LOG_LEVEL: 'info',
  PORT: 3000,
  NODE_ENV: 'production',
  OTEL_EXPORTER_OTLP_ENDPOINT: undefined,
}

export function env(): PortalEnv {
  if (isBuildPhase()) return BUILD_PLACEHOLDER
  if (!_env) _env = validateEnv()
  return _env
}
