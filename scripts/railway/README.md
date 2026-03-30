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

## Multi-Environment Strategy

AeroBook API uses a 3-tier environment setup:

1. **Local**: Development on your local machine using `.env.local`.
2. **Staging**: Railway environment for testing (`staging` branch).
3. **Production**: Railway environment for live users (`production` branch).

### Configuration Files

Each environment has its own configuration file (gitignored):
- `.env.local`: Local development
- `.env.staging`: Staging configuration
- `.env.production`: Production configuration

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
# Deploy to staging
npm run railway:deploy -- staging

# Deploy to production
npm run railway:deploy -- production
```

## GitHub Actions Automated Deployment

Pushing to specific branches will automatically deploy to the corresponding Railway environment:

- Push to **`staging`** -> Deploys to Railway **staging** environment.
- Push to **`production`** -> Deploys to Railway **production** environment.

**Requirement**: You must add two Railway tokens to your GitHub Repository Secrets. **CRITICAL: When creating tokens, select the `aerobook-api` service.**

1.  **`RAILWAY_TOKEN_STAGING`**: 
    -   In Railway Dashboard -> Settings -> Tokens.
    -   Environment: **staging**
    -   Service: **aerobook-api**
2.  **`RAILWAY_TOKEN_PRODUCTION`**: 
    -   In Railway Dashboard -> Settings -> Tokens.
    -   Environment: **production**
    -   Service: **aerobook-api**

Add these to GitHub: Settings -> Secrets and variables -> Actions -> New repository secret.

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
