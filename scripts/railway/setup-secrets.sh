#!/bin/bash

# Railway Secrets Setup Script
# Sets up JWT and security secrets
# Reads defaults from .env file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^\s*$' | xargs)
fi

echo "=========================================="
echo "AeroBook - Security Secrets Setup"
echo "=========================================="
echo ""

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    echo "Run: railway link"
    exit 1
fi

echo "Current project:"
railway status
echo ""

echo "=========================================="
echo "JWT & Security Configuration"
echo "=========================================="
echo ""

# Check existing secrets
existing_jwt=$(railway variables | grep "JWT_SECRET" | grep -v "RESET")
existing_reset=$(railway variables | grep "RESET_TOKEN_SECRET")

if [ -n "$existing_jwt" ]; then
    echo "⚠️  JWT_SECRET already exists"
    read -p "Regenerate JWT_SECRET? This will invalidate all existing tokens! (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing JWT_SECRET"
        regenerate_jwt=false
    else
        regenerate_jwt=true
    fi
else
    regenerate_jwt=true
fi

if [ -n "$existing_reset" ]; then
    echo "⚠️  RESET_TOKEN_SECRET already exists"
    read -p "Regenerate RESET_TOKEN_SECRET? This will invalidate existing reset links! (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing RESET_TOKEN_SECRET"
        regenerate_reset=false
    else
        regenerate_reset=true
    fi
else
    regenerate_reset=true
fi

echo ""

# Generate and set secrets
if [ "$regenerate_jwt" = true ]; then
    jwt_secret=$(openssl rand -base64 32)
    railway variables set JWT_SECRET="$jwt_secret"
    echo "✓ JWT_SECRET generated and set"
fi

if [ "$regenerate_reset" = true ]; then
    reset_secret=$(openssl rand -base64 32)
    railway variables set RESET_TOKEN_SECRET="$reset_secret"
    echo "✓ RESET_TOKEN_SECRET generated and set"
fi

echo ""
echo "=========================================="
echo "Security Setup Complete!"
echo "=========================================="
echo ""
echo "Current secrets (truncated for security):"
railway variables | grep -E "JWT_SECRET|RESET_TOKEN_SECRET" | sed 's/│ \(.\{10\}\).*/│ \1.../'
echo ""
