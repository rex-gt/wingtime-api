#!/bin/bash

# Railway Complete Environment Setup Script
# Sets up all environment variables for AeroBook API
# Reads defaults from .env file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^\s*$' | xargs)
fi

echo "=========================================="
echo "AeroBook - Complete Environment Setup"
echo "=========================================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    echo ""
    echo "Install it with: brew install railway"
    echo "Or visit: https://docs.railway.app/develop/cli"
    exit 1
fi

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged into Railway."
    echo ""
    echo "Please run: railway login"
    exit 1
fi

echo "✓ Railway CLI is ready"
echo ""

# Check if linked to a project
if ! railway status &> /dev/null; then
    echo "⚠️  Not linked to a Railway project."
    echo ""
    read -p "Would you like to link to a project now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway link
    else
        echo "Please run 'railway link' first, then run this script again."
        exit 1
    fi
fi

echo "Current Railway project:"
railway status
echo ""

# ==========================================
# Frontend / App Configuration
# ==========================================
echo "=========================================="
echo "1. Frontend / App Configuration"
echo "=========================================="
echo ""

default_app_url="$APP_URL"
default_origins="${ALLOWED_ORIGINS:-$default_app_url}"

if [ -z "$default_app_url" ]; then
    echo "⚠️  APP_URL not found in .env file"
    echo "Please set APP_URL in your .env file first"
    exit 1
fi

read -p "Enter your frontend URL [default: $default_app_url]: " app_url
app_url=${app_url:-$default_app_url}

read -p "Enter allowed origins (comma-separated) [default: $default_origins]: " allowed_origins
allowed_origins=${allowed_origins:-$default_origins}

echo ""

# ==========================================
# JWT / Security Configuration
# ==========================================
echo "=========================================="
echo "2. JWT / Security Configuration"
echo "=========================================="
echo ""

echo "Generating secure secrets..."
jwt_secret=$(openssl rand -base64 32)
reset_token_secret=$(openssl rand -base64 32)

echo "✓ JWT_SECRET generated"
echo "✓ RESET_TOKEN_SECRET generated"
echo ""

# ==========================================
# Email Configuration (Resend)
# ==========================================
echo "=========================================="
echo "3. Email Configuration (Resend)"
echo "=========================================="
echo ""

default_resend_from="$RESEND_FROM"

if [ -z "$default_resend_from" ]; then
    echo "⚠️  RESEND_FROM not found in .env file"
    echo "Please set RESEND_FROM in your .env file first"
    exit 1
fi

if [ -n "$RESEND_API_KEY" ]; then
    echo "Found RESEND_API_KEY in .env"
    read -p "Use existing API key from .env? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        resend_api_key="$RESEND_API_KEY"
    else
        echo "Get your API key from: https://resend.com/api-keys"
        read -p "Enter your Resend API key (starts with re_): " resend_api_key
    fi
else
    echo "Get your API key from: https://resend.com/api-keys"
    read -p "Enter your Resend API key (starts with re_): " resend_api_key
fi
echo ""

read -p "Enter the 'From' address [default: $default_resend_from]: " resend_from
resend_from=${resend_from:-$default_resend_from}
echo ""

# ==========================================
# Confirm Settings
# ==========================================
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
echo ""
echo "Frontend:"
echo "  APP_URL: $app_url"
echo "  ALLOWED_ORIGINS: $allowed_origins"
echo ""
echo "Security:"
echo "  JWT_SECRET: [generated]"
echo "  RESET_TOKEN_SECRET: [generated]"
echo ""
echo "Email (Resend):"
echo "  RESEND_API_KEY: ${resend_api_key:0:10}..."
echo "  RESEND_FROM: $resend_from"
echo ""

read -p "Is this correct? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# ==========================================
# Set Railway Variables
# ==========================================
echo ""
echo "Setting Railway environment variables..."
echo ""

# Frontend / App
railway variable set APP_URL="$app_url"
railway variable set ALLOWED_ORIGINS="$allowed_origins"

# Security
railway variable set JWT_SECRET="$jwt_secret"
railway variable set RESET_TOKEN_SECRET="$reset_token_secret"

# Email
railway variable set RESEND_API_KEY="$resend_api_key"
railway variable set RESEND_FROM="$resend_from"

echo ""
echo "✓ All environment variables set successfully!"
echo ""

# ==========================================
# Clean Up Legacy Variables
# ==========================================
echo "=========================================="
echo "Cleaning Up Legacy Variables"
echo "=========================================="
echo ""

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

# ==========================================
# Verify Configuration
# ==========================================
echo "=========================================="
echo "Final Configuration"
echo "=========================================="
echo ""
railway variables | grep -E "APP_URL|ALLOWED_ORIGINS|JWT_SECRET|RESET_TOKEN|RESEND_"
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Railway will automatically redeploy"
echo "2. Test your deployment: railway logs"
echo "3. Test email: ./scripts/railway/test-email.sh"
echo ""
echo "Note: DATABASE_URL is automatically provided by Railway"
echo "when you have a PostgreSQL database attached."
echo ""
