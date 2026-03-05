#!/usr/bin/env bash
# Simple curl examples to test auth endpoints
BASE_URL="https://localhost:3000/api/users"
CURL="curl -sk"

# 1) Register
$CURL -X POST "$BASE_URL/register" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Test","last_name":"User","email":"test+1@example.com","password":"password123"}'

echo "\n"

# 2) Login (replace email/password if needed)
RESPONSE=$($CURL -X POST "$BASE_URL/login" -H "Content-Type: application/json" -d '{"email":"test+1@example.com","password":"password123"}')

echo "Login response: $RESPONSE"

# extract token using jq if available, fallback to grep
if command -v jq >/dev/null 2>&1; then
  TOKEN=$(echo "$RESPONSE" | jq -r '.token')
else
  TOKEN=$(echo "$RESPONSE" | sed -n 's/.*"token"\s*:\s*"\([^"]*\)".*/\1/p')
fi

echo "Using token: $TOKEN"

echo "\n"

# 3) Get profile
$CURL -X GET "$BASE_URL/profile" -H "Authorization: Bearer $TOKEN"

echo "\n"
