# Cloudflare Worker Deployment Guide

## 📋 Prerequisites

1. **Cloudflare Account**: Free tier is sufficient
2. **Node.js**: Version 18 or higher
3. **Wrangler CLI**: Cloudflare's deployment tool

## 🚀 Step-by-Step Deployment

### 1. Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Or use with npx (recommended)
npx wrangler --version
```

### 2. Authenticate with Cloudflare

```bash
# Login to your Cloudflare account
npx wrangler auth login
```

This will open a browser window to authenticate with your Cloudflare account.

### 3. Create R2 Bucket

```bash
# Create R2 bucket for development
npx wrangler r2 bucket create ignite-pdfs-dev

# Create R2 bucket for production (optional)
npx wrangler r2 bucket create ignite-pdfs-prod
```

### 4. Set Environment Variables

You need to set the `WORKER_SECRET` environment variable in your Cloudflare Worker:

```bash
# Set worker secret (use the same value as JWT_SECRET from your backend)
npx wrangler secret put WORKER_SECRET

# When prompted, enter your JWT secret value
```

### 5. Deploy the Worker

```bash
# Navigate to backend directory
cd backend

# Deploy to development environment
npx wrangler deploy --env development

# Deploy to production environment
npx wrangler deploy --env production
```

### 6. Get Worker URL

After deployment, Wrangler will show you the worker URL:
```
Published ignite-pdf-worker (ENVIRONMENT)
  https://ignite-pdf-worker.your-subdomain.workers.dev
```

### 7. Update Backend Configuration

Copy the worker URL and update your backend `.env` file:

```env
CLOUDFLARE_WORKER_URL=https://ignite-pdf-worker.your-subdomain.workers.dev
CLOUDFLARE_WORKER_SECRET=your-jwt-secret-same-as-backend
```

## 🔧 Configuration Files

### `wrangler.toml`
Main configuration file for the worker. Already created in your backend directory.

### Environment Variables in Worker
- `WORKER_SECRET`: Authentication secret (set via `wrangler secret put`)
- `CLIENT_URL`: Your client app URL (set in wrangler.toml)
- `ADMIN_URL`: Your admin app URL (set in wrangler.toml)
- `ENVIRONMENT`: 'development' or 'production'

### R2 Bucket Binding
- Development: `ignite-pdfs-dev`
- Production: `ignite-pdfs-prod`

## 🧪 Testing the Worker

### Test Health Endpoint
```bash
curl "https://your-worker.workers.dev/health"
```

### Test with Authentication
```bash
# You'll need to use your backend API to get properly signed requests
# The worker requires HMAC authentication for upload/delete operations
```

## 📊 Monitoring

### View Worker Logs
```bash
# Real-time logs
npx wrangler tail

# Production logs
npx wrangler tail --env production
```

### Worker Metrics
- Visit Cloudflare Dashboard > Workers & Pages > Your Worker
- View analytics, logs, and performance metrics

## 🔄 Updating the Worker

When you make changes to `cloudflare-worker.js`:

```bash
# Deploy updated version
npx wrangler deploy --env development

# For production
npx wrangler deploy --env production
```

## 🛡️ Security Configuration

### CORS Settings
The worker is configured to allow requests from:
- `CLIENT_URL`: Your React client app
- `ADMIN_URL`: Your React admin app

### Authentication
- All endpoints except `/view` require HMAC authentication
- `/view` endpoint uses token-based authentication with expiry
- Timestamp validation prevents replay attacks

## ❗ Important Notes

1. **Free Tier Limits**:
   - 100,000 requests/day
   - 10ms CPU time per request
   - 128MB memory

2. **R2 Free Tier**:
   - 10GB storage
   - 1 million Class A operations/month
   - 10 million Class B operations/month

3. **Domain Setup**: 
   - Workers get a `*.workers.dev` subdomain by default
   - You can add custom domains in Cloudflare Dashboard

4. **Environment Secrets**:
   - Never commit secrets to code
   - Use `wrangler secret put` for sensitive values

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Errors**:
   - Ensure `WORKER_SECRET` is set correctly
   - Check that backend and worker use the same secret

2. **CORS Errors**:
   - Verify `CLIENT_URL` and `ADMIN_URL` in wrangler.toml
   - Check browser developer tools for specific CORS issues

3. **R2 Bucket Errors**:
   - Ensure bucket exists: `npx wrangler r2 bucket list`
   - Check bucket binding in wrangler.toml

4. **Deployment Failures**:
   - Run `npx wrangler auth whoami` to check authentication
   - Ensure you have necessary permissions in Cloudflare account

### Debug Commands

```bash
# Check worker status
npx wrangler list

# View worker details
npx wrangler show

# Check R2 buckets
npx wrangler r2 bucket list

# Local development (test worker locally)
npx wrangler dev
```

## 📖 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [R2 Storage Documentation](https://developers.cloudflare.com/r2/)

---

Your worker will handle all R2 operations for the free Cloudflare plan, providing secure PDF storage and access for your Ignite platform!
