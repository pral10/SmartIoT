# Quick Start Guide

Get SmartIoT up and running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Firebase Realtime Database account (or use the default demo URL)

## Step 1: Setup API Server

```bash
cd api-server
npm install
cp env.example .env
# Edit .env with your Firebase URL (or use default)
npm start
```

API server runs on `http://localhost:3001` by default.

## Step 2: Setup Frontend

```bash
cd frontend
npm install
# Create .env file with: REACT_APP_API_URL=http://localhost:3001
npm start
```

Frontend runs on `http://localhost:3000` by default.

## Step 3: (Optional) Start Python Simulator

```bash
cd backend
pip install -r requirements.txt
python3 simulate.py
```

The simulator generates synthetic sensor data and writes to Firebase.

## Verify Setup

1. Open `http://localhost:3000` in your browser
2. You should see the dashboard with sensor data
3. If no data appears, check:
   - API server is running (visit `http://localhost:3001/health`)
   - Frontend `.env` has correct `REACT_APP_API_URL`
   - Python simulator is running (or data exists in Firebase)

## Troubleshooting

**CORS Errors:**
- Make sure `FRONTEND_URL` in API server `.env` matches frontend URL

**No Data:**
- Check API server logs for errors
- Verify Firebase URL is correct
- Check browser console for API errors

**Predictions Not Working:**
- Ensure API server is running
- Check that historical data exists (minimum 3 readings)
- Verify prediction method/horizon settings in frontend

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for architecture details
- Read [README.md](README.md) for full documentation
- Deploy to production using the deployment guides

