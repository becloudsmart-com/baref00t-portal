# Deploy: fly.io

Single command to launch on a globally-distributed PaaS.

## 1. Install flyctl

```bash
brew install flyctl              # macOS
curl -L https://fly.io/install.sh | sh    # Linux/WSL
flyctl auth signup
```

## 2. Create the app

```bash
mkdir baref00t-portal && cd baref00t-portal
flyctl launch \
  --image ghcr.io/becloudsmart-com/baref00t-portal:latest \
  --no-deploy \
  --copy-config=false \
  --name your-portal-name
# fly will write fly.toml — open it
```

Edit `fly.toml`:

```toml
app = "your-portal-name"
primary_region = "syd"   # or any fly region

[http_service]
  internal_port = 3000
  force_https = true
  auto_start_machines = true
  auto_stop_machines = true
  min_machines_running = 1
  processes = ["app"]

  [[http_service.checks]]
    grace_period = "10s"
    interval = "30s"
    method = "get"
    timeout = "5s"
    path = "/api/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

## 3. Set secrets

```bash
flyctl secrets set \
  BAREF00T_API_KEY="pk_live_..." \
  AUTH_SECRET="$(openssl rand -base64 32)" \
  AUTH_URL="https://your-portal-name.fly.dev" \
  AZURE_AD_TENANT_ID="..." \
  AZURE_AD_CLIENT_ID="..." \
  AZURE_AD_CLIENT_SECRET="..." \
  BRAND_NAME="Your Company Portal" \
  BRAND_PRIMARY_COLOR="#00cc66"
```

## 4. Deploy

```bash
flyctl deploy
flyctl logs
```

## 5. Custom domain

```bash
flyctl certs add portal.your-company.com
# follow CNAME / A record instructions
flyctl secrets set AUTH_URL="https://portal.your-company.com"
flyctl deploy
```

Then update your Entra app reg's redirect URI to match the new `AUTH_URL`.

## Upgrades

```bash
flyctl deploy --image ghcr.io/becloudsmart-com/baref00t-portal:latest
# or pin a specific tag
flyctl deploy --image ghcr.io/becloudsmart-com/baref00t-portal:0.2.0
```
