# AuditEng - Railway Deployment Guide

This guide explains how to deploy AuditEng to Railway.

## Prerequisites

1. Railway account (https://railway.app)
2. PostgreSQL database with pgvector extension
3. Anthropic API key for Claude AI

## Project Structure

```
auditeng/
  apps/
    api/     -> Backend (Hono + Prisma)
    web/     -> Frontend (React + Vite)
```

## Quick Deploy Steps

### 1. Create a New Project on Railway

1. Go to Railway Dashboard
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository

### 2. Add PostgreSQL Database

1. In your project, click "+ New"
2. Select "Database" > "Add PostgreSQL"
3. Enable pgvector extension in the PostgreSQL settings

### 3. Configure API Service

1. Create new service from your repo
2. Set root directory to `apps/api`
3. Add environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection (Railway provides this) | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | Secret for JWT tokens | Generate with `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `sk-ant-api03-...` |
| `API_URL` | Public URL of API service | `https://your-api.railway.app` |
| `WEB_URL` | Public URL of web service | `https://your-web.railway.app` |
| `NODE_ENV` | Environment | `production` |

Optional variables:
- `VOYAGE_API_KEY` - For RAG embeddings
- `REDIS_URL` - For rate limiting (Railway Redis)
- `R2_*` - For Cloudflare R2 storage

### 4. Configure Web Service

1. Create new service from your repo
2. Set root directory to `apps/web`
3. Add environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | API URL for frontend requests | `https://your-api.railway.app` |

### 5. Configure Domains

1. For each service, go to Settings > Networking
2. Generate domain or add custom domain
3. Update `API_URL`, `WEB_URL`, and `VITE_API_URL` with the generated domains

## Railway Configuration Files

Both services use `railway.json` for configuration:

**API (`apps/api/railway.json`):**
- Build: `pnpm install --frozen-lockfile && pnpm db:generate && pnpm build`
- Start: `pnpm db:migrate:deploy && node dist/index.js`
- Health check: `/health`

**Web (`apps/web/railway.json`):**
- Build: `pnpm install --frozen-lockfile && pnpm build`
- Start: `npx serve dist -l $PORT -s`
- Health check: `/`

## Database Migrations

Migrations run automatically on deploy via `pnpm db:migrate:deploy`.

To run migrations manually:
```bash
railway run pnpm db:migrate:deploy
```

## Health Checks

- **API**: `GET /health` returns `{"status": "ok", "timestamp": "..."}`
- **Web**: `GET /` returns the SPA index.html

## Troubleshooting

### Build Failures

1. Check build logs in Railway dashboard
2. Ensure `pnpm-lock.yaml` is committed
3. Verify TypeScript compiles locally: `pnpm build`

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly
2. Check PostgreSQL service is running
3. Ensure pgvector extension is enabled

### CORS Errors

1. Verify `WEB_URL` matches the actual frontend URL
2. Check API allows the origin in `src/index.ts`

### Migration Failures

1. Check database logs for errors
2. Verify pgvector extension is installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

## Environment Variables Summary

### Required for API
- `DATABASE_URL`
- `JWT_SECRET`
- `ANTHROPIC_API_KEY`
- `API_URL`
- `WEB_URL`
- `NODE_ENV=production`

### Required for Web
- `VITE_API_URL`

### Optional
- `VOYAGE_API_KEY` - RAG embeddings
- `REDIS_URL` - Rate limiting
- `R2_*` - Cloud storage
- `STRIPE_*` - Payments

## Local Development

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations (requires DATABASE_URL)
pnpm db:migrate

# Start development servers
pnpm dev
```

## Monitoring

Railway provides built-in:
- Logs for each service
- Metrics (CPU, Memory, Network)
- Deployments history

For production monitoring, consider adding:
- Sentry for error tracking
- Datadog or similar for APM
