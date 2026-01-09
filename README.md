# SmartIoT - Production-Ready IoT Monitoring Platform

A comprehensive, production-ready IoT sensor monitoring system with ML-powered temperature predictions, real-time alerts, and professional dashboard.

**Clean Architecture**: Frontend and backend are separated for independent deployment and scalability.

## 🚀 Features

### Core Functionality
- **Real-time Sensor Monitoring**: Temperature, humidity, and motion detection
- **ML-Powered Predictions**: Forecasts temperature 5-15 minutes ahead using exponential smoothing
- **Comprehensive Alerts**: Threshold-based and predictive alerts with spam prevention
- **Historical Data Analysis**: View and export historical sensor data
- **Responsive Dashboard**: Works seamlessly on desktop and mobile devices

### Production Features
- **Clean Architecture**: Frontend-backend separation for independent deployment
- **Robust Error Handling**: Retry logic, data validation, and graceful degradation
- **Performance Optimized**: Efficient data processing and rendering
- **Secure Data Handling**: Input validation and sanitization
- **24/7 Reliability**: Built for continuous operation
- **Professional UI/UX**: Modern, intuitive interface

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (optional, for simulator)
- Firebase Realtime Database account

## 🛠️ Installation

### API Server Setup

```bash
cd api-server
npm install
cp .env.example .env
# Edit .env with your Firebase URL and settings
```

### Frontend Setup

```bash
cd frontend
npm install
# Create .env file with REACT_APP_API_URL=http://localhost:3001
```

### Python Simulator (Optional)

```bash
cd backend
pip install -r requirements.txt
```

## 🚀 Running the Application

### Development Mode

**1. Start API Server:**
```bash
cd api-server
npm run dev
# Server runs on http://localhost:3001
```

**2. Start Frontend:**
```bash
cd frontend
npm start
# Dashboard available at http://localhost:3000
```

**3. Start Python Simulator (Optional):**
```bash
cd backend
python3 simulate.py
```

### Production Deployment

**Frontend (Vercel/Netlify):**
```bash
cd frontend
npm run build
# Deploy build/ folder
# Set REACT_APP_API_URL to your API server URL
```

**API Server (Render/Railway/Heroku):**
```bash
cd api-server
npm install
npm start
# Set environment variables (Firebase URL, PORT, CORS origin)
```

## 📊 Dashboard Features

### Real-time Monitoring
- Live sensor readings updated every 5 seconds
- Current and predicted temperature display
- Humidity and motion status
- Visual trend indicators

### Historical Analysis
- View data from last 15 minutes to 24 hours
- Interactive charts with zoom and tooltips
- Export data to CSV format

### Alert System
- High/low temperature alerts
- Humidity threshold alerts
- Motion detection notifications
- Predictive temperature deviation warnings

## ⚙️ Configuration

### API Server Configuration

Edit `api-server/.env`:

```bash
FIREBASE_URL=https://your-firebase-url.firebaseio.com
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend Configuration

Create `frontend/.env`:

```bash
REACT_APP_API_URL=http://localhost:3001
# For production: REACT_APP_API_URL=https://your-api-domain.com
```

### Python Simulator Configuration (Optional)

Edit `backend/simulate.py`:

```python
SAMPLE_INTERVAL_SECONDS = 5  # Data collection interval
PREDICTION_HORIZON_STEPS = 90  # Prediction horizon (7.5 min)
ROLLING_WINDOW_SIZE = 100  # ML training window
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

## 🔒 Security Considerations

- **Firebase Security Rules**: Configure Firebase Realtime Database rules to restrict access
- **API Keys**: Never commit API keys or credentials to version control
- **HTTPS**: Always use HTTPS in production
- **Input Validation**: All inputs are validated and sanitized

## 📈 Performance Optimization

- Data points limited to prevent memory issues
- Efficient chart rendering with Recharts
- Optimized Firebase queries
- Lazy loading and memoization

## 🐛 Troubleshooting

### API Server Issues

**Connection Errors:**
- Check Firebase URL in `.env` is correct
- Verify network connectivity
- Check Firebase database rules

**CORS Errors:**
- Set `FRONTEND_URL` in API server `.env` to match frontend URL
- Verify CORS origin matches frontend domain

**Prediction Issues:**
- Ensure sufficient historical data (minimum 3 samples)
- Check server logs for errors

### Frontend Issues

**No Data Display:**
- Verify API server is running on correct port
- Check `REACT_APP_API_URL` in `.env` matches API server URL
- Check browser console for errors
- Verify API server is accessible

**API Connection Errors:**
- Check API server is running
- Verify `REACT_APP_API_URL` is correct
- Check CORS settings on API server

## 📝 Logging

Backend logs are written to:
- Console output (stdout)
- `smartiot.log` file

Log levels: INFO, WARNING, ERROR, CRITICAL

## 🔄 Updates & Maintenance

### Regular Maintenance
- Monitor log files for errors
- Review Firebase database size
- Update dependencies regularly
- Backup historical data periodically

### Scaling Considerations
- Use Firebase database sharding for large datasets
- Implement data archiving for old records
- Consider using a time-series database for production
- Add load balancing for multiple sensor sources

## 📄 License

This project is ready for commercial use. Customize as needed for your deployment.

## 🤝 Support

For issues or questions:
1. Check the logs (`smartiot.log`)
2. Review browser console for frontend errors
3. Verify all dependencies are installed
4. Check Firebase database connectivity

## 🎯 Production Checklist

- [x] Error handling and retry logic
- [x] Data validation and sanitization
- [x] Responsive UI design
- [x] Historical data viewing
- [x] Data export functionality
- [x] Alert system with spam prevention
- [x] Performance optimization
- [x] Logging and monitoring
- [x] Error boundaries
- [x] Production-ready code structure

---

**Built for production. Ready for customers.**


