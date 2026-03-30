#!/bin/bash

# Multi-Environment Variable Viewer
# Displays environment variables for Local, Staging, and Production

echo "=========================================="
echo "AeroBook - Multi-Environment Variables"
echo "=========================================="
echo ""

# Helper function to print a section
print_env_section() {
    local env=$1
    local title=$2
    local source=$3
    
    echo "=========================================="
    echo "🌍 ENVIRONMENT: $title"
    echo "SOURCE: $source"
    echo "=========================================="
    
    if [ "$env" == "local" ]; then
        if [ -f ".env.local" ]; then
            # Filter and mask local secrets
            grep -E "DB_|PORT|APP_URL|ALLOWED_ORIGINS|RESEND_|JWT_|RESET_" .env.local | \
            sed 's/\(SECRET\|KEY\)=\(.\{10\}\).*/\1=\2... (masked)/'
        else
            echo "❌ .env.local not found"
        fi
    else
        # For Railway environments using JSON for reliability
        local vars_json
        vars_json=$(railway variables --environment "$env" --json 2>/dev/null)
        
        if [ $? -eq 0 ] && [ -n "$vars_json" ]; then
            echo "$vars_json" | jq -r 'to_entries | .[] | select(.key | test("APP_URL|ALLOWED_ORIGINS|RESEND_|JWT_SECRET|RESET_TOKEN|DATABASE_URL|RAILWAY_STATIC_URL")) | "\(.key): \(.value)"' | \
            sed 's/\(SECRET\|KEY\|URL\): \(.\{15\}\).*/\1: \2... (masked)/'
        else
            echo "❌ Environment '$env' not found or not accessible on Railway"
            echo "Try running: railway env $env"
        fi
    fi
    echo ""
}

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "⚠️  Railway CLI not installed, only checking local files."
else
    # Check if logged in and linked
    if ! railway whoami &> /dev/null; then
        echo "⚠️  Not logged into Railway, only checking local files."
        CLI_READY=false
    else
        CLI_READY=true
    fi
fi

# 1. Local Environment
print_env_section "local" "LOCAL (Development)" ".env.local"

# 2. Staging Environment
if [ "$CLI_READY" = true ]; then
    print_env_section "staging" "STAGING (Railway)" "Railway API"
else
    echo "Skipping Staging Railway variables (CLI not ready)"
    echo ""
fi

# 3. Production Environment
if [ "$CLI_READY" = true ]; then
    print_env_section "production" "PRODUCTION (Railway)" "Railway API"
else
    echo "Skipping Production Railway variables (CLI not ready)"
    echo ""
fi

echo "=========================================="
echo "Use 'railway env <name>' to switch active CLI environment"
echo "=========================================="
echo ""
