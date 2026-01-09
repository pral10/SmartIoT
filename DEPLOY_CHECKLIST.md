# Quick Deployment Checklist

Use this checklist when deploying SmartIoT to production.

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] `.env` files are NOT committed (check `.gitignore`)
- [ ] All services tested locally
- [ ] Firebase URL is correct and accessible

## Step 1: Deploy API Server

- [ ] Choose hosting: Render / Railway / Heroku
- [ ] Create new service/project
- [ ] Connect GitHub repository
- [ ] Set root directory to `api-server`
- [ ] Set build command: `npm install`
- [ ] Set start command: `npm start`
- [ ] Add environment variables:
  - [ ] `FIREBASE_URL` (your Firebase URL)
  - [ ] `PORT` (usually 10000 for Render)
  - [ ] `NODE_ENV=production`
  - [ ] `FRONTEND_URL` (will update after Netlify deploy)
- [ ] Deploy and wait for success
- [ ] Test health endpoint: `https://your-api-url/health`
- [ ] Copy API server URL (needed for next step)

## Step 2: Deploy Frontend to Netlify

- [ ] Go to Netlify dashboard
- [ ] Connect GitHub repository
- [ ] Set build settings:
  - [ ] Base directory: `frontend`
  - [ ] Build command: `npm install && npm run build`
  - [ ] Publish directory: `frontend/build`
- [ ] Add environment variable:
  - [ ] `REACT_APP_API_URL` = your API server URL from Step 1
- [ ] Deploy and wait for success
- [ ] Copy Netlify URL (e.g., `https://your-app.netlify.app`)

## Step 3: Update API Server CORS

- [ ] Go back to API server dashboard
- [ ] Update environment variable:
  - [ ] `FRONTEND_URL` = your Netlify URL from Step 2
- [ ] Redeploy API server (or wait for auto-redeploy)

## Step 4: Verify Everything Works

- [ ] Visit Netlify URL in browser
- [ ] Dashboard loads without errors
- [ ] Check browser console (F12) - no CORS errors
- [ ] Check Network tab - API calls go to your API server
- [ ] Data appears on dashboard (if simulator running or data exists)
- [ ] Predictions are working
- [ ] Charts display correctly

## Common Issues & Fixes

**CORS Error:**
- [ ] Verify `FRONTEND_URL` in API server matches Netlify URL exactly
- [ ] Include `https://` prefix
- [ ] No trailing slash

**No Data:**
- [ ] Check API server is running (visit `/health`)
- [ ] Verify `REACT_APP_API_URL` in Netlify env vars
- [ ] Check browser console for errors
- [ ] Start Python simulator or ensure data exists in Firebase

**Build Fails:**
- [ ] Check build logs in Netlify dashboard
- [ ] Verify all dependencies in `package.json`
- [ ] Check Node.js version compatibility

## Post-Deployment

- [ ] Test all features:
  - [ ] Temperature display
  - [ ] Predictions
  - [ ] Charts
  - [ ] Alerts
  - [ ] Config panel
  - [ ] CSV export
- [ ] Set up custom domain (optional)
- [ ] Configure Firebase security rules
- [ ] Monitor logs for errors

## Quick Commands Reference

```bash
# Test API server locally
curl http://localhost:3001/health

# Build frontend locally
cd frontend && npm run build

# Check what's in .gitignore
cat .gitignore

# Verify no .env files are tracked
git ls-files | grep .env
```

