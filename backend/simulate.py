"""
SmartIoT Sensor Simulation & ML Prediction Backend with Smart Alerts

Features:
- Smooth, realistic sensor data (temperature, humidity, motion)
- Rolling window ML prediction for temperature (5-10 min ahead)
- Smart alerts (motion, high/low temp, prediction deviation)
- Avoids repetitive alert spam
- Appends all data to Firebase with timestamp
"""

import random
import time
import requests
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import datetime

# ---------------- CONFIGURATION ----------------
const FIREBASE_URL = process.env.REACT_APP_FIREBASE_URL;
SAMPLE_INTERVAL_SECONDS = 5
PREDICTION_HORIZON_STEPS = 90  # 7.5 min
ROLLING_WINDOW_SIZE = 100
MIN_SAMPLES_FOR_PREDICTION = 10

# Alert thresholds
TEMP_ALERT_HIGH = 30.0  # °C
TEMP_ALERT_LOW = 18.0   # °C
DEVIATION_THRESHOLD = 2.0  # °C

# Initial sensor state
last_temp = 25.0
last_humidity = 50.0
motion_state = 0
motion_cooldown = 0

# Last alert states to avoid repetition
last_motion_alert = False
last_temp_alert = None  # "high", "low", or None
last_deviation_alert = False

# ---------------- SENSOR DATA GENERATOR ----------------
def generate_sensor_data():
    global last_temp, last_humidity, motion_state, motion_cooldown

    # Temperature (gradual change)
    temp = last_temp + random.uniform(-0.3, 0.3)
    temp = max(15.0, min(32.0, temp))
    temp = round(temp, 2)

    # Humidity (slightly correlated)
    humidity = last_humidity + random.uniform(-0.5, 0.5)
    humidity = max(35.0, min(65.0, humidity))
    humidity = round(humidity, 2)

    # Motion (bursty but not spammy)
    if motion_cooldown > 0:
        motion_state = 1
        motion_cooldown -= 1
    elif random.random() < 0.05:  # less frequent
        motion_state = 1
        motion_cooldown = random.randint(2, 4)
    else:
        motion_state = 0

    # Timestamp
    timestamp = datetime.utcnow().isoformat()

    # Update persistent state
    last_temp = temp
    last_humidity = humidity

    return {
        "temperature": temp,
        "humidity": humidity,
        "motion": motion_state,
        "timestamp": timestamp
    }

# ---------------- FETCH HISTORICAL DATA ----------------
def fetch_historical_data():
    try:
        response = requests.get(FIREBASE_URL, timeout=5)
        response.raise_for_status()
        data = response.json()
        if not data:
            return pd.DataFrame()
        df = pd.DataFrame(list(data.values()))
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp').reset_index(drop=True)
        return df
    except Exception as e:
        print(f"Warning: Could not fetch historical data: {e}")
        return pd.DataFrame()

# ---------------- PREDICT TEMPERATURE ----------------
def predict_future_temperature(df, current_data):
    if df.empty or len(df) < MIN_SAMPLES_FOR_PREDICTION:
        return current_data["temperature"]

    window_df = df.tail(ROLLING_WINDOW_SIZE).copy()
    window_df['temp_next'] = window_df['temperature'].shift(-1)
    window_df = window_df.dropna()
    if len(window_df) < MIN_SAMPLES_FOR_PREDICTION:
        return current_data["temperature"]

    X = window_df[['temperature', 'humidity', 'motion']].values
    y = window_df['temp_next'].values
    model = LinearRegression()
    model.fit(X, y)

    predicted_temp = current_data["temperature"]
    predicted_humidity = current_data["humidity"]
    predicted_motion = current_data["motion"]

    for _ in range(PREDICTION_HORIZON_STEPS):
        features = np.array([[predicted_temp, predicted_humidity, predicted_motion]])
        predicted_temp = model.predict(features)[0]
        predicted_temp = predicted_temp * 0.99 + current_data["temperature"] * 0.01

    return round(predicted_temp, 2)

# ---------------- ALERT HANDLER ----------------
def check_alerts(current_data):
    global last_motion_alert, last_temp_alert, last_deviation_alert
    alerts = []

    deviation = abs(current_data["predicted_temp"] - current_data["temperature"])

    # Deviation alert
    if deviation >= DEVIATION_THRESHOLD and not last_deviation_alert:
        alerts.append(f"⚠️ Predicted deviation high: {current_data['predicted_temp']}°C")
        last_deviation_alert = True
    elif deviation < DEVIATION_THRESHOLD:
        last_deviation_alert = False

    # Motion alert
    if current_data["motion"] and not last_motion_alert:
        alerts.append("🔴 Motion detected!")
        last_motion_alert = True
    elif not current_data["motion"]:
        last_motion_alert = False

    # High/Low temperature alerts
    if current_data["temperature"] >= TEMP_ALERT_HIGH and last_temp_alert != "high":
        alerts.append(f"🔥 High temperature: {current_data['temperature']}°C")
        last_temp_alert = "high"
    elif current_data["temperature"] <= TEMP_ALERT_LOW and last_temp_alert != "low":
        alerts.append(f"❄️ Low temperature: {current_data['temperature']}°C")
        last_temp_alert = "low"
    elif TEMP_ALERT_LOW < current_data["temperature"] < TEMP_ALERT_HIGH:
        last_temp_alert = None

    return alerts

# ---------------- FIREBASE APPEND ----------------
def append_to_firebase(data):
    try:
        response = requests.post(FIREBASE_URL, json=data, timeout=5)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"Error appending to Firebase: {e}")
        return False

# ---------------- MAIN LOOP ----------------
def main():
    print("🚀 SmartIoT Sensor Simulator Started")
    iteration = 0
    while True:
        iteration += 1
        current_data = generate_sensor_data()
        historical_df = fetch_historical_data()
        predicted_temp = predict_future_temperature(historical_df, current_data)
        current_data["predicted_temp"] = predicted_temp
        current_data["alerts"] = check_alerts(current_data)

        print(f"[{iteration}] {current_data['timestamp']}")
        print(f"  Current: {current_data['temperature']}°C | Predicted: {predicted_temp}°C | "
              f"Humidity: {current_data['humidity']}% | Motion: {'Yes' if current_data['motion'] else 'No'}")
        if current_data["alerts"]:
            print("  Alerts:", ", ".join(current_data["alerts"]))

        append_to_firebase(current_data)
        time.sleep(SAMPLE_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
