#!/bin/bash

# migrate.sh
# Generic migration runner for AeroBook
# Usage: ./scripts/db/migrate.sh <migration_file_or_id> <environment: local|staging|production>

MIGRATION_INPUT=$1
ENVIRONMENT=$2

if [ -z "$MIGRATION_INPUT" ] || [ -z "$ENVIRONMENT" ]; then
    echo "Usage: $0 <migration_file_or_name> <environment: local|staging|production>"
    echo "Example: $0 14 local"
    echo "Example: $0 scripts/db/migrations/14-maintenance-tracking.sql staging"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"

# Determine actual migration file path
if [ -f "$MIGRATION_INPUT" ]; then
    MIGRATION_FILE="$MIGRATION_INPUT"
elif [ -f "$MIGRATIONS_DIR/$MIGRATION_INPUT" ]; then
    MIGRATION_FILE="$MIGRATIONS_DIR/$MIGRATION_INPUT"
else
    # Try finding by ID prefix (e.g. "14" matches "14-maintenance-tracking.sql")
    MIGRATION_FILE=$(find "$MIGRATIONS_DIR" -name "${MIGRATION_INPUT}*.sql" | head -n 1)
fi

if [ -z "$MIGRATION_FILE" ] || [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: Migration file not found: $MIGRATION_INPUT"
    exit 1
fi

echo "------------------------------------------"
echo "AeroBook Migration Runner"
echo "Migration: $(basename "$MIGRATION_FILE")"
echo "Target Environment: $ENVIRONMENT"
echo "------------------------------------------"

DB_URL=""

if [ "$ENVIRONMENT" == "local" ]; then
    # List of possible env files
    ENV_FILES=(".env" ".env.local" ".env.development")
    
    for FILE in "${ENV_FILES[@]}"; do
        if [ -f "$PROJECT_ROOT/$FILE" ]; then
            # Try single URL first
            DB_URL=$(grep "^DATABASE_URL=" "$PROJECT_ROOT/$FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
            
            # If not found, try individual components
            if [ -z "$DB_URL" ]; then
                USER=$(grep "^DB_USER=" "$PROJECT_ROOT/$FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                PASS=$(grep "^DB_PASSWORD=" "$PROJECT_ROOT/$FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                HOST=$(grep "^DB_HOST=" "$PROJECT_ROOT/$FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                NAME=$(grep "^DB_NAME=" "$PROJECT_ROOT/$FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                PORT=$(grep "^DB_PORT=" "$PROJECT_ROOT/$FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
                
                if [ -n "$USER" ] || [ -n "$HOST" ] || [ -n "$NAME" ]; then
                    USER=${USER:-postgres}
                    PASS=${PASS:-password}
                    HOST=${HOST:-localhost}
                    NAME=${NAME:-flying_club}
                    PORT=${PORT:-5432}
                    DB_URL="postgresql://$USER:$PASS@$HOST:$PORT/$NAME"
                    echo "✓ Constructed connection from components in $FILE"
                fi
            else
                echo "✓ Loaded DATABASE_URL from $FILE"
            fi
            
            if [ -n "$DB_URL" ]; then break; fi
        fi
    done
    
    if [ -z "$DB_URL" ]; then
        # Last resort: check if DATABASE_URL is already in environment
        DB_URL=$DATABASE_URL
    fi

    if [ -z "$DB_URL" ]; then
        echo "❌ Error: Database configuration not found in env files or environment variables."
        exit 1
    fi
else
    # Railway staging/production
    # Try loading from local .env files first (for efficiency if user already fetched them)
    ENV_FILE=".env.$ENVIRONMENT"
    if [ -f "$PROJECT_ROOT/$ENV_FILE" ]; then
        DB_URL=$(grep "^DATABASE_PUBLIC_URL=" "$PROJECT_ROOT/$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -n "$DB_URL" ]; then
            echo "✓ Loaded connection from $ENV_FILE"
        fi
    fi

    # Fallback to Railway CLI if not in env file
    if [ -z "$DB_URL" ]; then
        echo "Fetching Railway variables for $ENVIRONMENT..."
        if ! railway status &> /dev/null; then
            echo "❌ Error: Not linked to a Railway project."
            exit 1
        fi
        POSTGRES_VARS=$(railway variables --service Postgres --environment "$ENVIRONMENT" --json)
        DB_URL=$(echo "$POSTGRES_VARS" | jq -r '.DATABASE_PUBLIC_URL // .DATABASE_URL')
    fi

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
