# Mail setup (Microsoft Graph SendMail)

The portal can send branded notifications (assessment-complete, customer-created confirmation, report-ready) from a mailbox in **your** Entra tenant — fully white-label, your domain, your SPF/DKIM, your reputation.

This is **optional**. If you don't set `MAIL_FROM_ADDRESS`, the portal silently skips outbound mail.

## How it works

```
Portal (Node)
   │ client_credentials grant via partner Entra app
   ▼
login.microsoftonline.com  →  Microsoft Graph access token (scope: Mail.Send)
   │
   ▼
POST https://graph.microsoft.com/v1.0/users/<MAIL_FROM_ADDRESS>/sendMail
```

No human user is in the loop — the portal authenticates as a service. The `From` address is the mailbox you configure in `MAIL_FROM_ADDRESS`.

## Prerequisites

- An Entra app registration in your tenant — the same one you set up for SSO ([AZURE-SETUP.md](AZURE-SETUP.md)) works fine
- A real mailbox in your Exchange Online tenant for the From address (e.g. `security-no-reply@acme.com`)
- Global Administrator (or Privileged Role Administrator) consent rights

## 1. Add `Mail.Send` application permission

```bash
# 00000003-0000-0000-c000-000000000000 is the Microsoft Graph app
# b633e1c5-b582-4048-a93e-9f11b44c7e96 is Mail.Send (Application)
az ad app permission add \
  --id "$AZURE_AD_CLIENT_ID" \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions b633e1c5-b582-4048-a93e-9f11b44c7e96=Role

az ad app permission admin-consent --id "$AZURE_AD_CLIENT_ID"
```

Or via UI: **Entra portal** → your app reg → **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Application permissions** → check **Mail.Send** → **Grant admin consent for <tenant>**.

> ⚠️ `Mail.Send` (Application) gives the portal the ability to send mail **as any mailbox in your tenant**. To restrict it to one mailbox only, use **Application Access Policies** — see Microsoft's docs on [scoping app-only mail to a single mailbox](https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access). Recommended for production.

## 2. Provision the no-reply mailbox

You need a mailbox that exists in Exchange Online. For most orgs:

- A standard user mailbox (paid Exchange Online licence)
- A shared mailbox (no licence required) — recommended for `no-reply@`-style addresses

Create one if you don't have one:

```bash
# Microsoft 365 admin centre → Users → Active users → Add a user (or shared mailbox)
```

## 3. Configure the portal

```bash
MAIL_FROM_ADDRESS=security-no-reply@acme.com
MAIL_FROM_DISPLAY_NAME=Acme Security Reports
```

Restart the portal.

## 4. Test

After signing in, the portal sends a test email when you (a) trigger an assessment with the customer's `emailReportsEnabled` set, or (b) generate a customer that has `emailConsentEnabled`.

You can also probe directly:

```bash
# Inside the running container, or with the app's env loaded:
node -e "import('./apps/partner-portal/dist/lib/mail.js').then(m => m.sendMail({to:'you@acme.com', subject:'baref00t test', html:'<b>Hello</b>'}).then(console.log))"
```

## Troubleshooting

**`Forbidden — accessDenied`**
Your app doesn't have `Mail.Send` Application permission, or admin consent wasn't granted, or you scoped via Application Access Policies and the configured mailbox is outside the policy.

**`Resource '/users/security-no-reply@acme.com' does not exist`**
The mailbox doesn't exist in your tenant. Create it in the Microsoft 365 admin centre.

**`InvalidAuthenticationToken`**
The client secret expired (default 2 years). Rotate via [AZURE-SETUP.md §3](AZURE-SETUP.md#3-create-a-client-secret).

**Mail goes out but lands in spam**
Configure SPF + DKIM + DMARC for your domain — standard Microsoft 365 outbound mail hardening.
