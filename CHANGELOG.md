# @baref00t/partner-portal — changelog

## 0.1.0 (unreleased)

Initial production release.

- Single-tenant Microsoft Entra SSO via partner-owned app reg
- Customer CRUD: list, detail, create, edit, delete, CSV bulk import
- Assessment lifecycle: list with filters, run wizard, run detail
- Admin: configuration view (env-driven, read-only), API key rotation
  with one-time-reveal modal + lock-yourself-out guard, usage dashboard
  with 12-month history + plan-quota warnings, branding preview
- Microsoft Graph SendMail helper (optional — partner Entra app Mail.Send,
  configurable From address; gracefully no-ops if MAIL_FROM_ADDRESS unset)
- Health (`/api/health`) + readiness (`/api/ready` pings upstream baref00t
  API and surfaces partner identity)
- Branded UX driven by `BRAND_*` env (name, primary colour, logo, favicon,
  footer, contact, dark/light theme) — runtime injection via per-request
  CSP nonce, no rebuild required to rebrand
- Boot-time env validation via zod — refuses to start half-configured
- Production Docker image at `ghcr.io/becloudsmart-com/baref00t-portal:0.1.0`
  (multi-stage Next standalone, non-root, `node 20 bookworm-slim`)
- Apache-2.0 licence

Out of scope (deferred):
- `/runs/[id]/report` viewer + PDF download — depends on the upstream
  `GET /v1/partner/assessments/:id/report` endpoint, tracked separately
- `/admin/webhooks` CRUD — depends on Partner-scope webhook endpoints,
  tracked separately
- Members / role management UI (partner manages user access via Entra)
- Billing / plan-change UI (platform-managed in hosted dashboard)
