#!/bin/bash
# Generate changelog.json from git history before Docker build
# Run this from the repo root before `docker compose -f docker-compose.prod.yml up -d --build`

set -e

echo "Generating changelog.json from git history..."
git log --format='{"date":"%as","subject":"%s"}' \
  | python3 -c "
import sys, json
lines = [json.loads(line) for line in sys.stdin if line.strip()]
print(json.dumps(lines, indent=2))
" > changelog.json

echo "changelog.json updated ($(grep -c '"date"' changelog.json) entries)"
