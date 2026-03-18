#!/bin/bash

# Railway Email Test Script
# Tests Resend email configuration using Railway environment

echo "=========================================="
echo "AeroBook - Railway Email Test (Resend)"
echo "=========================================="
echo ""

# Check Railway status
if ! railway status &> /dev/null; then
    echo "❌ Not linked to a Railway project."
    exit 1
fi

echo "Current project:"
railway status
echo ""

# Get test email address
read -p "Enter email address to send test email to: " test_email
echo ""

echo "Testing Resend email configuration..."
echo ""

# Run inline Node.js code with Railway environment
railway run node -e "
const { sendWelcomeEmail } = require('./src/services/emailService');

const testUser = {
  id: 999,
  first_name: 'Test User',
  email: '${test_email}'
};

console.log('Sending test email to:', testUser.email);
console.log('Resend Config:', {
  apiKey: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'NOT SET',
  from: process.env.RESEND_FROM || 'NOT SET'
});

sendWelcomeEmail(testUser)
  .then(() => {
    console.log('✓ Test email sent successfully!');
    console.log('Check ${test_email} inbox (and spam folder)');
  })
  .catch((error) => {
    console.error('❌ Failed to send email:', error.message);
    console.error(error);
    process.exit(1);
  });
"

echo ""
echo "=========================================="
echo "If email didn't send, check logs:"
echo "  railway logs | grep -i email"
echo "=========================================="
echo ""
