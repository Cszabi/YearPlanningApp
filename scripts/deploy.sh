#!/bin/bash
# Full deploy script — run from repo root on VPS
set -e

echo "=== Flowkigai Deploy ==="

# 1. Pull latest code
git pull origin master

# 2. Auto-generate changelog.json from git history
bash scripts/pre-deploy.sh

# 3. Build and restart containers
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Deploy complete ==="
