#!/usr/bin/env bash
# seed-demo.sh — Creates a demo user and sample data via the live API.
# Usage: ./scripts/seed-demo.sh [BASE_URL]
# Default BASE_URL: http://178.104.65.177

set -e

BASE_URL="${1:-http://178.104.65.177}"
API="$BASE_URL/api/v1"
YEAR=$(date +%Y)

DEMO_EMAIL="demo@flowikagai.com"
DEMO_PASSWORD="Demo1234!"
DEMO_NAME="Demo User"

echo "==> Seeding demo data at $API"

# ── 1. Register demo user (ignore 400 if already exists) ────────────────────
echo "--> Registering demo user..."
REG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\",\"displayName\":\"$DEMO_NAME\"}")

if [ "$REG_STATUS" = "200" ] || [ "$REG_STATUS" = "201" ]; then
  echo "    Registered successfully."
elif [ "$REG_STATUS" = "400" ]; then
  echo "    Already registered (400) — continuing."
else
  echo "    ERROR: register returned $REG_STATUS"
  exit 1
fi

# ── 2. Login ─────────────────────────────────────────────────────────────────
echo "--> Logging in..."
LOGIN_RESP=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$DEMO_EMAIL\",\"password\":\"$DEMO_PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESP" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "    ERROR: Could not extract access token."
  echo "    Response: $LOGIN_RESP"
  exit 1
fi
echo "    Login OK. Token: ${ACCESS_TOKEN:0:20}..."

AUTH="-H \"Authorization: Bearer $ACCESS_TOKEN\""

# Helper: authenticated POST
api_post() {
  local path="$1"
  local body="$2"
  curl -s -X POST "$API$path" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "$body"
}

# ── 3. Create a deep work goal ────────────────────────────────────────────────
echo "--> Creating 'Build Flowkigai' goal..."
GOAL1_RESP=$(api_post "/goals" "{
  \"title\": \"Build Flowkigai\",
  \"description\": \"Complete the POC and launch to first users.\",
  \"goalType\": \"Project\",
  \"energyType\": \"DeepWork\",
  \"lifeArea\": \"CreativityHobbies\",
  \"year\": $YEAR
}")
GOAL1_ID=$(echo "$GOAL1_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    Goal 1 ID: $GOAL1_ID"

# ── 4. Create a habit goal ────────────────────────────────────────────────────
echo "--> Creating 'Daily deep work' habit goal..."
GOAL2_RESP=$(api_post "/goals" "{
  \"title\": \"Daily deep work\",
  \"description\": \"1 focused session every weekday.\",
  \"goalType\": \"Repetitive\",
  \"energyType\": \"DeepWork\",
  \"lifeArea\": \"LearningGrowth\",
  \"year\": $YEAR
}")
GOAL2_ID=$(echo "$GOAL2_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "    Goal 2 ID: $GOAL2_ID"

# ── 5. Add milestone + tasks to goal 1 ───────────────────────────────────────
if [ -n "$GOAL1_ID" ]; then
  echo "--> Adding milestone to goal 1..."
  MILESTONE_RESP=$(api_post "/goals/$GOAL1_ID/milestones" "{
    \"title\": \"MVP Launch\",
    \"dueDate\": \"$YEAR-12-31\"
  }")
  MILESTONE_ID=$(echo "$MILESTONE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "    Milestone ID: $MILESTONE_ID"

  if [ -n "$MILESTONE_ID" ]; then
    echo "--> Adding tasks..."
    api_post "/goals/$GOAL1_ID/milestones/$MILESTONE_ID/tasks" \
      "{\"title\": \"Deploy to production VPS\", \"isNextAction\": true}" > /dev/null
    api_post "/goals/$GOAL1_ID/milestones/$MILESTONE_ID/tasks" \
      "{\"title\": \"Set up custom domain with HTTPS\", \"isNextAction\": false}" > /dev/null
    api_post "/goals/$GOAL1_ID/milestones/$MILESTONE_ID/tasks" \
      "{\"title\": \"Invite first 3 beta users\", \"isNextAction\": false}" > /dev/null
    echo "    Tasks added."
  fi
fi

# ── 6. Verify ─────────────────────────────────────────────────────────────────
echo "--> Verifying goals..."
GOALS_RESP=$(curl -s "$API/goals?year=$YEAR" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
GOAL_COUNT=$(echo "$GOALS_RESP" | grep -o '"id":"' | wc -l | tr -d ' ')
echo "    Found $GOAL_COUNT goal(s)."

echo ""
echo "==> Seed complete!"
echo "    Login: $DEMO_EMAIL / $DEMO_PASSWORD"
echo "    URL:   $BASE_URL"
