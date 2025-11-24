# LazarFlow Server - Render Deployment Guide

This guide will walk you through deploying the LazarFlow Flask server to Render.

## Prerequisites

- A [Render](https://render.com) account (free tier available)
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
- Google API Key for Gemini Vision API

## Deployment Steps

### 1. Push Your Code to Git

Ensure all your changes are committed and pushed to your repository:

```bash
cd /Users/praneeth/Projects/LazarFlow/server
git add .
git commit -m "Add production configuration for Render"
git push
```

### 2. Create a New Web Service on Render

1. Log in to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your Git repository
4. Select the repository containing your LazarFlow server

### 3. Configure the Web Service

Render will auto-detect the `render.yaml` file, but you can also configure manually:

- **Name**: `lazarflow-server` (or your preferred name)
- **Region**: Choose the closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `server` (if your server is in a subdirectory)
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn --bind 0.0.0.0:$PORT api.app:app --workers 2 --timeout 120`

### 4. Set Environment Variables

In the Render dashboard, add the following environment variables:

| Key | Value | Description |
|-----|-------|-------------|
| `ENVIRONMENT` | `production` | Sets the environment mode |
| `GOOGLE_API_KEY` | `your_actual_api_key` | Your Google Gemini API key |
| `ALLOWED_ORIGINS` | `https://lazar-flow.vercel.app,http://localhost:5173` | Comma-separated list of allowed CORS origins |

> [!IMPORTANT]
> Replace `your_actual_api_key` with your actual Google API key from Google Cloud Console.
> The production frontend URL is: `https://lazar-flow.vercel.app`

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy your application
3. Wait for the deployment to complete (usually 2-5 minutes)
4. Your server will be available at: `https://lazarflow-backend.onrender.com`

### 6. Verify Deployment

Test your deployed server:

```bash
# Health check
curl https://lazarflow-backend.onrender.com/health

# Expected response:
# {"status":"healthy","environment":"production","version":"1.0.0"}
```

## Update Frontend Configuration

Update your frontend to use the production API URL:

```javascript
// In your frontend .env or Vercel environment variables
VITE_API_URL=https://lazarflow-backend.onrender.com
VITE_AI_EXTRACTION_API=https://lazarflow-backend.onrender.com
```

## Monitoring and Logs

- **View Logs**: Go to your service in Render Dashboard → "Logs" tab
- **Metrics**: Monitor CPU, memory usage, and response times in the "Metrics" tab
- **Health Checks**: Render automatically monitors the `/health` endpoint

## Troubleshooting

### Server Won't Start

**Issue**: Build succeeds but server fails to start

**Solutions**:
1. Check logs in Render dashboard for error messages
2. Verify all environment variables are set correctly
3. Ensure `GOOGLE_API_KEY` is valid

### CORS Errors

**Issue**: Frontend can't connect to API due to CORS

**Solutions**:
1. Verify `ALLOWED_ORIGINS` includes your frontend URL
2. Check that the frontend URL matches exactly (including `https://`)
3. Ensure no trailing slashes in the URL

### API Timeout Errors

**Issue**: Image extraction takes too long and times out

**Solutions**:
1. The start command already includes `--timeout 120` (2 minutes)
2. For longer processing, upgrade to a paid Render plan with higher timeouts
3. Consider implementing async processing for large batches

### Cold Starts (Free Tier)

**Issue**: First request after inactivity is slow

**Explanation**: Render's free tier spins down inactive services after 15 minutes

**Solutions**:
1. Upgrade to a paid plan for always-on service
2. Implement a ping service to keep the server warm
3. Inform users that first request may take 30-60 seconds

## Updating Your Deployment

When you push changes to your repository:

1. Render automatically detects the changes
2. Triggers a new build and deployment
3. Zero-downtime deployment (on paid plans)

To manually trigger a deployment:
- Go to your service → Click **"Manual Deploy"** → Select branch

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENVIRONMENT` | No | `development` | Environment mode (`development` or `production`) |
| `GOOGLE_API_KEY` | Yes | - | Google Gemini API key for AI extraction |
| `ALLOWED_ORIGINS` | No | `https://lazar-flow.vercel.app,http://localhost:5173` | Comma-separated CORS origins |
| `PORT` | No | Auto-set by Render | Server port (automatically set by Render) |

## Security Best Practices

✅ **Do:**
- Keep your `.env` file in `.gitignore`
- Use environment variables for all secrets
- Regularly rotate API keys
- Monitor logs for suspicious activity

❌ **Don't:**
- Commit API keys to Git
- Use the same API key for development and production
- Expose internal error details in production

## Cost Considerations

**Free Tier Limits:**
- 750 hours/month of runtime
- Automatic spin-down after 15 minutes of inactivity
- Shared resources

**Paid Plans:**
- Always-on service (no spin-down)
- Better performance
- More memory and CPU
- Starting at $7/month

## Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com/)
- [LazarFlow Issues](https://github.com/yourusername/lazarflow/issues)
