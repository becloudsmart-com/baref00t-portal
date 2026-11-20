# Deploy: docker-compose

Smallest production setup — runs anywhere with Docker.

## 1. Set up the host

Any Linux host with Docker Engine ≥24 + docker-compose plugin. Ubuntu 22.04+ recommended.

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# log out + back in
```

## 2. Get the artifacts

```bash
mkdir baref00t-portal && cd baref00t-portal
curl -O https://raw.githubusercontent.com/becloudsmart-com/baref00t-portal/main/docker-compose.example.yml
mv docker-compose.example.yml docker-compose.yml
curl -O https://raw.githubusercontent.com/becloudsmart-com/baref00t-portal/main/.env.example
mv .env.example .env
```

## 3. Configure

Edit `.env`. At minimum set:

- `BAREF00T_API_KEY` — your partner API key
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_URL` — `https://portal.your-company.com` (or whatever HTTPS URL fronts the portal)
- `AZURE_AD_TENANT_ID`, `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET` — from [AZURE-SETUP.md](AZURE-SETUP.md)
- `BRAND_NAME`, `BRAND_PRIMARY_COLOR`, `BRAND_LOGO_URL` — your brand

## 4. Reverse proxy

The portal listens on port 3000 by default and does **not** terminate TLS itself. Front it with one of:

### Caddy (simplest — auto-HTTPS via Let's Encrypt)

```Caddyfile
portal.your-company.com {
    reverse_proxy localhost:3000
    encode zstd gzip
}
```

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name portal.your-company.com;

    ssl_certificate     /etc/letsencrypt/live/portal.your-company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.your-company.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }
}
```

### Traefik

Add labels to the compose service:

```yaml
services:
  portal:
    image: ghcr.io/becloudsmart-com/baref00t-portal:latest
    labels:
      - traefik.enable=true
      - traefik.http.routers.portal.rule=Host(`portal.your-company.com`)
      - traefik.http.routers.portal.entrypoints=websecure
      - traefik.http.routers.portal.tls.certresolver=letsencrypt
      - traefik.http.services.portal.loadbalancer.server.port=3000
```

## 5. Start

```bash
docker compose up -d
docker compose logs -f portal
```

## 6. Verify

```bash
curl https://portal.your-company.com/api/health
# {"status":"ok",...}

curl https://portal.your-company.com/api/ready
# {"status":"ready", "partnerId":"...", "plan":"..."}
```

Then visit https://portal.your-company.com/ in a browser → sign in.

## Upgrades

```bash
docker compose pull
docker compose up -d
```

Rollback to a specific version:

```yaml
# docker-compose.yml
services:
  portal:
    image: ghcr.io/becloudsmart-com/baref00t-portal:0.1.0    # pin version
```

## Logs

```bash
docker compose logs portal --tail=200 -f
```

For long-term log shipping to Datadog / Loki / Splunk, set `OTEL_EXPORTER_OTLP_ENDPOINT` to your collector and configure your collector's log pipeline.
