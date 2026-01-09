/**
 * Firebase Integration
 * 
 * Handles all Firebase Realtime Database operations.
 * Keeps the frontend stateless by handling all data persistence here.
 */

import axios from 'axios';

const FIREBASE_URL = process.env.FIREBASE_URL || 'https://smartiot-5602e-default-rtdb.firebaseio.com';
const SENSORS_ENDPOINT = `${FIREBASE_URL}/sensors.json`;
const CONFIG_ENDPOINT = `${FIREBASE_URL}/config.json`;
const DEVICE_HEALTH_ENDPOINT = `${FIREBASE_URL}/device_health.json`;

/**
 * Fetches sensor readings from Firebase.
 * Returns them sorted by timestamp, most recent first.
 */
export async function fetchSensors(limit = 200) {
  try {
    const response = await axios.get(SENSORS_ENDPOINT, { timeout: 10000 });
    if (!response.data) return [];
    
    // Convert object to array and normalize
    const sensors = Object.values(response.data)
      .map(item => ({
        temperature: Number(item.temperature) || 0,
        predicted_temp: Number(item.predicted_temp) || null,
        humidity: Number(item.humidity) || 0,
        motion: Number(item.motion) || 0,
        timestamp: item.timestamp || new Date().toISOString(),
        alerts: item.alerts || []
      }))
      .filter(item => item.temperature > 0) // Filter invalid readings
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Newest first
      .slice(0, limit);
    
    // Reverse to chronological order (oldest first) for time series
    return sensors.reverse();
  } catch (error) {
    console.error('Error fetching sensors:', error.message);
    return [];
  }
}

/**
 * Fetches the most recent sensor reading.
 */
export async function fetchLatestSensor() {
  try {
    const sensors = await fetchSensors(1);
    return sensors.length > 0 ? sensors[sensors.length - 1] : null;
  } catch (error) {
    console.error('Error fetching latest sensor:', error.message);
    return null;
  }
}

/**
 * Appends a new sensor reading to Firebase.
 * Uses POST to ensure we append rather than overwrite.
 */
export async function appendSensorData(data) {
  try {
    const response = await axios.post(SENSORS_ENDPOINT, data, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error('Error appending sensor data:', error.message);
    throw error;
  }
}

/**
 * Fetches configuration from Firebase.
 */
export async function fetchConfig() {
  try {
    const response = await axios.get(CONFIG_ENDPOINT, { timeout: 5000 });
    return response.data || { thresholds: {} };
  } catch (error) {
    console.error('Error fetching config:', error.message);
    return { thresholds: {} };
  }
}

/**
 * Updates configuration in Firebase.
 */
export async function updateConfig(config) {
  try {
    await axios.put(CONFIG_ENDPOINT, config, { timeout: 5000 });
    return true;
  } catch (error) {
    console.error('Error updating config:', error.message);
    throw error;
  }
}

/**
 * Fetches device health metrics from Firebase.
 */
export async function fetchDeviceHealth() {
  try {
    const response = await axios.get(DEVICE_HEALTH_ENDPOINT, { timeout: 5000 });
    if (!response.data) return null;
    
    // Handle both object and array responses
    const health = Array.isArray(response.data) 
      ? response.data[0] 
      : Object.values(response.data)[0] || response.data;
    
    return health;
  } catch (error) {
    console.error('Error fetching device health:', error.message);
    return null;
  }
}

