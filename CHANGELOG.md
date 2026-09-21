# @baref00t/partner-portal — changelog

## 0.2.7

**Security release. If you self-host this portal, upgrade.**

Three authorization defects. Before this version a signed-in user with any
role could perform administrative actions on four surfaces, because the only
thing in the way was the UI not rendering a button — and a server action is a
POST endpoint that anyone able to craft a request can call.

### Fixed

- **Admin is now required on 15 privileged actions that had no check at all.**
  Webhooks (create, toggle, rotate secret, delete, test, list deliveries),
  mail (mode, disconnect, send test, shared mailbox, connect), branding
  (preview, send preview, save) and billing (portal URL). API keys and members
  were already gated; these four surfaces were not, and neither was
  middleware.

  The platform cannot gate this for you: the portal authenticates with one
  shared partner API key, and a raw key is Admin-equivalent for the whole
  account — so the platform's own Admin check passes for every portal caller
  whatever their role. Only the portal can tell a Viewer from an Admin.

- **The Admin role is resolved live, not from the sign-in snapshot.**
  Previously it was read once at sign-in and carried on the session for up to
  8 hours, so removing or demoting a member in the Members tab did not take
  effect until their session expired. An offboarded administrator kept the
  ability to mint API keys and rotate webhook secrets for that whole window.
  Resolution now happens per privileged action, and fails closed.

- **The auth error page was unreachable.** A refused sign-in redirected to
  `/auth/error`, which 404'd: the page lives at `(auth)/error/page.tsx` and
  `(auth)` is a route group Next strips from the URL, so the real path is
  `/error` — which was also absent from the middleware allowlist and bounced
  to `/sign-in`. Every refusal showed a 404, which made a working
  authorization check indistinguishable from a broken application.

### Changed

- Dependency updates, including `lucide-react` 0.462 → 1.45 and a 26-package
  group bump. Icon default render attributes are unchanged in value; the
  library moved from camelCase React props to kebab-case attributes
  internally, which this portal does not override anywhere.

### Verification

These gates previously shipped with unit tests only. This is the first release
exercised against a live Microsoft Entra sign-in and a real member list: a
Viewer was refused on branding, and a role changed underneath a live session
took effect on the next action rather than at session expiry.

## 0.2.6

Security rebuild. No application code changed — this release exists because
the image you self-host was built before two dependency fixes landed, and
nothing rebuilds it on your behalf.

### Fixed

- **`libpcre2-8-0` 10.42-1 → 10.42-1+deb12u1** — CVE-2026-86145 and
  CVE-2026-89161, both HIGH (out-of-bounds write). The package is pulled from
  `bookworm-security` in the runtime stage. Re-pinning the base image does not
  help: as of 2026-09-14 the current `node:24-bookworm-slim` carries the same
  vulnerable 10.42-1.
- **`fast-uri` 3.1.5 → 3.1.6** — CVE-2026-75899, -75931, -75975 and -76172,
  all HIGH: server-side request forgery and host confusion in URI parsing.
  Reached transitively via `ajv`. The override landed 2026-09-03, after
  0.2.5 was tagged.

**If you self-host, pull this.** 0.2.5 carries all six.

> Note: 0.2.1 through 0.2.5 have no entries here. That gap is pre-existing
> and has not been backfilled from commit history.

## 0.2.0

Major v0.2 release — see #325 for the full epic.

### Features

- **PWA support** — installable on iOS / Android / desktop. Manifest with
  maskable icons, hand-rolled service worker (network-first for HTML with
  /offline fallback, stale-while-revalidate for static assets, no caching
  for /api/*), in-page install prompt + new-version-available banner.
- **Full Mail Sender management UI** — replaces the v0.1.4 deep-link
  placeholder. Live status, provider toggle (resend / microsoft / off),
  send test, disconnect, shared-mailbox UPN — all native. The OAuth
  consent dance still happens on baref00t.io (the Partner Mail Sender
  Entra app reg is platform-owned), but every other action is in-portal.
- **Microsoft Graph profile + photo** — the user menu now pulls
  displayName, jobTitle, department, and the user's profile photo from
  Graph (User.Read scope, already requested). Photo proxied through
  /api/me/photo so the access token stays server-side.
- **Send branding preview to me** — one-click send of the rendered
  preview HTML to the signed-in user's mailbox, via the portal's own
  Microsoft Graph SendMail (MAIL_FROM_ADDRESS env).
- **Inline results breakdown on run detail** — surfaces report SAS-link
  expiry alongside the existing view/download buttons. Per-control
  scoring still requires a new platform endpoint (documented inline).

## 0.1.2

### Patch Changes

- Updated dependencies [3da1f8f]
  - @baref00t/sdk@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [6b2f237]
- Updated dependencies [2021abc]
- Updated dependencies [8f42b9a]
  - @baref00t/sdk@0.2.0

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
