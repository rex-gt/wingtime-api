#!/bin/bash

# Railway Deployment Script
# Deploys current branch to a specific Railway environment

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./scripts/railway/deploy.sh <environment>"
    echo "Example: ./scripts/railway/deploy.sh staging"
    exit 1
fi

echo "=========================================="
echo "AeroBook - Deploying to $ENVIRONMENT"
echo "=========================================="
echo ""

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    echo "Run: railway link"
    exit 1
fi

# Confirmation
echo "You are about to deploy the current branch to the $ENVIRONMENT environment."
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "Deploying to $ENVIRONMENT..."
railway up --environment "$ENVIRONMENT"

echo ""
echo "✓ Deployment process completed for $ENVIRONMENT!"
echo "Check logs with: railway logs --environment $ENVIRONMENT"
echo ""
