# Railway CLI Scripts for AeroBook

Scripts to manage Railway environment variables and deployments from your local CLI.

## Prerequisites

1. **Install Railway CLI:**
   ```bash
   brew install railway
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Link to your project:**
   ```bash
   cd aerobook-api
   railway link
   ```

## Available Scripts

### Setup Scripts
| Script | Description |
|--------|-------------|
| `setup-full.sh` | Complete environment setup (app, secrets, email) - **recommended for new projects** |
| `setup-app.sh` | Configure frontend URL and CORS settings only |
| `setup-email.sh` | Configure Resend email service only |
| `setup-secrets.sh` | Generate JWT and security secrets only |

### Utility Scripts
| Script | Description |
|--------|-------------|
| `view-vars.sh` | View all environment variables organized by category |
| `test-email.sh` | Send a test email to verify configuration |

### Reset Scripts
| Script | Description |
|--------|-------------|
| `reset-email.sh` | Remove Resend email configuration only |
| `reset-all.sh` | Remove ALL custom variables (start fresh) |

## Quick Start

### New Project Setup

```bash
# Make all scripts executable
chmod +x scripts/railway/*.sh

# Run the complete setup (recommended)
./scripts/railway/setup-full.sh
```

This will configure:
- Frontend URL and CORS origins
- JWT and security secrets
- Resend email configuration
- Clean up any legacy variables

### Individual Setup Scripts

```bash
# Configure app/frontend settings only
./scripts/railway/setup-app.sh

# Configure email only
./scripts/railway/setup-email.sh

# Generate new security secrets
./scripts/railway/setup-secrets.sh

# View current configuration
./scripts/railway/view-vars.sh
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_URL` | Frontend application URL | `https://aerobook.app` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://aerobook.app,https://staging.aerobook.app` |
| `JWT_SECRET` | Secret for JWT tokens | Auto-generated |
| `RESET_TOKEN_SECRET` | Secret for password reset tokens | Auto-generated |
| `RESEND_API_KEY` | Resend API key | `re_xxxxxxxxx` |
| `RESEND_FROM` | Email sender address | `AeroBook <noreply@aerobook.app>` |

### Auto-Provided by Railway

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (when DB attached) |
| `RAILWAY_*` | Railway system variables |

## Resend Email Setup

1. **Create a Resend account:** https://resend.com

2. **Get your API key:** https://resend.com/api-keys

3. **Verify your domain:** https://resend.com/domains
   - Add DNS records as instructed
   - Or use `onboarding@resend.dev` for testing (your email only)

4. **Run the setup script:**
   ```bash
   ./scripts/railway/setup-email.sh
   ```

5. **Test email sending:**
   ```bash
   ./scripts/railway/test-email.sh
   ```

## Common Commands

```bash
# View current project
railway status

# View all variables
railway variables

# Set a single variable
railway variables set KEY=value

# Delete a variable
railway variables delete KEY --yes

# View logs
railway logs

# Live log stream
railway logs --follow

# Open Railway dashboard
railway open

# Deploy immediately
railway up

# Run a command with Railway env vars
railway run npm test
```

## Troubleshooting

### "Railway CLI not found"
```bash
brew install railway
```

### "Not logged in"
```bash
railway login
```

### "Not linked to project"
```bash
railway link
```

### Email not sending

1. **Check logs:**
   ```bash
   railway logs | grep -i email
   ```

2. **Verify variables:**
   ```bash
   ./scripts/railway/view-vars.sh
   ```

3. **Test locally with Railway env:**
   ```bash
   railway run node -e "
     const {sendWelcomeEmail} = require('./src/services/emailService');
     sendWelcomeEmail({id:1, first_name:'Test', email:'your@email.com'})
       .then(() => console.log('Sent!'))
       .catch(e => console.error(e));
   "
   ```

### Clean up legacy variables

If you have old SMTP or DB_ variables from a previous configuration:

```bash
./scripts/railway/cleanup-legacy-vars.sh
```

## File Structure

```
scripts/railway/
├── README.md           # This file
├── setup-full.sh       # Complete environment setup
├── setup-app.sh        # Frontend/CORS configuration
├── setup-email.sh      # Resend email configuration
├── setup-secrets.sh    # JWT/security secrets
├── view-vars.sh        # View all variables
├── test-email.sh       # Test email sending
├── reset-email.sh      # Remove email config only
└── reset-all.sh        # Remove ALL custom config
```

## Security Best Practices

1. **Never commit secrets to Git** - Use Railway variables for all secrets

2. **Use different environments** - Create staging/production environments in Railway

3. **Rotate secrets periodically** - Run `setup-secrets.sh` to regenerate

4. **Monitor logs** - Check Railway logs for errors regularly

## Links

- [Railway Documentation](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Resend Documentation](https://resend.com/docs)
