#!/bin/bash

# Railway Database Setup Script
# Initializes database schema and optionally adds sample data

ENVIRONMENT=$1
INCLUDE_SAMPLE=$2

if [ -z "$ENVIRONMENT" ]; then
    echo "=========================================="
    echo "AeroBook - Database Setup"
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

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    echo "Run: railway link"
    exit 1
fi

echo "=========================================="
echo "AeroBook - DB Setup for $ENVIRONMENT"
echo "=========================================="
echo ""

# Safety confirmation for production
if [ "$ENVIRONMENT" == "production" ]; then
    echo "⚠️  WARNING: You are about to run schema setup on PRODUCTION."
    echo "This may overwrite existing tables if they exist!"
    read -p "Are you absolutely sure? (type 'PRODUCTION' to confirm): " confirm
    if [ "$confirm" != "PRODUCTION" ]; then
        echo "Aborted."
        exit 1
    fi
fi

# Ask about sample data if not provided as argument
if [ -z "$INCLUDE_SAMPLE" ]; then
    read -p "Include sample data? (y/n): " include_sample_choice
    if [[ $include_sample_choice =~ ^[Yy]$ ]]; then
        INCLUDE_SAMPLE="true"
    else
        INCLUDE_SAMPLE="false"
    fi
fi

echo ""
echo "Fetching database connection string for $ENVIRONMENT..."

# Get variables from Postgres service
POSTGRES_VARS=$(railway variables --service Postgres --environment "$ENVIRONMENT" --json)

# Prefer DATABASE_PUBLIC_URL for local connections to Railway
DB_URL=$(echo "$POSTGRES_VARS" | jq -r '.DATABASE_PUBLIC_URL // .DATABASE_URL')

if [ -z "$DB_URL" ] || [ "$DB_URL" == "null" ]; then
    echo "❌ Could not find a valid database URL for environment $ENVIRONMENT."
    echo "Please ensure the Postgres service has Public Networking enabled."
    exit 1
fi

echo "✓ Connection string retrieved."
echo ""

# 1. Run Schema Setup
echo "------------------------------------------"
echo "1. Running Schema Setup (db/schema.sql)"
echo "------------------------------------------"
psql "$DB_URL" -f "$PROJECT_ROOT/db/schema.sql"

if [ $? -ne 0 ]; then
    echo "❌ Schema setup failed."
    exit 1
fi
echo "✓ Schema initialized."
echo ""

# 2. Run Sample Data (Optional)
if [ "$INCLUDE_SAMPLE" == "true" ]; then
    echo "------------------------------------------"
    echo "2. Adding Sample Data (db/sample-data.sql)"
    echo "------------------------------------------"
    psql "$DB_URL" -f "$PROJECT_ROOT/db/sample-data.sql"
    
    if [ $? -ne 0 ]; then
        echo "❌ Sample data insertion failed."
        exit 1
    fi
    echo "✓ Sample data added."
    echo ""
fi

echo "=========================================="
echo "Database Setup Complete for $ENVIRONMENT!"
echo "=========================================="
echo ""
