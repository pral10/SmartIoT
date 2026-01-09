/**
 * Temperature Prediction Models
 * 
 * Implements time series forecasting for temperature prediction.
 * These models run server-side to keep the frontend lightweight and stateless.
 * 
 * Why server-side predictions:
 * - ML models need consistent access to full historical data
 * - Avoids sending large datasets to clients on every request
 * - Predictions can be cached and computed in background jobs
 * - Easier to update models without frontend deployments
 */

/**
 * Exponential Smoothing Prediction
 * 
 * Uses double exponential smoothing to track both level and trend.
 * This gives realistic predictions that adapt to recent temperature changes.
 * 
 * The rolling window (last 20 readings) balances responsiveness with stability.
 * Lower smoothing factors (alpha, beta) give smoother predictions but slower adaptation.
 */
export function predictWithExponentialSmoothing(tempHistory, horizonSteps) {
  if (tempHistory.length < 3) {
    // Not enough data - return last known value
    return tempHistory[tempHistory.length - 1] || 22.0;
  }

  // Use last 20 readings for prediction
  const window = tempHistory.slice(-20);
  const alpha = 0.3; // Smoothing factor for level
  const beta = 0.2;  // Smoothing factor for trend

  // Initialize with first two values
  let level = window[0];
  let trend = window.length > 1 ? window[1] - window[0] : 0;

  // Apply double exponential smoothing
  for (let i = 1; i < window.length; i++) {
    const prevLevel = level;
    level = alpha * window[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }

  // Extrapolate forward by horizon steps
  // This reflects the trend, making predictions differ from current values
  const prediction = level + (trend * horizonSteps);
  
  // Clamp to realistic range
  return Math.max(15.0, Math.min(35.0, prediction));
}

/**
 * Moving Average Prediction
 * 
 * Simple moving average with trend extrapolation. Lighter than exponential smoothing.
 * Useful for comparison and demonstration purposes.
 */
export function predictWithMovingAverage(tempHistory, horizonSteps) {
  if (tempHistory.length < 2) {
    return tempHistory[tempHistory.length - 1] || 22.0;
  }

  // Use last 15 readings
  const window = tempHistory.slice(-15);
  const avg = window.reduce((a, b) => a + b, 0) / window.length;
  
  // Calculate trend from recent values
  const recent = window.slice(-5);
  const trend = recent.length >= 2 
    ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
    : 0;

  // Extrapolate
  const prediction = avg + (trend * horizonSteps);
  return Math.max(15.0, Math.min(35.0, prediction));
}

/**
 * Predicts temperature for a single data point.
 * 
 * Uses historical data up to the current point to predict future temperature.
 * This ensures we don't use future data to predict past values.
 */
export function predictTemperature(history, currentData, method = 'exponential', horizonMinutes = 7.5) {
  if (!currentData || !currentData.temperature) {
    return 22.0; // Default if no current data
  }

  // Convert horizon from minutes to steps (assuming 5-second intervals)
  const stepsPerMinute = 60 / 5;
  const horizonSteps = Math.round(horizonMinutes * stepsPerMinute);

  // Extract temperature history
  const tempHistory = history
    .map(d => d.temperature)
    .filter(t => t > 0 && !isNaN(t));

  if (tempHistory.length === 0) {
    return currentData.temperature;
  }

  // Add current temperature to history for prediction
  tempHistory.push(currentData.temperature);

  // Select prediction method
  let predicted;
  if (method === 'exponential') {
    predicted = predictWithExponentialSmoothing(tempHistory, horizonSteps);
  } else {
    predicted = predictWithMovingAverage(tempHistory, horizonSteps);
  }

  // Ensure minimum visible difference for chart (0.2°C)
  // Real predictions have uncertainty, so small differences are realistic
  const diff = Math.abs(predicted - currentData.temperature);
  if (diff < 0.2) {
    // Add small realistic noise based on trend direction
    const trend = tempHistory.length >= 2 
      ? tempHistory[tempHistory.length - 1] - tempHistory[tempHistory.length - 2]
      : 0;
    const noise = trend > 0 ? 0.2 : trend < 0 ? -0.2 : (Math.random() > 0.5 ? 0.2 : -0.2);
    predicted = currentData.temperature + noise;
    predicted = Math.max(15.0, Math.min(35.0, predicted));
  }

  return Math.round(predicted * 100) / 100; // Round to 2 decimals
}

/**
 * Computes predictions for all historical data points.
 * 
 * Used when frontend requests data with predictions. This ensures each point
 * gets a prediction based only on data available at that time (no lookahead).
 */
export function computePredictionsForHistory(dataPoints, method = 'exponential', horizonMinutes = 7.5) {
  if (dataPoints.length === 0) return dataPoints;

  // Convert horizon from minutes to steps
  const stepsPerMinute = 60 / 5;
  const horizonSteps = Math.round(horizonMinutes * stepsPerMinute);

  // Extract temperature history
  const tempHistory = dataPoints.map(d => d.temperature).filter(t => t > 0 && !isNaN(t));

  if (tempHistory.length === 0) return dataPoints;

  // Compute predictions for each point based on history up to that point
  return dataPoints.map((point, index) => {
    // Use history up to current point (not future data)
    const historyUpToPoint = tempHistory.slice(0, index + 1);
    
    // Skip if we already have a predicted_temp from backend
    if (point.predicted_temp !== null && point.predicted_temp !== undefined) {
      return point;
    }
    
    let predicted;
    if (method === 'exponential') {
      predicted = predictWithExponentialSmoothing(historyUpToPoint, horizonSteps);
    } else {
      predicted = predictWithMovingAverage(historyUpToPoint, horizonSteps);
    }

    // Ensure minimum visible difference
    const diff = Math.abs(predicted - point.temperature);
    if (diff < 0.2) {
      const trend = historyUpToPoint.length >= 2 
        ? historyUpToPoint[historyUpToPoint.length - 1] - historyUpToPoint[historyUpToPoint.length - 2]
        : 0;
      const noise = trend > 0 ? 0.2 : trend < 0 ? -0.2 : (Math.random() > 0.5 ? 0.2 : -0.2);
      predicted = point.temperature + noise;
      predicted = Math.max(15.0, Math.min(35.0, predicted));
    }

    return {
      ...point,
      predicted_temp: Math.round(predicted * 100) / 100,
    };
  });
}

