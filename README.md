# baref00t partner-portal

[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Container](https://img.shields.io/badge/ghcr.io-baref00t--portal-blue)](https://github.com/becloudsmart-com/baref00t-portal/pkgs/container/baref00t-portal)
[![SDK](https://img.shields.io/npm/v/@baref00t/sdk?label=%40baref00t%2Fsdk)](https://www.npmjs.com/package/@baref00t/sdk)

White-label, partner-deployable portal for the baref00t platform. Manage your customers, run security assessments, view reports, and send branded notifications — all from your own infrastructure, your own domain, your own Entra tenant.

> Open source (Apache-2.0). Calls the public [baref00t Partner API](https://api.baref00t.io) using your partner API key.

## What you're building against

baref00t is a continuous Microsoft 365 + Azure security assessment platform with **27 products** across four families:

- **Assessments (12)** — frameworks like Essential Eight (AU), MCSB, CIS M365, NIST CSF 2.0, CMMC, NIS2, Cyber Essentials (UK), MAS TRM (SG), CPS 234 (AU), Copilot Readiness, Ransomware Resilience, Power Platform Security
- **Security Packs (7)** — Entra ID Hardening, Email Security, SharePoint Oversharing, Endpoint/Intune, plus industry packs (Finance, Legal, Healthcare)
- **Intelligence Reports (4)** — Cyber Insurance Readiness, Board Cyber Risk, Investor-Ready Security, AICD Governance
- **Productivity Modules (4)** — Licence Optimisation, Adoption & Usage, Copilot ROI, Tenant Health

MSPs operate under one of **3 partner plans** — Starter (10 runs/mo, assessments only), Professional (100 runs/mo, all 27), or Enterprise (unlimited, all 27).

This portal is the partner's white-labelled UI for that platform. Customers and assessments live in baref00t; the portal renders them under your brand and routes notifications through your Microsoft tenant.

## Features

- 🔐 **Single-tenant SSO** via your own Microsoft Entra app — no shared identity
- 👥 **Customer management** — full CRUD + bulk CSV import
- ▶️ **Run assessments** — single + bulk trigger, plan-aware quota enforcement
- 📊 **Usage dashboard** — current month + 12-month history, plan-limit warnings
- 🔑 **API key rotation** — generate, copy-once, revoke (with foot-gun guard)
- 🎨 **Branded UX** — env-driven name, colour, logo, favicon, footer
- ✉️ **White-label email** via Microsoft Graph SendMail using your Entra app + your no-reply mailbox
- 🩺 **Production observability** — `/api/health` + `/api/ready`, structured pino logs, OpenTelemetry-ready

## Quick start (docker-compose)

```bash
# 1. Get the example compose file
curl -O https://raw.githubusercontent.com/becloudsmart-com/baref00t-portal/main/docker-compose.example.yml
mv docker-compose.example.yml docker-compose.yml

# 2. Get the env template
curl -O https://raw.githubusercontent.com/becloudsmart-com/baref00t-portal/main/.env.example
mv .env.example .env

# 3. Edit `.env` — set BAREF00T_API_KEY, AZURE_AD_*, BRAND_*, AUTH_SECRET, AUTH_URL

# 4. Start
docker compose up -d

# 5. Verify
curl http://localhost:3000/api/health
```

Then visit your portal at the URL you set in `AUTH_URL` and sign in with a Microsoft Entra account in your tenant.

## Prerequisites

| Need | Where to get it |
|---|---|
| baref00t Partner API key (`pk_live_…`) | Hosted partner dashboard at `https://www.baref00t.io` → Settings → API keys |
| Microsoft Entra tenant ID | Your Azure AD admin / Entra portal |
| Entra app reg with `User.Read` scope | See [docs/AZURE-SETUP.md](docs/AZURE-SETUP.md) |
| (Optional) `Mail.Send` permission + no-reply mailbox | See [docs/MAIL-SETUP.md](docs/MAIL-SETUP.md) |

## Configuration

Every config is an env var. Full reference: [docs/ENV-REFERENCE.md](docs/ENV-REFERENCE.md).

The portal validates env on boot — if anything required is missing or malformed, it prints a clear error and exits **before** serving any request.

## Deployment guides

- [Docker / docker-compose](docs/DEPLOY-DOCKER.md) (recommended)
- [Fly.io](docs/DEPLOY-FLY.md)
- [Vercel](docs/DEPLOY-VERCEL.md)
- [Kubernetes](docs/DEPLOY-KUBERNETES.md)

## Architecture

```
Your users (your Entra tenant)
   │ Sign in via Microsoft Entra (your app reg, single-tenant)
   ▼
Portal (Next.js 16, this repo, Apache-2.0)
   │ NextAuth session cookie (JWT signed with AUTH_SECRET)
   │
   │ Outbound:
   │  ├─ Partner API calls — X-Partner-Key: pk_live_<your-key>
   │  └─ Mail (optional)   — Microsoft Graph SendMail via your Entra app + your no-reply mailbox
   ▼
api.baref00t.io (baref00t Partner API v1)
   │  Customers, assessments, plans, webhooks, members, branding, mail config
   ▼
baref00t platform (Functions + Durable orchestration + Postgres)
   │  Runs assessments, renders reports, fires webhook events back to you
```

End-user identity stays inside the portal session — the baref00t platform sees only "partner X did Y", never your individual users. Your customer data, assessments, and reports all live in baref00t (so you don't have to host the assessment runners or report storage), but every user-facing surface is yours: your domain, your SSO, your mailbox, your branding.

See [docs/SECURITY.md](docs/SECURITY.md) for the full trust model.

## Versioning

This portal is versioned independently of both the baref00t platform and the SDK. Tags follow `portal-v<major>.<minor>.<patch>`. The image tag matches the git tag.

Each portal release pins an **exact** version of `@baref00t/sdk` (no caret). Most portal releases keep the same SDK pin — UI / UX changes don't require an SDK bump. The pin only moves when the portal needs new SDK features (e.g. a new endpoint or response shape). When that happens, the SDK ships first, then the portal bumps its pin and releases.

The reverse is also true — an SDK release does NOT force a portal release. The portal stays on its pinned SDK version until you cut a new portal tag.

## License

[Apache-2.0](LICENSE). Use, modify, redistribute, embed in commercial products. Patent grant included. Just preserve the LICENSE + NOTICE.
