#!/bin/bash

# Railway Email Configuration Setup Script
# Sets up Resend environment variables on Railway
# Reads defaults from .env file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^\s*$' | xargs)
fi

echo "=========================================="
echo "AeroBook - Railway Email Setup (Resend)"
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

# Prompt for Resend configuration
echo "=========================================="
echo "Resend Configuration"
echo "=========================================="
echo ""
echo "You'll need:"
echo "1. A Resend API key (from https://resend.com/api-keys)"
echo "2. A verified 'From' address or domain"
echo ""

# Get Resend configuration
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
        read -p "Enter your Resend API key (starts with re_): " resend_api_key
    fi
else
    read -p "Enter your Resend API key (starts with re_): " resend_api_key
fi
echo ""

read -p "Enter the 'From' address [default: $default_resend_from]: " resend_from
resend_from=${resend_from:-$default_resend_from}
echo ""

# Confirm settings
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
echo "RESEND_API_KEY: ${resend_api_key:0:10}..."
echo "RESEND_FROM: $resend_from"
echo ""

read -p "Is this correct? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

# Set Railway variables
echo ""
echo "Setting Railway environment variables..."
echo ""

railway variable set RESEND_API_KEY="$resend_api_key"
railway variable set RESEND_FROM="$resend_from"

echo ""
echo "✓ Environment variables set successfully!"
echo ""

# Verify variables
echo "=========================================="
echo "Verifying Variables"
echo "=========================================="
echo ""
railway variables | grep -E "RESEND_"
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Railway will automatically redeploy with new variables"
echo "2. Check deployment: railway logs"
echo "3. Test email: ./scripts/railway/test-email.sh"
echo ""
