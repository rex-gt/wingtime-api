#!/bin/bash

# Railway Environment Variables Setup Script
# Bulk uploads variables from .env.<env> to Railway

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./scripts/railway/setup-env-vars.sh <environment>"
    echo "Example: ./scripts/railway/setup-env-vars.sh staging"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.$ENVIRONMENT"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
fi

echo "=========================================="
echo "AeroBook - Syncing $ENVIRONMENT Variables"
echo "=========================================="
echo ""

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    echo "Run: railway link"
    exit 1
fi

# Switch environment
echo "Switching to environment: $ENVIRONMENT..."
railway env "$ENVIRONMENT"
echo ""

echo "Reading variables from $ENV_FILE..."
echo ""

# Read each line from .env file, skipping comments and empty lines
while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    if [[ $line =~ ^# ]] || [[ -z $line ]]; then
        continue
    fi
    
    # Extract KEY and VALUE
    key=$(echo "$line" | cut -d '=' -f 1)
    value=$(echo "$line" | cut -d '=' -f 2-)
    
    # Trim whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    if [ -n "$key" ] && [ -n "$value" ]; then
        echo "Setting $key..."
        railway variables set --service aerobook-api "$key"="$value"
    fi
done < "$ENV_FILE"

echo ""
echo "✓ Variables synced successfully for $ENVIRONMENT!"
echo ""
