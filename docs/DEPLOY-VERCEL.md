# Deploy: Vercel

> ⚠️ Vercel runs the Next.js app on serverless — long-lived background tasks (e.g. mail sending in a server action) work but have a 60s execution limit on the Hobby plan. Pro/Enterprise are recommended for production.

## 1. Fork the public repo

Fork https://github.com/becloudsmart-com/baref00t-portal to your own GitHub org. (You can skip this and import directly, but a fork lets you customise the brand env if you want.)

## 2. Import to Vercel

1. https://vercel.com/new → import your forked repo
2. **Framework preset**: Next.js (auto-detected)
3. **Root directory**: `/` (or `apps/partner-portal` if you forked the monorepo)
4. **Build command**: `pnpm build` (auto-detected)
5. **Output**: leave default

## 3. Set environment variables

In the Vercel project settings → **Environment variables**, add (for the **Production** environment):

| Variable | Notes |
|---|---|
| `BAREF00T_API_KEY` | from baref00t hosted dashboard |
| `AUTH_SECRET` | generate with `openssl rand -base64 32` |
| `AUTH_URL` | `https://your-deployment.vercel.app` (or custom domain) |
| `AZURE_AD_TENANT_ID` | your tenant GUID |
| `AZURE_AD_CLIENT_ID` | your Entra app reg GUID |
| `AZURE_AD_CLIENT_SECRET` | your Entra client secret value |
| `BRAND_NAME` | display name |
| `BRAND_PRIMARY_COLOR` | `#RRGGBB` |
| `BRAND_LOGO_URL` | full URL |

Mark `BAREF00T_API_KEY`, `AUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` as **Sensitive** (Vercel encrypts them at rest and never exposes to the build logs).

## 4. Deploy

Push to your fork's `main` branch (or click **Deploy** in Vercel UI). Vercel will build, run env validation, and start the portal.

## 5. Configure your Entra app

Go back to your Entra app reg → **Authentication** → add your Vercel URL as a redirect URI:

```
https://your-deployment.vercel.app/api/auth/callback/microsoft-entra-id
```

(Use your custom domain if you've added one.)

## 6. Verify

Visit your Vercel URL → click **Sign in with Microsoft** → complete the Entra flow.

## Custom domain

In Vercel → **Settings** → **Domains** → add `portal.your-company.com`. Vercel handles TLS automatically.

After the domain resolves, update both:
- The portal's `AUTH_URL` env var to the custom domain
- Your Entra app's redirect URI

## Upgrades

Vercel auto-builds on every push to your fork's `main` branch. To upgrade to a new portal release:

```bash
# In your forked repo
git fetch upstream
git rebase upstream/main
git push origin main
# Vercel rebuilds + deploys
```

Alternatively, pin a specific git tag:

```bash
git checkout portal-v0.2.0
git push origin portal-v0.2.0:main --force
```
