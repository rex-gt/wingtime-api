#!/bin/bash

# Railway Email Configuration Reset
# Removes Resend email configuration from Railway

echo "=========================================="
echo "AeroBook - Reset Email Configuration"
echo "=========================================="
echo ""

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    exit 1
fi

echo "Current email configuration:"
railway variables | grep -E "RESEND_" || echo "No Resend variables found"
echo ""

read -p "Delete email configuration? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Reset cancelled."
    exit 0
fi

echo ""
echo "Removing Resend variables..."
echo ""

yes | railway variable delete RESEND_API_KEY 2>/dev/null && echo "✓ Deleted RESEND_API_KEY"
yes | railway variable delete RESEND_FROM 2>/dev/null && echo "✓ Deleted RESEND_FROM"

echo ""
echo "✓ Email configuration removed"
echo ""
echo "To reconfigure email, run:"
echo "  ./scripts/railway/setup-email.sh"
echo ""
