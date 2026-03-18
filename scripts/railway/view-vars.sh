#!/bin/bash

# Railway Variables Viewer
# Displays all environment variables organized by category

echo "=========================================="
echo "AeroBook - Railway Environment Variables"
echo "=========================================="
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed."
    exit 1
fi

# Check if logged in and linked
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    echo "Run: railway link"
    exit 1
fi

echo "Project:"
railway status
echo ""

echo "=========================================="
echo "📧 Email Configuration (Resend)"
echo "=========================================="
railway variables | grep -E "RESEND_" || echo "No Resend variables found"
echo ""

echo "=========================================="
echo "🌐 App / Frontend Configuration"
echo "=========================================="
railway variables | grep -E "APP_URL|ALLOWED_ORIGINS" || echo "No app config found"
echo ""

echo "=========================================="
echo "🔐 Security / JWT Configuration"
echo "=========================================="
railway variables | grep -E "JWT_SECRET|RESET_TOKEN" | sed 's/\(.\{50\}\).*/\1.../' || echo "No JWT variables found"
echo ""

echo "=========================================="
echo "🗄️  Database Configuration"
echo "=========================================="
railway variables | grep -E "DATABASE_URL|POSTGRES" | sed 's/\(.\{60\}\).*/\1.../' || echo "No database variables found"
echo ""

echo "=========================================="
echo "🚂 Railway System Variables"
echo "=========================================="
railway variables | grep -E "RAILWAY_" || echo "No Railway variables found"
echo ""

# Check for legacy variables
legacy=$(railway variables | grep -E "SMTP_|^║ DB_")
if [ -n "$legacy" ]; then
    echo "=========================================="
    echo "⚠️  Legacy Variables (should be removed)"
    echo "=========================================="
    echo "$legacy"
    echo ""
    echo "Run ./scripts/railway/cleanup-legacy-vars.sh to remove these"
    echo ""
fi
