# Azure Entra setup

The portal uses your own Microsoft Entra app registration for **single-tenant SSO** — only users in your tenant can sign in. Optionally the same app reg also handles **outbound mail** via Microsoft Graph (see [MAIL-SETUP.md](MAIL-SETUP.md)).

This guide assumes you have Global Administrator (or equivalent) rights on your Entra tenant.

## 1. Pick where the portal will be reachable

You need an HTTPS URL the portal will be served from. Examples:

- `https://portal.acme.com` (custom domain)
- `https://acme.fly.dev` (fly.io default)
- `https://acme-portal.vercel.app` (Vercel default)
- `http://localhost:3001` (local development only)

The redirect URI you'll register in Entra is `<your URL>/api/auth/callback/microsoft-entra-id`.

## 2. Create the app registration

Either via the Entra portal **or** via the Azure CLI.

### Option A — Azure CLI (one-shot)

```bash
APP_NAME='Acme Cloud Portal'
REDIRECT_URI='https://portal.acme.com/api/auth/callback/microsoft-entra-id'
TENANT_ID=$(az account show --query tenantId -o tsv)

az ad app create \
  --display-name "$APP_NAME" \
  --sign-in-audience AzureADMyOrg \
  --web-redirect-uris "$REDIRECT_URI"

APP_ID=$(az ad app list --display-name "$APP_NAME" --query '[0].appId' -o tsv)
echo "AZURE_AD_TENANT_ID=$TENANT_ID"
echo "AZURE_AD_CLIENT_ID=$APP_ID"
```

### Option B — Entra portal (UI)

1. Go to https://entra.microsoft.com → **App registrations** → **+ New registration**
2. Name: `Acme Cloud Portal` (any name)
3. Supported account types: **Accounts in this organizational directory only (Single tenant)**
4. Redirect URI: select **Web**, enter `https://<your-portal-url>/api/auth/callback/microsoft-entra-id`
5. Click **Register**
6. From the Overview page copy:
   - **Application (client) ID** → `AZURE_AD_CLIENT_ID` env var
   - **Directory (tenant) ID** → `AZURE_AD_TENANT_ID` env var

## 3. Create a client secret

```bash
az ad app credential reset \
  --id "$APP_ID" \
  --display-name 'portal-client-secret-2026' \
  --years 2 \
  --append \
  --query password -o tsv
```

Copy the output → `AZURE_AD_CLIENT_SECRET` env var. **You cannot retrieve it later** — save it to your secrets manager now.

(Or via UI: **Certificates & secrets** → **+ New client secret** → Copy the **Value** column.)

## 4. Add API permissions

You need `User.Read` (delegated) at minimum. The portal also asks for `openid profile email offline_access` automatically.

```bash
# Microsoft Graph User.Read (delegated)
az ad app permission add \
  --id "$APP_ID" \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Scope

# Grant admin consent
az ad app permission admin-consent --id "$APP_ID"
```

Or via UI: **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Delegated permissions** → check **User.Read** → **Grant admin consent**.

## 5. (Optional) Add Mail.Send for outbound notifications

If you want the portal to send branded emails from your tenant, see [MAIL-SETUP.md](MAIL-SETUP.md).

## 6. Configure the portal

```bash
# .env or however you provide env to your container
AZURE_AD_TENANT_ID=<from step 2>
AZURE_AD_CLIENT_ID=<from step 2>
AZURE_AD_CLIENT_SECRET=<from step 3>
AUTH_URL=https://portal.acme.com
```

Restart the portal. Visit `AUTH_URL/sign-in` and click "Sign in with Microsoft".

## Troubleshooting

**"AADSTS500113: No reply address is registered for the application"**
You missed step 2 — the redirect URI registered on the Entra app doesn't match `AUTH_URL/api/auth/callback/microsoft-entra-id`.

**"AADSTS50194: Application is not configured as a multi-tenant application"**
Expected — this portal is single-tenant. Users from other tenants cannot sign in.

**"OAuthCallbackError"**
Usually a client_secret mismatch. Generate a new one (step 3) and update `AZURE_AD_CLIENT_SECRET`. If using Windows shell, watch out for trailing line endings polluting the secret value — pipe via `tr -d '\r\n'` or use a secrets manager.
