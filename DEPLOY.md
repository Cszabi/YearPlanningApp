# Deployment Runbook — Flowkigai

Single-origin deployment on a Hetzner VPS. The .NET API serves both the REST endpoints and the React SPA. Caddy handles TLS via Let's Encrypt.

## Prerequisites

- Hetzner CX22 (or larger) running Ubuntu 24.04
- A domain name pointed at the VPS IP (required for automatic HTTPS)

---

## 1. Provision the VPS

```bash
# SSH in as root, then create a non-root user
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## 2. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker deploy
# Log out and back in for group membership to take effect
```

## 3. Clone the repository

```bash
git clone <your-repo-url> ~/flowkigai
cd ~/flowkigai
```

## 4. Create the `.env` file

```bash
cp .env.production.example .env
nano .env
```

Fill in real values:
- `POSTGRES_PASSWORD` — strong random password (e.g. `openssl rand -hex 32`)
- `JWT_SECRET_KEY` — 64-char random string (e.g. `openssl rand -hex 32`)

```bash
chmod 600 .env
```

**Never commit `.env` to git.**

## 5. Configure the domain

Edit `Caddyfile` and replace `your-domain.com` with your actual domain:

```bash
nano Caddyfile
```

For IP-only testing (no domain, HTTP only), replace the contents with:

```
:80 {
    reverse_proxy api:8080
}
```

## 6. Build and start

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

First run will:
1. Build the React frontend (Node 22)
2. Build and publish the .NET API
3. Pull Postgres 16 and Caddy 2
4. Run EF Core migrations automatically on API startup
5. Caddy provisions a Let's Encrypt certificate (requires port 80/443 open)

## 7. Verify

```bash
# Check all services are running
docker compose -f docker-compose.prod.yml ps

# Watch API logs (including migration output)
docker compose -f docker-compose.prod.yml logs -f api

# Test the API
curl https://your-domain.com/api/v1/health

# Test the SPA is served
curl -I https://your-domain.com/
```

## 8. Updating

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

EF migrations run automatically on each startup — no manual step needed.

## Troubleshooting

| Symptom | Check |
|---------|-------|
| API fails to start | `docker compose -f docker-compose.prod.yml logs api` — look for migration or JWT secret errors |
| 502 Bad Gateway from Caddy | API container not healthy; check logs above |
| Caddy not getting certificate | Ensure ports 80 and 443 are open in Hetzner firewall and DNS A record is set |
| Database connection refused | `docker compose -f docker-compose.prod.yml logs postgres` |

## Security notes

- Postgres and the API are not exposed on host ports — only Caddy is internet-facing
- The `.env` file contains secrets; restrict permissions: `chmod 600 .env`
- JWT secret must be ≥ 32 chars; the API will refuse to start otherwise
