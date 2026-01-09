# Deployment Guide

Complete guide for deploying SmartIoT to production.

## Overview

SmartIoT requires **two separate deployments**:
1. **Frontend** → Netlify (or Vercel)
2. **API Server** → Render, Railway, or Heroku

## Part 1: Deploy API Server

### Option A: Render (Recommended - Free tier available)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Render Service:**
   - Go to https://render.com
   - Sign up/login
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service:**
   - **Name**: `smartiot-api` (or any name)
   - **Root Directory**: `api-server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid)

4. **Set Environment Variables:**
   Click "Environment" tab and add:
   ```
   FIREBASE_URL=https://smartiot-5602e-default-rtdb.firebaseio.com
   PORT=10000
   NODE_ENV=production
   FRONTEND_URL=https://your-netlify-app.netlify.app
   ```
   (Replace `FRONTEND_URL` with your Netlify URL after deployment)

5. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Copy the service URL (e.g., `https://smartiot-api.onrender.com`)

### Option B: Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Add service → Select `api-server` folder
5. Set environment variables (same as Render)
6. Deploy

### Option C: Heroku

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login: `heroku login`
3. Create app: `heroku create smartiot-api`
4. Set environment variables:
   ```bash
   heroku config:set FIREBASE_URL=https://smartiot-5602e-default-rtdb.firebaseio.com
   heroku config:set NODE_ENV=production
   heroku config:set FRONTEND_URL=https://your-netlify-app.netlify.app
   ```
5. Deploy:
   ```bash
   cd api-server
   git subtree push --prefix api-server heroku main
   ```

## Part 2: Deploy Frontend to Netlify

### Step 1: Prepare Frontend

1. **Update `.env` for production:**
   Create `frontend/.env.production`:
   ```
   REACT_APP_API_URL=https://your-api-url.onrender.com
   ```
   (Replace with your actual API server URL from Part 1)

2. **Build locally (optional test):**
   ```bash
   cd frontend
   npm run build
   ```
   This creates a `build/` folder with static files.

### Step 2: Deploy to Netlify

**Option A: Netlify CLI (Recommended)**

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login:**
   ```bash
   netlify login
   ```

3. **Deploy:**
   ```bash
   cd frontend
   netlify deploy --prod
   ```
   - First time: Follow prompts to create site
   - Select build directory: `build`
   - Publish directory: `build`

**Option B: Netlify Dashboard (GitHub Integration)**

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify:**
   - Go to https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select your repository

3. **Configure Build Settings:**
   - **Base directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `frontend/build`

4. **Set Environment Variables:**
   - Go to Site settings → Environment variables
   - Add: `REACT_APP_API_URL` = `https://your-api-url.onrender.com`
   - (Use the API server URL from Part 1)

5. **Deploy:**
   - Click "Deploy site"
   - Wait for build to complete (2-3 minutes)

### Step 3: Update API Server CORS

After getting your Netlify URL, update the API server:

1. **Render/Railway:**
   - Go to your service dashboard
   - Update environment variable:
     ```
     FRONTEND_URL=https://your-app-name.netlify.app
     ```
   - Redeploy (or it auto-redeploys)

2. **Heroku:**
   ```bash
   heroku config:set FRONTEND_URL=https://your-app-name.netlify.app
   ```

## Part 3: Verify Deployment

1. **Check API Server:**
   - Visit: `https://your-api-url.onrender.com/health`
   - Should return: `{"status":"ok",...}`

2. **Check Frontend:**
   - Visit: `https://your-app-name.netlify.app`
   - Should show the dashboard

3. **Test Connection:**
   - Open browser console (F12)
   - Check Network tab for API calls
   - Should see requests to your API server URL

## Troubleshooting

### CORS Errors

**Symptom:** Browser console shows CORS errors

**Fix:**
- Verify `FRONTEND_URL` in API server matches your Netlify URL exactly
- Include `https://` in the URL
- No trailing slash

### "No data available"

**Symptom:** Dashboard loads but shows no data

**Fix:**
- Check API server is running (visit `/health` endpoint)
- Verify `REACT_APP_API_URL` in Netlify environment variables
- Check browser console for API errors
- Make sure Python simulator has generated data (or data exists in Firebase)

### Build Failures

**Frontend build fails:**
- Check `package.json` has all dependencies
- Verify Node.js version (Netlify uses Node 18 by default)
- Check build logs in Netlify dashboard

**API server fails:**
- Check environment variables are set
- Verify Firebase URL is correct
- Check logs in Render/Railway/Heroku dashboard

## Continuous Deployment

Once set up, both services auto-deploy on git push:

- **Netlify:** Auto-deploys when you push to main branch
- **Render/Railway:** Auto-deploys when you push to main branch

## Cost Estimate

- **Netlify:** Free (generous free tier)
- **Render:** Free tier available (spins down after inactivity)
- **Railway:** $5/month (or free trial)
- **Heroku:** $7/month (or free tier with limitations)

**Total:** $0-7/month depending on provider

## Security Notes

1. **Firebase Security Rules:**
   - Configure Firebase Realtime Database rules
   - Restrict write access in production
   - Use Firebase Authentication if needed

2. **Environment Variables:**
   - Never commit `.env` files
   - Use platform environment variable settings
   - Rotate secrets regularly

3. **HTTPS:**
   - Both Netlify and API hosts provide HTTPS automatically
   - No additional configuration needed

## Next Steps

- Set up custom domain (optional)
- Configure Firebase security rules
- Set up monitoring/alerting
- Add authentication if needed

