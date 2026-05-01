# Environment variables reference

The portal validates env on boot via zod (`src/env.ts`). Anything required and missing/malformed causes the container to exit with a clear error before serving any request.

## Required

| Var | Type | Description |
|---|---|---|
| `BAREF00T_API_KEY` | `pk_live_…` or `pk_test_…` | Your partner API key from the hosted dashboard. |
| `AUTH_SECRET` | string ≥32 chars | Used to sign NextAuth JWTs. Generate: `openssl rand -base64 32`. |
| `AUTH_URL` | URL | The externally-reachable URL of this portal (e.g. `https://portal.acme.com`). Must match the Entra redirect URI prefix. |
| `AZURE_AD_TENANT_ID` | GUID | Your Microsoft Entra tenant id. |
| `AZURE_AD_CLIENT_ID` | GUID | Your Entra app reg client id. |
| `AZURE_AD_CLIENT_SECRET` | string | Your Entra app reg client secret value. |
| `BRAND_NAME` | string | Display name shown in nav, footer, sign-in page. |
| `BRAND_PRIMARY_COLOR` | `#RRGGBB` | 6-digit hex. Used for buttons, badges, focus rings. |

## Optional with defaults

| Var | Default | Description |
|---|---|---|
| `BAREF00T_API_BASE` | `https://api.baref00t.io` | Override only for staging tests. |
| `BRAND_LOGO_URL` | (none) | Full URL to a logo image (PNG/SVG). Renders in nav + sign-in page. |
| `BRAND_FAVICON_URL` | (none) | Full URL to a favicon. |
| `BRAND_FOOTER_TEXT` | (empty → defaults to `© <year> <name>`) | Custom footer text. |
| `BRAND_CONTACT_EMAIL` | (none) | Linked from footer + sign-in page. |
| `BRAND_THEME` | `dark` | `dark` or `light`. |
| `LOG_LEVEL` | `info` | pino level: `trace` `debug` `info` `warn` `error` `fatal`. |
| `PORT` | `3000` | HTTP port. |
| `NODE_ENV` | `production` | Standard. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | (none) | If set, OpenTelemetry traces are pushed there. |

## Mail (optional)

If `MAIL_FROM_ADDRESS` is unset, all outbound mail is a no-op. See [MAIL-SETUP.md](MAIL-SETUP.md) for the full setup.

| Var | Description |
|---|---|
| `MAIL_FROM_ADDRESS` | Mailbox in your Entra tenant used as the From address. |
| `MAIL_FROM_DISPLAY_NAME` | Optional display name. |

## Secrets handling

- **Never commit `.env`.** The `.gitignore` excludes it.
- **`AUTH_SECRET`** must be at least 32 chars of random entropy. Compromise of this value lets attackers forge session cookies.
- **`AZURE_AD_CLIENT_SECRET`** and **`BAREF00T_API_KEY`** should live in your secrets manager (Vault, Azure Key Vault, AWS Secrets Manager, fly.io secrets, Vercel encrypted env, etc.) — never in plain compose files.
- The portal redacts `BAREF00T_API_KEY`, `AUTH_SECRET`, `AZURE_AD_CLIENT_SECRET`, `Authorization`, `X-Partner-Key`, and `Cookie` from log output.

## Rotation

- **`AUTH_SECRET`** — rotate by setting both old + new comma-separated; existing sessions remain valid until expiry. (Coming in v0.2.)
- **`AZURE_AD_CLIENT_SECRET`** — generate a new secret in Entra (Section 3 of [AZURE-SETUP.md](AZURE-SETUP.md)) → update env → restart container → revoke old secret.
- **`BAREF00T_API_KEY`** — use the in-portal `/admin/api-keys` page; follow the recommended rotation flow shown there.
