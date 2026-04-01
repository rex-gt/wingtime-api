#!/bin/bash

# migration-52.sh
# Migration script for Issue #52: Aircraft Archiving
# Usage: ./scripts/db/migrate-52-aircraft-archive.sh [local|staging|production]

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 [local|staging|production]"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/migrations/52-add-aircraft-archive.sql"

echo "------------------------------------------"
echo "AeroBook Migration: Issue #52"
echo "Target Environment: $ENVIRONMENT"
echo "------------------------------------------"

DB_URL=""

if [ "$ENVIRONMENT" == "local" ]; then
    # For local, try to load from .env if it exists, otherwise assume DATABASE_URL is set
    if [ -f "$PROJECT_ROOT/.env" ]; then
        # Simple .env parsing for DATABASE_URL
        DB_URL=$(grep "^DATABASE_URL=" "$PROJECT_ROOT/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    fi
    
    if [ -z "$DB_URL" ]; then
        DB_URL=$DATABASE_URL
    fi

    if [ -z "$DB_URL" ]; then
        echo "❌ Error: DATABASE_URL not found in .env or environment variables."
        exit 1
    fi
else
    # For Railway staging/production
    echo "Fetching Railway variables for $ENVIRONMENT..."
    
    if ! railway status &> /dev/null; then
        echo "❌ Error: Not linked to a Railway project. Run 'railway link' first."
        exit 1
    fi

    # Fetch variables from the Postgres service
    POSTGRES_VARS=$(railway variables --service Postgres --environment "$ENVIRONMENT" --json)
    
    # Prefer DATABASE_PUBLIC_URL for remote access from local machine
    DB_URL=$(echo "$POSTGRES_VARS" | jq -r '.DATABASE_PUBLIC_URL // .DATABASE_URL')

    if [ -z "$DB_URL" ] || [ "$DB_URL" == "null" ]; then
        echo "❌ Error: Could not retrieve DATABASE_URL for $ENVIRONMENT."
        exit 1
    fi
fi

# Confirmation for production
if [ "$ENVIRONMENT" == "production" ]; then
    echo "⚠️  WARNING: You are about to run a migration on PRODUCTION."
    read -p "Are you sure? (y/n): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

echo "Running migration script..."
psql "$DB_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration successful!"
else
    echo ""
    echo "❌ Migration failed."
    exit 1
fi
