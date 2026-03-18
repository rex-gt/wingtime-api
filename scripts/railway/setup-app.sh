#!/bin/bash

# Railway App Configuration Setup Script
# Sets up frontend URL and CORS configuration
# Reads defaults from .env file

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source .env file if it exists
if [ -f "$PROJECT_ROOT/.env" ]; then
    export $(grep -v '^#' "$PROJECT_ROOT/.env" | grep -v '^\s*$' | xargs)
fi

echo "=========================================="
echo "AeroBook - App Configuration Setup"
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
echo "Frontend / CORS Configuration"
echo "=========================================="
echo ""

# Show current values if they exist
current_app_url=$(railway variables | grep "APP_URL" | awk -F'│' '{print $2}' | xargs)
current_origins=$(railway variables | grep "ALLOWED_ORIGINS" | awk -F'│' '{print $2}' | xargs)

if [ -n "$current_app_url" ]; then
    echo "Current APP_URL: $current_app_url"
fi
if [ -n "$current_origins" ]; then
    echo "Current ALLOWED_ORIGINS: $current_origins"
fi
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

echo ""
echo "ALLOWED_ORIGINS controls which domains can make API requests."
echo "Separate multiple origins with commas (e.g., https://aerobook.app,https://staging.aerobook.app)"
echo ""

read -p "Enter allowed origins [default: $default_origins]: " allowed_origins
allowed_origins=${allowed_origins:-$default_origins}

echo ""
echo "=========================================="
echo "Configuration Summary"
echo "=========================================="
echo "APP_URL: $app_url"
echo "ALLOWED_ORIGINS: $allowed_origins"
echo ""

read -p "Is this correct? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo "Setting Railway environment variables..."
echo ""

railway variable set APP_URL="$app_url"
railway variable set ALLOWED_ORIGINS="$allowed_origins"

echo ""
echo "✓ App configuration set successfully!"
echo ""
echo "Current configuration:"
railway variables | grep -E "APP_URL|ALLOWED_ORIGINS"
echo ""
