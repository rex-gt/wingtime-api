#!/bin/bash

# Railway Reset All Configuration
# Removes ALL custom environment variables (use with caution!)

echo "=========================================="
echo "AeroBook - Reset ALL Configuration"
echo "=========================================="
echo ""

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    exit 1
fi

echo "⚠️  WARNING: This will delete ALL custom environment variables!"
echo ""
echo "This includes:"
echo "  - App configuration (APP_URL, ALLOWED_ORIGINS)"
echo "  - Security secrets (JWT_SECRET, RESET_TOKEN_SECRET)"
echo "  - Email configuration (RESEND_API_KEY, RESEND_FROM)"
echo "  - Any legacy variables (SMTP_*, DB_*)"
echo ""
echo "Railway system variables (RAILWAY_*, DATABASE_URL) will NOT be affected."
echo ""

read -p "Are you SURE you want to delete everything? (type 'yes' to confirm): " confirm
echo ""
if [[ "$confirm" != "yes" ]]; then
    echo "Reset cancelled."
    exit 0
fi

echo "Removing all custom variables..."
echo ""

# App configuration
yes | railway variable delete APP_URL 2>/dev/null && echo "✓ Deleted APP_URL"
yes | railway variable delete ALLOWED_ORIGINS 2>/dev/null && echo "✓ Deleted ALLOWED_ORIGINS"

# Security
yes | railway variable delete JWT_SECRET 2>/dev/null && echo "✓ Deleted JWT_SECRET"
yes | railway variable delete RESET_TOKEN_SECRET 2>/dev/null && echo "✓ Deleted RESET_TOKEN_SECRET"

# Email (Resend)
yes | railway variable delete RESEND_API_KEY 2>/dev/null && echo "✓ Deleted RESEND_API_KEY"
yes | railway variable delete RESEND_FROM 2>/dev/null && echo "✓ Deleted RESEND_FROM"

# Legacy SMTP
yes | railway variable delete SMTP_HOST 2>/dev/null && echo "✓ Deleted SMTP_HOST"
yes | railway variable delete SMTP_PORT 2>/dev/null && echo "✓ Deleted SMTP_PORT"
yes | railway variable delete SMTP_SECURE 2>/dev/null && echo "✓ Deleted SMTP_SECURE"
yes | railway variable delete SMTP_USER 2>/dev/null && echo "✓ Deleted SMTP_USER"
yes | railway variable delete SMTP_PASS 2>/dev/null && echo "✓ Deleted SMTP_PASS"
yes | railway variable delete SMTP_FROM 2>/dev/null && echo "✓ Deleted SMTP_FROM"

# Legacy DB
yes | railway variable delete DB_HOST 2>/dev/null && echo "✓ Deleted DB_HOST"
yes | railway variable delete DB_PORT 2>/dev/null && echo "✓ Deleted DB_PORT"
yes | railway variable delete DB_USER 2>/dev/null && echo "✓ Deleted DB_USER"
yes | railway variable delete DB_PASSWORD 2>/dev/null && echo "✓ Deleted DB_PASSWORD"
yes | railway variable delete DB_NAME 2>/dev/null && echo "✓ Deleted DB_NAME"

echo ""
echo "✓ All custom configuration removed"
echo ""
echo "Remaining variables (Railway system + database):"
railway variables
echo ""
echo "To set up the environment again, run:"
echo "  ./scripts/railway/setup-full.sh"
echo ""
