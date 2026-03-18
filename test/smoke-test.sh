#!/usr/bin/env bash
# Smoke tests against the live running server
# Usage: bash test/smoke-test.sh [base_url]
# Default base URL is https://localhost:3000

BASE_URL="${1:-https://localhost:3000}"
CURL="curl -sk"
PASS=0
FAIL=0

green='\033[0;32m'
red='\033[0;31m'
reset='\033[0m'

check() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    printf "${green}✓${reset} %s\n" "$label"
    PASS=$((PASS + 1))
  else
    printf "${red}✗${reset} %s (expected %s, got %s)\n" "$label" "$expected" "$actual"
    FAIL=$((FAIL + 1))
  fi
}

# ── Auth ────────────────────────────────────────────────────────────────────

# Use seeded admin credentials (configurable via environment variables)
EMAIL="${SMOKE_ADMIN_EMAIL:-admin@aerobook.app}"
PASSWORD="${SMOKE_ADMIN_PASSWORD:-admin123}"

# Verify register endpoint is removed (should return 404)
STATUS=$($CURL -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/users/register" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Smoke\",\"last_name\":\"Test\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"admin\"}")
check "POST /api/users/register (removed → 404)" "404" "$STATUS"

# Login
RESPONSE=$($CURL -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
if command -v jq >/dev/null 2>&1; then
  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
else
  TOKEN=$(echo "$RESPONSE" | sed -n 's/.*"token"\s*:\s*"\([^"]*\)".*/\1/p')
fi
[ -n "$TOKEN" ] && [ "$TOKEN" != "null" ] \
  && check "POST /api/users/login (token received)" "ok" "ok" \
  || check "POST /api/users/login (token received)" "ok" "fail"

# Profile
STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/users/profile" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/users/profile" "200" "$STATUS"

# No token → 401
STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/users/profile")
check "GET /api/users/profile (no token → 401)" "401" "$STATUS"

# Wrong password → 401
STATUS=$($CURL -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpassword\"}")
check "POST /api/users/login (wrong password → 401)" "401" "$STATUS"

# ── Members ─────────────────────────────────────────────────────────────────

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/members" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/members" "200" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/members/9999999" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/members/:id (not found → 404)" "404" "$STATUS"

# Get member id from profile
PROFILE=$($CURL "$BASE_URL/api/users/profile" -H "Authorization: Bearer $TOKEN")
if command -v jq >/dev/null 2>&1; then
  MEMBER_ID=$(echo "$PROFILE" | jq -r '.id')
else
  MEMBER_ID=$(echo "$PROFILE" | sed -n 's/.*"id"\s*:\s*\([0-9]*\).*/\1/p' | head -1)
fi

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/members/$MEMBER_ID" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/members/:id" "200" "$STATUS"

# ── Aircraft ────────────────────────────────────────────────────────────────

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/aircraft" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/aircraft" "200" "$STATUS"

AIRCRAFT=$($CURL -X POST "$BASE_URL/api/aircraft" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tail_number":"N-SMOKE1","make":"Cessna","model":"172S","year":2020,"hourly_rate":150,"current_tach_hours":500}')
if command -v jq >/dev/null 2>&1; then
  AIRCRAFT_ID=$(echo "$AIRCRAFT" | jq -r '.id')
else
  AIRCRAFT_ID=$(echo "$AIRCRAFT" | sed -n 's/.*"id"\s*:\s*\([0-9]*\).*/\1/p' | head -1)
fi
[ -n "$AIRCRAFT_ID" ] && [ "$AIRCRAFT_ID" != "null" ] \
  && check "POST /api/aircraft (id returned)" "ok" "ok" \
  || check "POST /api/aircraft (id returned)" "ok" "fail"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/aircraft/$AIRCRAFT_ID" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/aircraft/:id" "200" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/aircraft/9999999" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/aircraft/:id (not found → 404)" "404" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/aircraft/$AIRCRAFT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"make":"Cessna","model":"172S","year":2020,"hourly_rate":160,"current_tach_hours":505,"is_available":true}')
check "PUT /api/aircraft/:id" "200" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" \
  "$BASE_URL/api/aircraft/availability?start_time=2026-04-01T10:00:00Z&end_time=2026-04-01T12:00:00Z" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/aircraft/availability" "200" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" \
  "$BASE_URL/api/aircraft/availability" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/aircraft/availability (missing params → 400)" "400" "$STATUS"

# ── Reservations ─────────────────────────────────────────────────────────────

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/reservations" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/reservations" "200" "$STATUS"

RESERVATION=$($CURL -X POST "$BASE_URL/api/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"member_id\":$MEMBER_ID,\"aircraft_id\":$AIRCRAFT_ID,\"start_time\":\"2026-06-01T09:00:00Z\",\"end_time\":\"2026-06-01T11:00:00Z\",\"notes\":\"Smoke test\"}")
if command -v jq >/dev/null 2>&1; then
  RESERVATION_ID=$(echo "$RESERVATION" | jq -r '.id')
else
  RESERVATION_ID=$(echo "$RESERVATION" | sed -n 's/.*"id"\s*:\s*\([0-9]*\).*/\1/p' | head -1)
fi
[ -n "$RESERVATION_ID" ] && [ "$RESERVATION_ID" != "null" ] \
  && check "POST /api/reservations (id returned)" "ok" "ok" \
  || check "POST /api/reservations (id returned)" "ok" "fail"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/reservations/$RESERVATION_ID" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/reservations/:id" "200" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/reservations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"member_id\":$MEMBER_ID,\"aircraft_id\":$AIRCRAFT_ID,\"start_time\":\"2026-06-01T09:00:00Z\",\"end_time\":\"2026-06-01T11:00:00Z\"}")
check "POST /api/reservations (conflict → 409)" "409" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/reservations/9999999" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/reservations/:id (not found → 404)" "404" "$STATUS"

# ── Flight Logs ──────────────────────────────────────────────────────────────

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/flight-logs" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/flight-logs" "200" "$STATUS"

FLIGHTLOG=$($CURL -X POST "$BASE_URL/api/flight-logs" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"reservation_id\":$RESERVATION_ID,\"member_id\":$MEMBER_ID,\"aircraft_id\":$AIRCRAFT_ID,\"tach_start\":500,\"tach_end\":502.5,\"flight_date\":\"2026-06-01\",\"departure_time\":\"2026-06-01T09:05:00Z\",\"arrival_time\":\"2026-06-01T10:55:00Z\"}")
if command -v jq >/dev/null 2>&1; then
  FLIGHTLOG_ID=$(echo "$FLIGHTLOG" | jq -r '.id')
else
  FLIGHTLOG_ID=$(echo "$FLIGHTLOG" | sed -n 's/.*"id"\s*:\s*\([0-9]*\).*/\1/p' | head -1)
fi
[ -n "$FLIGHTLOG_ID" ] && [ "$FLIGHTLOG_ID" != "null" ] \
  && check "POST /api/flight-logs (id returned)" "ok" "ok" \
  || check "POST /api/flight-logs (id returned)" "ok" "fail"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/flight-logs/$FLIGHTLOG_ID" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/flight-logs/:id" "200" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/flight-logs/9999999" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/flight-logs/:id (not found → 404)" "404" "$STATUS"

# ── Billing ──────────────────────────────────────────────────────────────────

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/billing" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/billing" "200" "$STATUS"

BILLING=$($CURL -X POST "$BASE_URL/api/billing/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"flight_log_id\":$FLIGHTLOG_ID}")
if command -v jq >/dev/null 2>&1; then
  BILLING_ID=$(echo "$BILLING" | jq -r '.id')
else
  BILLING_ID=$(echo "$BILLING" | sed -n 's/.*"id"\s*:\s*\([0-9]*\).*/\1/p' | head -1)
fi
[ -n "$BILLING_ID" ] && [ "$BILLING_ID" != "null" ] \
  && check "POST /api/billing/generate (id returned)" "ok" "ok" \
  || check "POST /api/billing/generate (id returned)" "ok" "fail"

# Duplicate billing → 409
STATUS=$($CURL -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/billing/generate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"flight_log_id\":$FLIGHTLOG_ID}")
check "POST /api/billing/generate (duplicate → 409)" "409" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/billing/$BILLING_ID/pay" \
  -H "Authorization: Bearer $TOKEN")
check "PUT /api/billing/:id/pay" "200" "$STATUS"

STATUS=$($CURL -o /dev/null -w "%{http_code}" "$BASE_URL/api/billing/summary/$MEMBER_ID" \
  -H "Authorization: Bearer $TOKEN")
check "GET /api/billing/summary/:member_id" "200" "$STATUS"

# ── Cleanup ──────────────────────────────────────────────────────────────────

$CURL -X DELETE "$BASE_URL/api/billing/$BILLING_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
$CURL -X DELETE "$BASE_URL/api/flight-logs/$FLIGHTLOG_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
$CURL -X DELETE "$BASE_URL/api/reservations/$RESERVATION_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
$CURL -X DELETE "$BASE_URL/api/aircraft/$AIRCRAFT_ID" -H "Authorization: Bearer $TOKEN" > /dev/null

# ── Summary ──────────────────────────────────────────────────────────────────

printf "\nResults: ${green}%d passed${reset}, ${red}%d failed${reset}\n" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
