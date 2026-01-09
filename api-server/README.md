# SmartIoT API Server

Node.js/Express backend that handles ML temperature predictions and sensor data management.

## Architecture

The API server is separated from the frontend for:
- **Scalability**: ML models run server-side with consistent access to historical data
- **Deployment**: Frontend and backend can be deployed independently
- **Performance**: Predictions cached and computed without client overhead
- **Maintainability**: ML models updated without frontend deployments

## Setup

### Install Dependencies

```bash
cd api-server
npm install
```

### Environment Variables

Create a `.env` file (use `.env.example` as template):

```bash
# Firebase Configuration
FIREBASE_URL=https://smartiot-5602e-default-rtdb.firebaseio.com

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS - Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Run Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The API server runs on `http://localhost:3001` by default.

## API Endpoints

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/sensors`
Returns all sensor readings with computed predictions.

**Query Parameters:**
- `limit` (optional, default: 200): Maximum number of readings to return
- `includePredictions` (optional, default: "true"): Include predictions
- `method` (optional, default: "exponential"): Prediction method ("exponential" or "moving_avg")
- `horizon` (optional, default: 7.5): Prediction horizon in minutes

**Response:**
```json
[
  {
    "temperature": 22.5,
    "predicted_temp": 22.8,
    "humidity": 50.0,
    "motion": 0,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "alerts": []
  }
]
```

### `POST /api/predict`
Computes prediction for latest sensor reading and updates Firebase.

**Request Body:**
```json
{
  "method": "exponential",
  "horizon": 7.5
}
```

**Response:**
```json
{
  "success": true,
  "predicted_temp": 22.8,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/device-health`
Returns device health metrics.

**Response:**
```json
{
  "status": "HEALTHY",
  "uptime": 3600,
  "last_reading": "2024-01-01T00:00:00.000Z"
}
```

### `GET /api/config`
Returns current threshold configuration.

**Response:**
```json
{
  "thresholds": {
    "temp_high": 30.0,
    "temp_low": 18.0,
    "humidity_high": 60.0,
    "humidity_low": 40.0,
    "prediction_deviation": 2.0
  }
}
```

### `PUT /api/config`
Updates threshold configuration.

**Request Body:**
```json
{
  "thresholds": {
    "temp_high": 30.0,
    "temp_low": 18.0,
    "humidity_high": 60.0,
    "humidity_low": 40.0,
    "prediction_deviation": 2.0
  }
}
```

**Response:**
```json
{
  "success": true,
  "thresholds": { ... }
}
```

## Prediction Models

### Exponential Smoothing (Default)
Uses double exponential smoothing to track level and trend. Better for smooth time series with trends.

### Moving Average
Simple moving average with trend extrapolation. Lighter than exponential smoothing, good for comparison.

## Deployment

### Render / Railway / Heroku

1. Set environment variables in platform dashboard
2. Deploy from repository
3. Update frontend `REACT_APP_API_URL` to point to deployed API

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Error Handling

All endpoints return proper HTTP status codes:
- `200`: Success
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

Errors include descriptive messages:
```json
{
  "error": "Failed to fetch sensor data"
}
```

## Performance

- Predictions computed in < 10ms for 200 data points
- Efficient Firebase queries with timeouts
- Caching can be added for frequently accessed data

