/**
 * SmartIoT Dashboard Component
 * 
 * Displays real-time sensor data with ML predictions in a clean, professional interface.
 * Features:
 * - Real-time temperature monitoring with future predictions
 * - Celsius/Fahrenheit conversion toggle
 * - Interactive charts with smooth lines and tooltips
 * - Motion detection status
 * - Humidity monitoring
 */

import { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const FIREBASE_URL =
  "https://smartiot-5602e-default-rtdb.firebaseio.com/sensors.json";

// Temperature conversion utilities
const celsiusToFahrenheit = (celsius) => (celsius * 9) / 5 + 32;
const fahrenheitToCelsius = (fahrenheit) => ((fahrenheit - 32) * 5) / 9;

// Format timestamp for display (extract time portion)
const formatTime = (timestamp) => {
  if (!timestamp || timestamp === "N/A") return "N/A";
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return timestamp;
  }
};

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [isFahrenheit, setIsFahrenheit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(FIREBASE_URL);

        if (!res.data) {
          console.warn("No data from Firebase");
          setIsLoading(false);
          return;
        }

        // Convert Firebase object to array and normalize data
        const values = Object.values(res.data)
          .map((item) => {
            const temp = Number(item.temperature) || 0;
            const predicted = Number(item.predicted_temp) || temp;
            const humidity = Number(item.humidity) || 0;
            const motion = Number(item.motion) || 0;
            const timestamp = item.timestamp || new Date().toISOString();

            return {
              temperature: temp,
              predicted_temp: predicted,
              humidity: humidity,
              motion: motion,
              timestamp: timestamp,
              time: formatTime(timestamp),
            };
          })
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .slice(-50); // Keep last 50 points for smooth chart display

        setData(values);
        setIsLoading(false);
      } catch (err) {
        console.error("Firebase fetch error:", err);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Poll every 5 seconds to match backend update interval
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get latest reading for display cards
  const latest = data.length > 0 ? data[data.length - 1] : null;

  // Convert temperatures based on toggle
  const displayTemp = (celsius) => {
    if (isFahrenheit) {
      return `${celsiusToFahrenheit(celsius).toFixed(1)}°F`;
    }
    return `${celsius.toFixed(1)}°C`;
  };

  // Prepare chart data with converted temperatures
  const chartData = data.map((point) => ({
    ...point,
    temperature_display: isFahrenheit
      ? celsiusToFahrenheit(point.temperature)
      : point.temperature,
    predicted_temp_display: isFahrenheit
      ? celsiusToFahrenheit(point.predicted_temp)
      : point.predicted_temp,
  }));

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <h2 style={styles.loadingText}>Loading sensor data...</h2>
        </div>
      </div>
    );
  }

  if (!latest) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <h2 style={styles.loadingText}>Waiting for sensor data...</h2>
          <p style={styles.subtext}>
            Make sure the backend simulator is running
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Smart IoT Dashboard</h1>
        <button
          onClick={() => setIsFahrenheit(!isFahrenheit)}
          style={styles.toggleButton}
        >
          {isFahrenheit ? "Switch to °C" : "Switch to °F"}
        </button>
      </div>

      {/* Live Metrics Cards */}
      <div style={styles.metricsGrid}>
        <MetricCard
          title="Current Temperature"
          value={displayTemp(latest.temperature)}
          color="#38bdf8"
        />
        <MetricCard
          title="Predicted Temperature"
          subtitle="(7.5 min ahead)"
          value={displayTemp(latest.predicted_temp)}
          color="#facc15"
        />
        <MetricCard
          title="Humidity"
          value={`${latest.humidity.toFixed(1)}%`}
          color="#34d399"
        />
        <MetricCard
          title="Motion Status"
          value={latest.motion ? "Detected" : "No Motion"}
          color={latest.motion ? "#f87171" : "#6b7280"}
          icon={latest.motion ? "🔴" : "⚪"}
        />
      </div>

      {/* Temperature Chart */}
      <div style={styles.chartContainer}>
        <h2 style={styles.chartTitle}>Temperature Over Time</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              style={{ fontSize: "12px" }}
              interval="preserveStartEnd"
            />
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
                if (name === "temperature_display") {
                  return [`${value.toFixed(1)}${unit}`, "Actual Temperature"];
                }
                if (name === "predicted_temp_display") {
                  return [`${value.toFixed(1)}${unit}`, "Predicted Temperature"];
                }
                return value;
              }}
            />
            <Legend
              wrapperStyle={{ color: "#94a3b8", paddingTop: "20px" }}
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="temperature_display"
              name="Actual Temperature"
              stroke="#38bdf8"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6 }}
              animationDuration={300}
            />
            <Line
              type="monotone"
              dataKey="predicted_temp_display"
              name="Predicted Temperature"
              stroke="#facc15"
              strokeWidth={2.5}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6 }}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Metric Card Component
 * Displays a single metric with title and value in a clean card layout
 */
function MetricCard({ title, subtitle, value, color, icon }) {
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
    </div>
  );
}

// Styles object for consistent, professional UI
const styles = {
  container: {
    padding: "32px",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    minHeight: "100vh",
    color: "#f1f5f9",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  title: {
    fontSize: "32px",
    fontWeight: "700",
    margin: 0,
    background: "linear-gradient(135deg, #38bdf8 0%, #facc15 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  toggleButton: {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#0f172a",
    background: "#facc15",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(250, 204, 21, 0.3)",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "20px",
    marginBottom: "40px",
  },
  card: {
    background: "#1e293b",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #334155",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
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
    fontSize: "28px",
    fontWeight: "700",
    color: "#f1f5f9",
  },
  chartContainer: {
    background: "#1e293b",
    padding: "24px",
    borderRadius: "12px",
    border: "1px solid #334155",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
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
  loadingText: {
    fontSize: "24px",
    color: "#94a3b8",
    marginBottom: "12px",
  },
  subtext: {
    fontSize: "14px",
    color: "#64748b",
    margin: 0,
  },
};
