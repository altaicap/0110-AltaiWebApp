# Altai Trader - Production-Ready Trading Platform

A comprehensive trading platform with real-time news, broker integrations, and backtesting capabilities.

## Features

- 🔐 **Secure Authentication**: Email/password with JWT tokens
- 📈 **Live Broker Integration**: TradeStation and Interactive Brokers (IBKR) OAuth 2.0
- 📰 **Real-time News**: NewsWare and TradeXchange with auto-refresh and SSE
- 📊 **Strategy Backtesting**: Python-based strategy development and testing
- 🎯 **Trading Configurations**: Create and manage live trading setups
- 🌙 **Dark/Light Theme**: Responsive UI with theme switching
- ⚡ **Production Ready**: Comprehensive logging, health checks, and error handling

## Tech Stack

- **Frontend**: React.js, Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python 3.11), Pydantic v2
- **Database**: MongoDB (strategies, news, configs), PostgreSQL (users, auth)
- **Real-time**: Server-Sent Events (SSE) for live updates
- **Authentication**: JWT with secure session management
- **Broker APIs**: TradeStation Web API, IBKR Client Portal Web API
- **Market Data**: Polygon.io integration

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB
- PostgreSQL (for user authentication)

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your environment variables in `.env`:

```env
# Database URLs
MONGO_URL=mongodb://localhost:27017
DB_NAME=altai_trader

# API Keys
POLYGON_API_KEY=your_polygon_api_key
NEWSWARE_API_KEY=your_newsware_api_key
TRADEXCHANGE_API_KEY=your_tradexchange_api_key

# Broker OAuth
TRADESTATION_CLIENT_ID=your_tradestation_client_id
TRADESTATION_CLIENT_SECRET=your_tradestation_client_secret
TRADESTATION_REDIRECT_URI=http://localhost:3000/auth/tradestation/callback

# IBKR Configuration
IBKR_MODE=gateway  # or oauth2
IBKR_CLIENT_ID=your_ibkr_client_id  # for oauth2 mode
```

### Backend Setup

1. Install Python dependencies:
```bash
cd backend
pip install -r requirements.txt
```

2. Start the backend server:
```bash
python server.py
```

The backend will be available at `http://localhost:8001`

### Frontend Setup

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

### Running Tests

```bash
cd backend
pytest tests/ -v
```

## Broker Integration Guide

### TradeStation Setup

1. **Developer Account**: Register at [https://developer.tradestation.com/](https://developer.tradestation.com/)
2. **Create Application**: 
   - Set redirect URI to your domain + `/auth/tradestation/callback`
   - Request scopes: `openid`, `offline_access`, `profile`, `MarketData`, `ReadAccount`, `Trade`
3. **Configure Environment**:
   ```env
   TRADESTATION_CLIENT_ID=your_client_id
   TRADESTATION_CLIENT_SECRET=your_client_secret
   TRADESTATION_REDIRECT_URI=https://your-domain.com/auth/tradestation/callback
   ```

### IBKR Setup

#### Gateway Mode (Recommended for Development)
```env
IBKR_MODE=gateway
```

1. Download and install IBKR Client Portal Gateway
2. Run gateway on the same machine as the backend
3. No additional OAuth setup required

#### OAuth2 Mode (Production)
```env
IBKR_MODE=oauth2
IBKR_CLIENT_ID=your_registered_client_id
```

1. **Generate RSA Keys**: The application will auto-generate keys on first run
2. **Register with IBKR**: Contact IBKR API team to register your public key
3. **Configure Client ID**: Set your registered client ID in environment

### Getting API Keys

- **Polygon**: [https://polygon.io/](https://polygon.io/) - Market data
- **NewsWare**: Contact NewsWare for API access
- **TradeXchange**: Contact TradeXchange for API credentials

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

### Trading Endpoints

- `POST /api/trading/auth/initiate` - Start broker OAuth flow
- `POST /api/trading/auth/callback` - Handle OAuth callback
- `GET /api/trading/connections` - Get broker connection status
- `GET /api/trading/accounts` - Get connected broker accounts

### News & Data Endpoints

- `GET /api/news/live` - Get latest news articles
- `GET /api/news/stream` - SSE stream for real-time updates
- `GET /api/market/{symbol}/bars` - Get market data

### System Endpoints

- `GET /api/system/health` - System health check
- `POST /api/settings/test-connection` - Test API connections

## Production Deployment

### Environment Variables for Production

```env
# Use production URLs
REACT_APP_BACKEND_URL=https://api.your-domain.com
TRADESTATION_REDIRECT_URI=https://your-domain.com/auth/tradestation/callback

# Security
JWT_SECRET_KEY=your_super_secure_secret_key
CORS_ORIGINS=https://your-domain.com

# Database
MONGO_URL=mongodb://your-mongo-host:27017
DB_NAME=altai_trader_prod
```

### SSL/HTTPS Requirements

- All broker OAuth flows require HTTPS in production
- TradeStation and IBKR will reject HTTP redirect URIs
- Ensure SSL certificates are properly configured

### Docker Deployment (Optional)

```bash
# Build and run with docker-compose
docker-compose up -d
```

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  FastAPI Backend │    │   External APIs │
│                 │    │                 │    │                 │
│ • Authentication│◄──►│ • JWT Auth      │◄──►│ • Polygon       │
│ • Trading UI    │    │ • OAuth Flows   │    │ • NewsWare      │
│ • News Feed     │    │ • SSE Streaming │    │ • TradeXchange  │
│ • Backtesting   │    │ • Strategy Exec │    │ • TradeStation  │
│                 │    │                 │    │ • IBKR          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                        │                        
          │              ┌─────────────────┐               
          └──────────────►│   Databases     │               
                         │                 │               
                         │ • MongoDB       │               
                         │ • PostgreSQL    │               
                         └─────────────────┘               
```

## Security Features

- JWT token authentication with expiration
- Secure OAuth 2.0 flows for broker connections
- API key masking in responses
- CORS protection
- Request timeout and rate limiting
- Secure token storage (httpOnly cookies recommended for production)

## Support & Documentation

- **Issues**: Create GitHub issues for bugs and feature requests
- **API Docs**: Available at `/docs` when backend is running
- **Trading Guides**: See `docs/` directory for detailed trading setup guides

## License

Proprietary - All rights reserved

---

**Note**: This is a production-ready trading platform. Ensure you understand the risks involved in automated trading and test thoroughly with paper trading before using real money.
