# SmartIoT Architecture

Clean frontend-backend separation for production deployment.

## Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Frontend  │────────▶│  API Server  │────────▶│   Firebase  │
│   (React)   │◀────────│  (Node.js)   │◀────────│  Realtime   │
│             │         │              │         │   Database  │
└─────────────┘         └──────────────┘         └─────────────┘
                             ▲
                             │
                             ▼
                        ┌─────────────┐
                        │   Python    │
                        │  Simulator  │
                        │  (Optional) │
                        └─────────────┘
```

## Component Responsibilities

### Frontend (React)
**Purpose**: Display data and handle user interactions

**Responsibilities:**
- Render dashboard UI (charts, metrics, alerts)
- Poll API server for latest data
- Handle user input (config updates, filters)
- Display data in user's timezone
- Export data to CSV

**What it does NOT do:**
- ❌ Compute ML predictions
- ❌ Directly access Firebase
- ❌ Store application state persistently
- ❌ Handle business logic

**Why stateless:**
- Keeps React app lightweight and fast
- Predictions run consistently on backend with full data access
- Easier to update ML models without frontend deployments
- Better separation of concerns for production

### API Server (Node.js/Express)
**Purpose**: Handle ML predictions and data management

**Responsibilities:**
- Compute temperature predictions using time series models
- Manage sensor data in Firebase
- Handle configuration updates
- Provide RESTful API for frontend
- Cache predictions and optimize queries

**Why predictions run here:**
- ML models need consistent access to full historical data
- Avoids sending large datasets to clients on every request
- Predictions can be cached and computed in background jobs
- Easier to update models without frontend deployments

### Firebase Realtime Database
**Purpose**: Persistent data storage

**Stores:**
- Sensor readings (temperature, humidity, motion)
- Predicted temperatures
- Configuration (thresholds)
- Device health metrics

### Python Simulator (Optional)
**Purpose**: Generate synthetic sensor data for development/demo

**Responsibilities:**
- Simulate temperature, humidity, and motion sensors
- Send data to Firebase (can also call API server)
- Runs independently

## Data Flow

### Reading Sensor Data
1. Frontend polls `GET /api/sensors` every 5 seconds
2. API server fetches data from Firebase
3. API server computes predictions for historical data
4. API server returns data with predictions to frontend
5. Frontend renders charts and metrics

### Updating Configuration
1. User updates thresholds in frontend
2. Frontend sends `PUT /api/config` to API server
3. API server validates and updates Firebase
4. API server returns success
5. Frontend refreshes to show updated config

### Generating Predictions
1. Python simulator generates new sensor reading
2. Simulator can call `POST /api/predict` to compute prediction
3. API server computes prediction using historical data
4. API server updates Firebase with predicted temperature
5. Next frontend poll includes new prediction

## Deployment

### Frontend Deployment (Vercel/Netlify)
- Build: `npm run build`
- Output: `build/` folder
- Environment: Set `REACT_APP_API_URL` to API server URL
- Static hosting, CDN-backed

### API Server Deployment (Render/Railway/Heroku)
- Build: `npm install`
- Start: `npm start`
- Environment: Set Firebase URL, PORT, CORS origin
- Process manager (PM2) recommended for production

### Firebase
- Configure security rules
- Set up authentication if needed
- Monitor usage and costs

## Environment Variables

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001
```

### API Server (.env)
```
FIREBASE_URL=https://smartiot-5602e-default-rtdb.firebaseio.com
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

## Benefits of This Architecture

1. **Scalability**: Backend can scale independently
2. **Maintainability**: Clear separation of concerns
3. **Performance**: Predictions cached and optimized server-side
4. **Security**: Firebase credentials only on backend
5. **Flexibility**: Easy to swap frontend or backend implementations
6. **Deployment**: Independent deployment pipelines

