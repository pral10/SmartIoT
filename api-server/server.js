/**
 * SmartIoT API Server
 * 
 * Handles ML temperature predictions and sensor data management.
 * Separated from frontend for scalability and proper deployment.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  fetchSensors, 
  fetchLatestSensor, 
  appendSensorData,
  updateConfig,
  fetchConfig,
  fetchDeviceHealth 
} from './src/firebase.js';
import { 
  predictTemperature,
  computePredictionsForHistory 
} from './src/predictions.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Middleware
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/sensors
 * 
 * Returns all sensor readings with computed predictions.
 * The frontend requests this periodically to display real-time data.
 * 
 * Why predictions run here: ML models need consistent access to historical data,
 * and running predictions server-side avoids sending large datasets to clients.
 */
app.get('/api/sensors', async (req, res) => {
  try {
    const { limit = 200, includePredictions = 'true' } = req.query;
    const limitNum = Math.min(parseInt(limit, 10), 500); // Cap at 500
    
    const sensors = await fetchSensors(limitNum);
    
    // If predictions requested, compute them server-side
    if (includePredictions === 'true' && sensors.length > 0) {
      const sensorsWithPredictions = computePredictionsForHistory(
        sensors,
        req.query.method || 'exponential',
        parseFloat(req.query.horizon || '7.5')
      );
      return res.json(sensorsWithPredictions);
    }
    
    res.json(sensors);
  } catch (error) {
    console.error('Error fetching sensors:', error);
    res.status(500).json({ error: 'Failed to fetch sensor data' });
  }
});

/**
 * POST /api/predict
 * 
 * Computes prediction for the latest sensor reading and updates it in Firebase.
 * Called periodically by the Python simulator or scheduled job.
 * 
 * This endpoint ensures predictions are always up-to-date even if the frontend
 * isn't actively viewing the dashboard.
 */
app.post('/api/predict', async (req, res) => {
  try {
    const { method = 'exponential', horizon = 7.5 } = req.body;
    
    // Fetch latest sensor reading
    const latest = await fetchLatestSensor();
    if (!latest) {
      return res.status(404).json({ error: 'No sensor data available' });
    }
    
    // Fetch historical data for prediction
    const history = await fetchSensors(100);
    
    // Compute prediction
    const predictedTemp = predictTemperature(
      history,
      latest,
      method,
      parseFloat(horizon)
    );
    
    // Update the latest reading with prediction
    const updatedReading = {
      ...latest,
      predicted_temp: predictedTemp,
      predicted_at: new Date().toISOString()
    };
    
    await appendSensorData(updatedReading);
    
    res.json({ 
      success: true,
      predicted_temp: predictedTemp,
      timestamp: updatedReading.timestamp
    });
  } catch (error) {
    console.error('Error computing prediction:', error);
    res.status(500).json({ error: 'Failed to compute prediction' });
  }
});

/**
 * GET /api/device-health
 * 
 * Returns device health metrics. The frontend displays this in the health panel.
 */
app.get('/api/device-health', async (req, res) => {
  try {
    const health = await fetchDeviceHealth();
    res.json(health || {});
  } catch (error) {
    console.error('Error fetching device health:', error);
    res.status(500).json({ error: 'Failed to fetch device health' });
  }
});

/**
 * GET /api/config
 * 
 * Returns current threshold configuration.
 */
app.get('/api/config', async (req, res) => {
  try {
    const config = await fetchConfig();
    res.json(config || { thresholds: {} });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * PUT /api/config
 * 
 * Updates threshold configuration. Only operators/admins should access this.
 * In production, add authentication middleware here.
 */
app.put('/api/config', async (req, res) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({ error: 'Invalid thresholds provided' });
    }
    
    await updateConfig({ thresholds });
    res.json({ success: true, thresholds });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 SmartIoT API Server running on port ${PORT}`);
  console.log(`📊 Frontend URL: ${FRONTEND_URL}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
});

