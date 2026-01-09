/**
 * SmartIoT Dashboard
 * 
 * Real-time sensor monitoring with ML temperature predictions.
 * Frontend is stateless - all prediction logic runs on the backend API.
 * 
 * Why frontend is stateless:
 * - Keeps the React app lightweight and fast
 * - Predictions run consistently on the backend with full historical data
 * - Easier to update ML models without frontend deployments
 * - Better separation of concerns for production deployments
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

// API endpoint - defaults to localhost for development, can be overridden with env var
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const SENSORS_ENDPOINT = `${API_BASE_URL}/api/sensors`;
const CONFIG_ENDPOINT = `${API_BASE_URL}/api/config`;
const DEVICE_HEALTH_ENDPOINT = `${API_BASE_URL}/api/device-health`;

const POLL_INTERVAL = 5000; // Match backend update frequency
const MAX_DATA_POINTS = 200;

// Role-based UI (client-side only - in production this would come from auth)
const ROLES = {
  VIEWER: "viewer",
  OPERATOR: "operator",
  ADMIN: "admin"
};

const celsiusToFahrenheit = (celsius) => (celsius * 9) / 5 + 32;

// Format UTC timestamp to local time for display
const formatTime = (timestamp) => {
  if (!timestamp) return "N/A";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Invalid";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return timestamp;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";
  try {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return timestamp;
  }
};

const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "Local";
  }
};

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [deviceHealth, setDeviceHealth] = useState(null);
  const [isFahrenheit, setIsFahrenheit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showHistorical, setShowHistorical] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState("1h");
  const [showConfig, setShowConfig] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [thresholds, setThresholds] = useState({
    tempHigh: 30.0,
    tempLow: 18.0,
    humidityHigh: 60.0,
    humidityLow: 40.0,
    predictionDeviation: 2.0,
  });
  const [userRole, setUserRole] = useState(ROLES.ADMIN); // Demo: would come from auth
  const [predictionMethod, setPredictionMethod] = useState("exponential"); // "exponential" or "moving_avg"
  const [predictionHorizon, setPredictionHorizon] = useState(7.5); // minutes ahead

  // Fetch sensor data from backend API
  // The backend handles all prediction logic, keeping the frontend stateless
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(SENSORS_ENDPOINT, {
        params: {
          limit: MAX_DATA_POINTS,
          includePredictions: 'true',
          method: predictionMethod,
          horizon: predictionHorizon
        },
        timeout: 10000
      });

      if (!res.data || !Array.isArray(res.data)) {
        setError("No data available");
        setIsLoading(false);
        return;
      }

      // Backend returns data with predictions already computed
      const values = res.data
        .map((item) => {
          // Normalize data and handle missing timestamps
          let timestamp = item.timestamp || new Date().toISOString();
          if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && timestamp.includes('T')) {
            timestamp += 'Z'; // Ensure UTC format
          }

          return {
            temperature: Number(item.temperature) || 0,
            predicted_temp: Number(item.predicted_temp) || item.temperature || 0,
            humidity: Number(item.humidity) || 0,
            motion: Number(item.motion) || 0,
            timestamp: timestamp,
            time: formatTime(timestamp),
            dateTime: formatDate(timestamp),
            alerts: item.alerts || [],
          };
        })
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .slice(-MAX_DATA_POINTS);

      setData(values);
      setError(null);
      setIsLoading(false);

      // Show alerts from latest reading
      const latest = values[values.length - 1];
      if (latest?.alerts?.length > 0) {
        const newAlerts = latest.alerts.map(alert => ({
          id: `${Date.now()}-${Math.random()}`,
          ...alert,
          timestamp: Date.now(), // Track when alert was created
        }));
        setAlerts(prev => {
          const existing = new Set(prev.map(a => a.message));
          const unique = newAlerts.filter(a => !existing.has(a.message));
          // Keep only last 3 alerts total
          return [...prev, ...unique].slice(-3);
        });
      } else {
        // If latest reading has no alerts, clear old alerts after a delay
        setAlerts(prev => {
          // Keep alerts that are less than 5 seconds old
          const now = Date.now();
          return prev.filter(a => (now - (a.timestamp || 0)) < 5000);
        });
      }

    } catch (err) {
      console.error("Fetch error:", err);
      setError(`Failed to fetch data: ${err.message}`);
      setIsLoading(false);
    }
  }, [predictionMethod, predictionHorizon]);

  const fetchDeviceHealth = useCallback(async () => {
    try {
      const res = await axios.get(DEVICE_HEALTH_ENDPOINT, { timeout: 10000 });
      if (res.data) {
        setDeviceHealth(res.data);
      }
    } catch (err) {
      // Health data is optional, fail silently
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await axios.get(CONFIG_ENDPOINT, { timeout: 10000 });
      if (res.data?.thresholds) {
        setThresholds(prev => ({
          tempHigh: res.data.thresholds.temp_high ?? res.data.thresholds.tempHigh ?? prev.tempHigh,
          tempLow: res.data.thresholds.temp_low ?? res.data.thresholds.tempLow ?? prev.tempLow,
          humidityHigh: res.data.thresholds.humidity_high ?? res.data.thresholds.humidityHigh ?? prev.humidityHigh,
          humidityLow: res.data.thresholds.humidity_low ?? res.data.thresholds.humidityLow ?? prev.humidityLow,
          predictionDeviation: res.data.thresholds.prediction_deviation ?? res.data.thresholds.predictionDeviation ?? prev.predictionDeviation,
        }));
      }
    } catch (err) {
      // Use defaults if config unavailable
    }
  }, []);

  const saveConfig = useCallback(async () => {
    if (userRole !== ROLES.ADMIN && userRole !== ROLES.OPERATOR) {
      alert("Only operators and admins can modify thresholds");
      return;
    }
    
    try {
      await axios.put(CONFIG_ENDPOINT, {
        thresholds: {
          temp_high: thresholds.tempHigh,
          temp_low: thresholds.tempLow,
          humidity_high: thresholds.humidityHigh,
          humidity_low: thresholds.humidityLow,
          prediction_deviation: thresholds.predictionDeviation,
        },
      });
      alert("Configuration saved");
      setShowConfig(false);
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    }
  }, [thresholds, userRole]);

  // Poll for updates
  useEffect(() => {
    fetchData();
    fetchDeviceHealth();
    fetchConfig();
    
    const interval = setInterval(fetchData, POLL_INTERVAL);
    const healthInterval = setInterval(fetchDeviceHealth, 10000);
    
    return () => {
      clearInterval(interval);
      clearInterval(healthInterval);
    };
  }, [fetchData, fetchDeviceHealth, fetchConfig]);

  // Auto-dismiss old alerts (after 8 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      setAlerts(prev => {
        const now = Date.now();
        // Remove alerts older than 8 seconds
        return prev.filter(a => (now - (a.timestamp || 0)) < 8000);
      });
    }, 2000); // Check every 2 seconds
    return () => clearInterval(timer);
  }, []);

  // Function to dismiss a specific alert
  const dismissAlert = useCallback((alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  }, []);

  const latest = useMemo(() => data[data.length - 1] || null, [data]);

  // Filter data by selected time range
  const filteredData = useMemo(() => {
    if (!showHistorical) return data.slice(-50);
    
    const ranges = {
      "15m": 15 * 60 * 1000,
      "30m": 30 * 60 * 1000,
      "1h": 60 * 60 * 1000,
      "3h": 3 * 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    };
    
    const range = ranges[selectedTimeRange] || ranges["1h"];
    const now = Date.now();
    return data.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return (now - itemTime) <= range;
    });
  }, [data, showHistorical, selectedTimeRange]);

  // Calculate basic statistics
  const statistics = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const temps = filteredData.map(d => d.temperature);
    const humidities = filteredData.map(d => d.humidity);
    
    return {
      tempAvg: (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2),
      tempMin: Math.min(...temps).toFixed(2),
      tempMax: Math.max(...temps).toFixed(2),
      humidityAvg: (humidities.reduce((a, b) => a + b, 0) / humidities.length).toFixed(1),
      dataPoints: filteredData.length,
    };
  }, [filteredData]);

  const displayTemp = useCallback((celsius) => {
    return isFahrenheit 
      ? `${celsiusToFahrenheit(celsius).toFixed(1)}°F`
      : `${celsius.toFixed(1)}°C`;
  }, [isFahrenheit]);

  const chartData = useMemo(() => {
    return filteredData.map((point) => ({
      ...point,
      temperature_display: isFahrenheit
        ? celsiusToFahrenheit(point.temperature)
        : point.temperature,
      predicted_temp_display: isFahrenheit
        ? celsiusToFahrenheit(point.predicted_temp)
        : point.predicted_temp,
    }));
  }, [filteredData, isFahrenheit]);

  const exportToCSV = useCallback(() => {
    if (data.length === 0) return;

    const headers = ["Timestamp (UTC)", "Local Time", "Temperature (°C)", "Predicted Temp (°C)", "Humidity (%)", "Motion"];
    const rows = data.map(item => [
      item.timestamp,
      item.dateTime,
      item.temperature,
      item.predicted_temp,
      item.humidity,
      item.motion ? "Yes" : "No"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartiot-data-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [data]);

  const getHealthColor = (status) => {
    return status === "HEALTHY" ? "#10b981" : status === "DEGRADED" ? "#f59e0b" : "#ef4444";
  };

  const getAlertColor = (severity) => {
    return severity === "HIGH" ? "#ef4444" : severity === "MEDIUM" ? "#f59e0b" : "#3b82f6";
  };

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <h2 style={styles.loadingText}>Loading sensor data...</h2>
        </div>
      </div>
    );
  }

  if (error && data.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h2 style={styles.errorText}>Connection Error</h2>
          <p style={styles.errorMessage}>{error}</p>
          <button style={styles.retryButton} onClick={fetchData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!latest) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <h2 style={styles.loadingText}>Waiting for sensor data...</h2>
          <p style={styles.subtext}>Make sure the backend simulator is running</p>
          <button style={styles.retryButton} onClick={fetchData}>Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>SmartIoT Dashboard</h1>
          <p style={styles.subtitle}>Real-time Sensor Monitoring</p>
        </div>
        <div style={styles.headerActions}>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            style={styles.roleSelect}
            title="User Role (demo only)"
          >
            <option value={ROLES.VIEWER}>Viewer</option>
            <option value={ROLES.OPERATOR}>Operator</option>
            <option value={ROLES.ADMIN}>Admin</option>
          </select>
          <button onClick={() => setIsFahrenheit(!isFahrenheit)} style={styles.toggleButton}>
            {isFahrenheit ? "°C" : "°F"}
          </button>
          <button onClick={exportToCSV} style={styles.exportButton}>📥 Export</button>
          {(userRole === ROLES.OPERATOR || userRole === ROLES.ADMIN) && (
            <button onClick={() => setShowConfig(!showConfig)} style={styles.configButton}>
              ⚙️ Config
            </button>
          )}
          <button onClick={() => setShowHealth(!showHealth)} style={styles.healthButton}>
            💚 Health
          </button>
        </div>
      </div>

      {/* Device Health Panel */}
      {showHealth && deviceHealth && (
        <div style={styles.healthPanel}>
          <div style={styles.panelHeader}>
            <h3>Device Health</h3>
            <button onClick={() => setShowHealth(false)} style={styles.closeButton}>×</button>
          </div>
          <div style={styles.healthGrid}>
            <div style={styles.healthCard}>
              <div style={styles.healthLabel}>Status</div>
              <div style={{ ...styles.healthValue, color: getHealthColor(deviceHealth.status) }}>
                {deviceHealth.status}
              </div>
            </div>
            <div style={styles.healthCard}>
              <div style={styles.healthLabel}>Reliability</div>
              <div style={styles.healthValue}>{deviceHealth.reliability_percent}%</div>
            </div>
            <div style={styles.healthCard}>
              <div style={styles.healthLabel}>Uptime</div>
              <div style={styles.healthValue}>{deviceHealth.uptime_hours.toFixed(1)} hours</div>
            </div>
            <div style={styles.healthCard}>
              <div style={styles.healthLabel}>Readings</div>
              <div style={styles.healthValue}>
                {deviceHealth.successful_readings} / {deviceHealth.total_readings}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Panel */}
      {showConfig && (userRole === ROLES.OPERATOR || userRole === ROLES.ADMIN) && (
        <div style={styles.configPanel}>
          <div style={styles.panelHeader}>
            <h3>Alert Thresholds</h3>
            <button onClick={() => setShowConfig(false)} style={styles.closeButton}>×</button>
          </div>
          <div style={styles.configGrid}>
            <div style={styles.configItem}>
              <label>High Temp (°C)</label>
              <input
                type="number"
                value={thresholds.tempHigh}
                onChange={(e) => setThresholds({...thresholds, tempHigh: parseFloat(e.target.value)})}
                step="0.1"
                style={styles.configInput}
              />
            </div>
            <div style={styles.configItem}>
              <label>Low Temp (°C)</label>
              <input
                type="number"
                value={thresholds.tempLow}
                onChange={(e) => setThresholds({...thresholds, tempLow: parseFloat(e.target.value)})}
                step="0.1"
                style={styles.configInput}
              />
            </div>
            <div style={styles.configItem}>
              <label>High Humidity (%)</label>
              <input
                type="number"
                value={thresholds.humidityHigh}
                onChange={(e) => setThresholds({...thresholds, humidityHigh: parseFloat(e.target.value)})}
                step="0.1"
                style={styles.configInput}
              />
            </div>
            <div style={styles.configItem}>
              <label>Low Humidity (%)</label>
              <input
                type="number"
                value={thresholds.humidityLow}
                onChange={(e) => setThresholds({...thresholds, humidityLow: parseFloat(e.target.value)})}
                step="0.1"
                style={styles.configInput}
              />
            </div>
          </div>
          <div style={styles.configActions}>
            <button onClick={saveConfig} style={styles.saveButton}>Save</button>
            <button onClick={() => setShowConfig(false)} style={styles.cancelButton}>Cancel</button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={styles.alertContainer}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                ...styles.alert,
                backgroundColor: getAlertColor(alert.severity),
              }}
            >
              <div style={styles.alertContent}>
                <strong>{alert.category}:</strong> {alert.message}
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                style={styles.alertCloseButton}
                aria-label="Dismiss alert"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Cards */}
      <div style={styles.metricsGrid}>
        <MetricCard
          title="Current Temperature"
          value={displayTemp(latest.temperature)}
          color="#38bdf8"
          trend={getTrend(data, "temperature")}
        />
        <MetricCard
          title="Predicted Temperature"
          subtitle="(7.5 min ahead)"
          value={displayTemp(latest.predicted_temp)}
          color="#facc15"
          trend={getTrend(data, "predicted_temp")}
        />
        <MetricCard
          title="Humidity"
          value={`${latest.humidity.toFixed(1)}%`}
          color="#34d399"
          trend={getTrend(data, "humidity")}
        />
        <MetricCard
          title="Motion"
          value={latest.motion ? "Detected" : "None"}
          color={latest.motion ? "#f87171" : "#6b7280"}
          icon={latest.motion ? "🔴" : "⚪"}
        />
      </div>

      {/* Statistics */}
      {statistics && (
        <div style={styles.statsBar}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Avg Temp:</span>
            <span style={styles.statValue}>{displayTemp(parseFloat(statistics.tempAvg))}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Range:</span>
            <span style={styles.statValue}>
              {displayTemp(parseFloat(statistics.tempMin))} - {displayTemp(parseFloat(statistics.tempMax))}
            </span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Avg Humidity:</span>
            <span style={styles.statValue}>{statistics.humidityAvg}%</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Data Points:</span>
            <span style={styles.statValue}>{statistics.dataPoints}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>Last Update:</span>
            <span style={styles.statValue}>{latest.dateTime} ({getUserTimezone()})</span>
          </div>
        </div>
      )}

      {/* Chart Controls */}
      <div style={styles.chartControls}>
        <button
          onClick={() => setShowHistorical(!showHistorical)}
          style={{
            ...styles.controlButton,
            ...(showHistorical ? styles.activeButton : {}),
          }}
        >
          {showHistorical ? "📊 Historical" : "📈 Real-time"}
        </button>
        {showHistorical && (
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            style={styles.select}
          >
            <option value="15m">Last 15 min</option>
            <option value="30m">Last 30 min</option>
            <option value="1h">Last 1 hour</option>
            <option value="3h">Last 3 hours</option>
            <option value="6h">Last 6 hours</option>
            <option value="24h">Last 24 hours</option>
          </select>
        )}
      </div>

      {/* Prediction Controls */}
      <div style={styles.predictionControls}>
        <div style={styles.predictionControlGroup}>
          <label style={styles.predictionLabel}>Prediction Method:</label>
          <select
            value={predictionMethod}
            onChange={(e) => setPredictionMethod(e.target.value)}
            style={styles.select}
            title="Choose prediction algorithm"
          >
            <option value="exponential">Exponential Smoothing (ML)</option>
            <option value="moving_avg">Moving Average (Simple)</option>
          </select>
        </div>
        <div style={styles.predictionControlGroup}>
          <label style={styles.predictionLabel}>Horizon:</label>
          <select
            value={predictionHorizon}
            onChange={(e) => setPredictionHorizon(parseFloat(e.target.value))}
            style={styles.select}
            title="How far ahead to predict"
          >
            <option value={5}>5 minutes</option>
            <option value={7.5}>7.5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
          </select>
        </div>
      </div>

      {/* Temperature Chart */}
      <div style={styles.chartContainer}>
        <h2 style={styles.chartTitle}>Temperature Over Time</h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#facc15" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#facc15" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} interval="preserveStartEnd" />
            <YAxis
              stroke="#94a3b8"
              style={{ fontSize: "12px" }}
              label={{
                value: isFahrenheit ? "Temperature (°F)" : "Temperature (°C)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#94a3b8" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#f1f5f9",
              }}
              formatter={(value, name) => {
                const unit = isFahrenheit ? "°F" : "°C";
                if (name === "temperature_display") return [`${value.toFixed(1)}${unit}`, "Actual"];
                if (name === "predicted_temp_display") return [`${value.toFixed(1)}${unit}`, "Predicted"];
                return value;
              }}
            />
            <Legend wrapperStyle={{ color: "#94a3b8", paddingTop: "20px" }} iconType="line" />
            <Area
            type="monotone"
              dataKey="temperature_display"
              name="Actual Temperature"
            stroke="#38bdf8"
              fillOpacity={1}
              fill="url(#colorTemp)"
              strokeWidth={2.5}
            />
            <Area
              type="monotone"
              dataKey="predicted_temp_display"
              name="Predicted Temperature"
              stroke="#facc15"
              fillOpacity={1}
              fill="url(#colorPred)"
              strokeWidth={2.5}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Humidity Chart */}
      <div style={styles.chartContainer}>
        <h2 style={styles.chartTitle}>Humidity Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
            <YAxis
              stroke="#94a3b8"
              style={{ fontSize: "12px" }}
              label={{
                value: "Humidity (%)",
                angle: -90,
                position: "insideLeft",
                style: { fill: "#94a3b8" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#f1f5f9",
              }}
          />
          <Line
            type="monotone"
              dataKey="humidity"
              name="Humidity"
              stroke="#34d399"
              strokeWidth={2.5}
            dot={false}
              activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}

function MetricCard({ title, subtitle, value, color, icon, trend }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>{title}</h3>
        {subtitle && <p style={styles.cardSubtitle}>{subtitle}</p>}
      </div>
      <div style={styles.cardValue}>
        {icon && <span style={{ marginRight: "8px" }}>{icon}</span>}
        <span style={{ color }}>{value}</span>
      </div>
      {trend !== null && trend !== undefined && (
        <div style={styles.trend}>
          {trend > 0 ? "↗" : trend < 0 ? "↘" : "→"} {Math.abs(trend).toFixed(1)}
        </div>
      )}
    </div>
  );
}

function getTrend(data, field) {
  if (data.length < 2) return null;
  const recent = data.slice(-10);
  const first = recent[0][field];
  const last = recent[recent.length - 1][field];
  return last - first;
}

const styles = {
  container: {
    padding: "20px",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    minHeight: "100vh",
    color: "#f1f5f9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: {
    fontSize: "clamp(24px, 5vw, 32px)",
    fontWeight: "700",
    margin: 0,
    background: "linear-gradient(135deg, #38bdf8 0%, #facc15 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "clamp(12px, 2vw, 14px)",
    color: "#94a3b8",
    margin: "4px 0 0 0",
  },
  headerActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  roleSelect: {
    padding: "8px 12px",
    fontSize: "12px",
    background: "#1e293b",
    color: "#f1f5f9",
    border: "1px solid #334155",
    borderRadius: "6px",
    cursor: "pointer",
  },
  toggleButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    background: "#facc15",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  exportButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
    background: "#3b82f6",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  configButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
    background: "#8b5cf6",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  healthButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
    background: "#10b981",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  healthPanel: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #334155",
    marginBottom: "24px",
  },
  configPanel: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #334155",
    marginBottom: "24px",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  },
  healthGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "16px",
  },
  healthCard: {
    background: "#0f172a",
    padding: "16px",
    borderRadius: "8px",
  },
  healthLabel: {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "8px",
  },
  healthValue: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#f1f5f9",
  },
  configGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  configItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  configInput: {
    padding: "8px 12px",
    background: "#0f172a",
    color: "#f1f5f9",
    border: "1px solid #334155",
    borderRadius: "6px",
    fontSize: "14px",
  },
  configActions: {
    display: "flex",
    gap: "12px",
  },
  saveButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
    background: "#10b981",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  cancelButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
    background: "#6b7280",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "24px",
    cursor: "pointer",
    padding: 0,
    width: "30px",
    height: "30px",
  },
  alertContainer: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 9999,
    maxWidth: "min(400px, 90vw)",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
  },
  alert: {
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "8px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  alertContent: {
    flex: 1,
    fontSize: "14px",
  },
  alertCloseButton: {
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "bold",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
    flexShrink: 0,
    lineHeight: 1,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #334155",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
  },
  cardHeader: {
    marginBottom: "12px",
  },
  cardTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#94a3b8",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  cardSubtitle: {
    fontSize: "11px",
    color: "#64748b",
    margin: "4px 0 0 0",
  },
  cardValue: {
    fontSize: "clamp(20px, 4vw, 28px)",
    fontWeight: "700",
    color: "#f1f5f9",
  },
  trend: {
    fontSize: "12px",
    color: "#94a3b8",
    marginTop: "8px",
  },
  statsBar: {
    background: "#1e293b",
    padding: "16px",
    borderRadius: "8px",
    marginBottom: "20px",
    display: "flex",
    flexWrap: "wrap",
    gap: "20px",
    justifyContent: "space-around",
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statLabel: {
    fontSize: "12px",
    color: "#94a3b8",
  },
  statValue: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#f1f5f9",
  },
  chartControls: {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    gap: "12px",
  },
  controlButton: {
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
    background: "#334155",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  activeButton: {
    background: "#3b82f6",
  },
  select: {
    padding: "8px 12px",
    fontSize: "14px",
    background: "#1e293b",
    color: "#f1f5f9",
    border: "1px solid #334155",
    borderRadius: "6px",
    cursor: "pointer",
  },
  predictionControls: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px",
    padding: "12px 16px",
    background: "#1e293b",
    borderRadius: "8px",
    border: "1px solid #334155",
    flexWrap: "wrap",
  },
  predictionControlGroup: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  predictionLabel: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  chartContainer: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #334155",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    marginBottom: "24px",
  },
  chartTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#f1f5f9",
    marginBottom: "20px",
    marginTop: 0,
  },
  loadingContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
  },
  spinner: {
    border: "4px solid #334155",
    borderTop: "4px solid #38bdf8",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 1s linear infinite",
    marginBottom: "16px",
  },
  loadingText: {
    fontSize: "24px",
    color: "#94a3b8",
    marginBottom: "12px",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    textAlign: "center",
  },
  errorText: {
    fontSize: "24px",
    color: "#f87171",
    marginBottom: "12px",
  },
  errorMessage: {
    fontSize: "14px",
    color: "#94a3b8",
    marginBottom: "20px",
  },
  retryButton: {
    padding: "12px 24px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#f1f5f9",
    background: "#3b82f6",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  subtext: {
    fontSize: "14px",
    color: "#64748b",
    margin: "8px 0",
  },
};

// Add CSS animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
