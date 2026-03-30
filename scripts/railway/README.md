# Railway CLI Scripts for AeroBook

Scripts to manage Railway environment variables and deployments from your local CLI across multiple environments (local, staging, production).

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

All scripts can be run directly from the project root using `npm`.

### Setup & Deployment Scripts
| Script | Description | NPM Command |
|--------|-------------|-------------|
| `setup-full.sh <env>` | Complete environment setup | `npm run railway:setup -- <env>` |
| `setup-env-vars.sh <env>` | Syncs `.env.<env>` to Railway | `npm run railway:setup-vars -- <env>` |
| `setup-db.sh <env>` | Initializes database schema | `npm run railway:setup-db -- <env>` |
| `deploy.sh <env>` | Deploys current branch to Railway | `npm run railway:deploy -- <env>` |
| `view-vars.sh` | View environment variables | `npm run railway:view-vars` |

### Utility & Reset Scripts
| Script | Description | NPM Command |
|--------|-------------|-------------|
| `test-email.sh` | Send a test email | `npm run railway:test-email` |
| `reset-all.sh` | Remove ALL custom variables | `npm run railway:reset` |

## Quick Start

### 1. Initial Environment Setup

```bash
# Setup Staging
npm run railway:setup -- staging

# Setup Production
npm run railway:setup -- production
```

### 2. Manual Deployment

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
# Switch environment in CLI
railway env staging

# View current project and environment
railway status

# View logs for an environment
railway logs --environment staging

# Live log stream
railway logs --follow --environment production

# Open Railway dashboard
railway open
```

## Troubleshooting

### "Environment file not found"
Ensure you have created the required `.env.staging` or `.env.production` files in the project root. Use `.env.example` as a template.

### CORS Issues
If your frontend cannot connect to the API, verify the `ALLOWED_ORIGINS` in your `.env.<env>` file and run `./scripts/railway/setup-env-vars.sh <env>` again.

- **Staging**: Should include `*.vercel.app` and your preview domain.
- **Production**: Should include your production domain (e.g., `aerobook.app`).

## File Structure

```
scripts/railway/
├── README.md           # This file
├── setup-full.sh       # Multi-environment setup (syncs .env + secrets)
├── setup-env-vars.sh   # Syncs variables from .env.<env> to Railway
├── setup-db.sh         # Initializes database schema and sample data
├── deploy.sh           # Manual deployment script
├── view-vars.sh        # View variables for current env
├── test-email.sh       # Test email sending
└── reset-all.sh        # Remove ALL custom config
```

## Security Best Practices

1. **Never commit `.env.*` files to Git** - They are included in `.gitignore`.
2. **Rotate secrets periodically** - Run `setup-full.sh <env>` again to regenerate JWT secrets.
3. **Use scoped tokens** - When setting up GitHub Actions, use a project-specific Railway token.
