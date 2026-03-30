#!/bin/bash

# Railway Complete Environment Setup Script
# Sets up all environment variables for AeroBook API
# Reads from environment-specific .env files (.env.staging, .env.production)

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "=========================================="
    echo "AeroBook - Complete Environment Setup"
    echo "=========================================="
    echo ""
    echo "Please specify an environment:"
    echo "1. staging"
    echo "2. production"
    echo ""
    read -p "Select environment (1 or 2): " env_choice
    case $env_choice in
        1) ENVIRONMENT="staging" ;;
        2) ENVIRONMENT="production" ;;
        *) echo "Invalid choice. Exiting."; exit 1 ;;
    esac
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

echo "=========================================="
echo "AeroBook - Setup for $ENVIRONMENT"
echo "=========================================="
echo ""

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    echo "Run: railway link"
    exit 1
fi

# Switch environment
echo "Switching to Railway environment: $ENVIRONMENT..."
railway env "$ENVIRONMENT"
echo ""

# 1. Sync Variables from .env file
echo "------------------------------------------"
echo "1. Syncing variables from $ENV_FILE"
echo "------------------------------------------"
"$SCRIPT_DIR/setup-env-vars.sh" "$ENVIRONMENT"
echo ""

# 2. Security Secrets (JWT)
echo "------------------------------------------"
echo "2. Security Secrets (JWT)"
echo "------------------------------------------"
echo "Generating secure secrets for $ENVIRONMENT..."
jwt_secret=$(openssl rand -base64 32)
reset_token_secret=$(openssl rand -base64 32)

railway variables set JWT_SECRET="$jwt_secret"
railway variables set RESET_TOKEN_SECRET="$reset_token_secret"

echo "✓ JWT_SECRET set"
echo "✓ RESET_TOKEN_SECRET set"
echo ""

# 3. Clean up legacy variables
echo "------------------------------------------"
echo "3. Cleaning Up Legacy Variables"
echo "------------------------------------------"
# Remove old SMTP variables
yes | railway variable delete SMTP_HOST 2>/dev/null && echo "✓ Removed SMTP_HOST"
yes | railway variable delete SMTP_PORT 2>/dev/null && echo "✓ Removed SMTP_PORT"
yes | railway variable delete SMTP_SECURE 2>/dev/null && echo "✓ Removed SMTP_SECURE"
yes | railway variable delete SMTP_USER 2>/dev/null && echo "✓ Removed SMTP_USER"
yes | railway variable delete SMTP_PASS 2>/dev/null && echo "✓ Removed SMTP_PASS"
yes | railway variable delete SMTP_FROM 2>/dev/null && echo "✓ Removed SMTP_FROM"

# Remove old DB_ variables (Railway uses DATABASE_URL)
yes | railway variable delete DB_HOST 2>/dev/null && echo "✓ Removed DB_HOST"
yes | railway variable delete DB_PORT 2>/dev/null && echo "✓ Removed DB_PORT"
yes | railway variable delete DB_USER 2>/dev/null && echo "✓ Removed DB_USER"
yes | railway variable delete DB_PASSWORD 2>/dev/null && echo "✓ Removed DB_PASSWORD"
yes | railway variable delete DB_NAME 2>/dev/null && echo "✓ Removed DB_NAME"
echo ""

echo "=========================================="
echo "Setup Complete for $ENVIRONMENT!"
echo "=========================================="
echo ""
echo "Current configuration (truncated):"
railway variables | grep -E "APP_URL|ALLOWED_ORIGINS|JWT_SECRET|RESEND_" | sed 's/│ \(.\{10\}\).*/│ \1.../'
echo ""
