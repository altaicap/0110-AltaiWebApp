# UI ⇄ API Contract

This document specifies the complete contract between the frontend UI and backend API for the Altai Trader application.

## Authentication

### Sign In
- **Frontend**: Login form in authentication modal
- **Backend**: `POST /api/auth/login`
- **Request**: `{email: string, password: string}`
- **Response**: `{access_token: string, token_type: "bearer", user: UserResponse}`
- **States**: loading, success, error (invalid credentials)

### Sign Up
- **Frontend**: Registration form in authentication modal
- **Backend**: `POST /api/auth/register`
- **Request**: `{email: string, full_name: string, password: string}`
- **Response**: `{access_token: string, token_type: "bearer", user: UserResponse}`
- **States**: loading, success, error (email exists, weak password)

### Get Current User
- **Frontend**: User profile display, authentication check
- **Backend**: `GET /api/auth/me`
- **Request**: JWT token in Authorization header
- **Response**: `UserResponse`
- **States**: loading, authenticated, unauthenticated

## Dashboard

### Get Dashboard Metrics
- **Frontend**: Dashboard cards, charts (Trading Performance, Equity Curve, etc.)
- **Backend**: `GET /api/metrics/dashboard`
- **Query Params**: `start_date?: string, end_date?: string, source?: "backtest" | "live"`
- **Response**: `DashboardMetricsResponse`
- **States**: loading, success, error, empty

### Get Daily P&L Series
- **Frontend**: Calendar pane, daily P&L chart
- **Backend**: `GET /api/metrics/daily-pnl`
- **Query Params**: `start_date: string, end_date: string, mode?: "dollar" | "runit" | "percentage"`
- **Response**: `{data: Array<{date: string, pnl: number, trades: number}>, total_days: number}`
- **States**: loading, success, error, empty

### Get Positions
- **Frontend**: Positions pane with column management
- **Backend**: `GET /api/positions`
- **Query Params**: `account_id?: string, strategy?: string, columns?: string[]`
- **Response**: `{positions: Array<Position>, total_count: number, columns_config: ColumnsConfig}`
- **States**: loading, success, error, empty

### Get Recent Trades
- **Frontend**: Recently Closed pane, Recent Entries pane
- **Backend**: `GET /api/trades/recent`
- **Query Params**: `type: "closed" | "entries", limit?: number, columns?: string[]`
- **Response**: `{trades: Array<Trade>, total_count: number, has_more: boolean}`
- **States**: loading, success, error, empty

## Strategies

### List Strategies
- **Frontend**: Strategies tab, strategy dropdown
- **Backend**: `GET /api/strategies`
- **Response**: `Array<Strategy>`
- **States**: loading, success, error, empty

### Create Strategy
- **Frontend**: New Strategy dialog
- **Backend**: `POST /api/strategies`
- **Request**: `{name: string, description: string, code: string, parameters: object}`
- **Response**: `Strategy`
- **States**: loading, success, error (validation errors)

### Update Strategy
- **Frontend**: Strategy settings dialog
- **Backend**: `PUT /api/strategies/{id}`
- **Request**: `{name?: string, description?: string, code?: string, parameters?: object}`
- **Response**: `Strategy`
- **States**: loading, success, error (not found, validation errors)

### Delete Strategy
- **Frontend**: Delete confirmation dialog
- **Backend**: `DELETE /api/strategies/{id}`
- **Response**: `{message: string}`
- **States**: loading, success, error (not found, in use)

## Backtests

### Run Backtest
- **Frontend**: Backtest configuration dialog
- **Backend**: `POST /api/backtests/run`
- **Request**: `BacktestRequest`
- **Response**: `{id: string, status: "started", estimated_duration: number}`
- **States**: loading, success, error (invalid config, insufficient data)

### Get Backtest Status
- **Frontend**: Backtest progress indicator
- **Backend**: `GET /api/backtests/{id}`
- **Response**: `BacktestStatusResponse`
- **States**: loading, running, completed, error, cancelled

### Get Backtest Results
- **Frontend**: Backtest results pane (equity curve, stats, trades table)
- **Backend**: `GET /api/backtests/{id}/results`
- **Response**: `BacktestResultsResponse`
- **States**: loading, success, error, processing

### List Backtests
- **Frontend**: Backtests tab, backtest history
- **Backend**: `GET /api/backtests`
- **Query Params**: `limit?: number, offset?: number, status?: string`
- **Response**: `{backtests: Array<BacktestSummary>, total_count: number, has_more: boolean}`
- **States**: loading, success, error, empty

## Brokers & Connections

### Get Available Brokers
- **Frontend**: Connections pane broker list
- **Backend**: `GET /api/brokers/available`
- **Response**: `{brokers: Array<BrokerInfo>, total_count: number}`
- **States**: loading, success, error

### Initiate Broker OAuth
- **Frontend**: Connect broker button
- **Backend**: `POST /api/brokers/{broker}/oauth/start`
- **Request**: `{state?: string}`
- **Response**: `{authorization_url: string, state: string, instructions?: string}`
- **States**: loading, success, error (not configured)

### Handle OAuth Callback
- **Frontend**: OAuth callback handler
- **Backend**: `POST /api/brokers/{broker}/oauth/callback`
- **Request**: `{code: string, state: string}`
- **Response**: `{success: boolean, connection_id: string, expires_at?: string}`
- **States**: loading, success, error (invalid code, expired state)

### Get Broker Connections
- **Frontend**: Connections pane status display
- **Backend**: `GET /api/brokers/connections`
- **Response**: `{connections: Array<BrokerConnection>, total_count: number}`
- **States**: loading, success, error, empty

### Disconnect Broker
- **Frontend**: Disconnect confirmation dialog
- **Backend**: `DELETE /api/brokers/connections/{id}`
- **Response**: `{message: string, disconnected_at: string}`
- **States**: loading, success, error (not found)

### Get Trading Accounts
- **Frontend**: Account selection dropdown
- **Backend**: `GET /api/trading/accounts`
- **Query Params**: `broker?: string`
- **Response**: `{accounts: Array<TradingAccount>, total_count: number}`
- **States**: loading, success, error, empty

### Test Broker Connection
- **Frontend**: Test connection button
- **Backend**: `POST /api/brokers/{broker}/test`
- **Request**: `{connection_id: string}`
- **Response**: `{status: "success" | "error", message: string, last_sync?: string}`
- **States**: loading, success, error

## Trading

### Place Order
- **Frontend**: Order entry dialog
- **Backend**: `POST /api/trading/orders`
- **Request**: `OrderRequest`
- **Response**: `{order_id: string, status: string, message: string}`
- **States**: loading, success, error (insufficient funds, invalid symbol)

### Cancel Order
- **Frontend**: Cancel order button
- **Backend**: `DELETE /api/trading/orders/{id}`
- **Response**: `{message: string, cancelled_at: string}`
- **States**: loading, success, error (not found, already filled)

### Get Orders
- **Frontend**: Orders pane, order history
- **Backend**: `GET /api/trading/orders`
- **Query Params**: `account_id?: string, status?: string, limit?: number`
- **Response**: `{orders: Array<Order>, total_count: number, has_more: boolean}`
- **States**: loading, success, error, empty

## AI/Chat

### Send Chat Message
- **Frontend**: AI chat interface
- **Backend**: `POST /api/chat/message`
- **Request**: `{message: string, context?: object, date_range?: {start: string, end: string}}`
- **Response**: `{response: string, sources?: Array<string>, suggested_actions?: Array<Action>}`
- **States**: loading, success, error (rate limit, service unavailable)

### Upload Watchlist File
- **Frontend**: Drag & drop file upload in chat
- **Backend**: `POST /api/chat/upload-watchlist`
- **Request**: `multipart/form-data with file`
- **Response**: `{preview: WatchlistPreview, mapping_suggestions: Array<ColumnMapping>}`
- **States**: loading, success, error (invalid format, too large)

### Confirm Watchlist Import
- **Frontend**: Watchlist import confirmation dialog
- **Backend**: `POST /api/chat/confirm-watchlist`
- **Request**: `{import_id: string, column_mapping: object, watchlist_name: string}`
- **Response**: `{watchlist_id: string, imported_count: number, errors?: Array<string>}`
- **States**: loading, success, error (validation errors)

## Watchlists

### Get Watchlists
- **Frontend**: Watchlist tab, watchlist selector
- **Backend**: `GET /api/watchlists`
- **Response**: `{watchlists: Array<Watchlist>, total_count: number}`
- **States**: loading, success, error, empty

### Create Watchlist
- **Frontend**: New watchlist dialog
- **Backend**: `POST /api/watchlists`
- **Request**: `{name: string, description?: string, columns: Array<WatchlistColumn>}`
- **Response**: `Watchlist`
- **States**: loading, success, error (name exists)

### Get Watchlist Items
- **Frontend**: Watchlist entries table
- **Backend**: `GET /api/watchlists/{id}/items`
- **Query Params**: `columns?: string[], limit?: number, offset?: number`
- **Response**: `{items: Array<WatchlistItem>, total_count: number, columns_config: ColumnsConfig}`
- **States**: loading, success, error, empty

### Add Watchlist Item
- **Frontend**: Add entry dialog
- **Backend**: `POST /api/watchlists/{id}/items`
- **Request**: `{ticker: string, data: object}`
- **Response**: `WatchlistItem`
- **States**: loading, success, error (invalid ticker, duplicate)

### Update Watchlist Settings
- **Frontend**: Watchlist settings modal
- **Backend**: `PUT /api/watchlists/{id}/settings`
- **Request**: `{columns: Array<WatchlistColumn>}`
- **Response**: `{columns_config: ColumnsConfig, updated_at: string}`
- **States**: loading, success, error (validation errors)

## Settings

### Get User Settings
- **Frontend**: Settings pane display
- **Backend**: `GET /api/settings/user`
- **Response**: `UserSettings`
- **States**: loading, success, error

### Update User Settings
- **Frontend**: Settings form
- **Backend**: `PUT /api/settings/user`
- **Request**: `{preferences: object, notifications: object}`
- **Response**: `UserSettings`
- **States**: loading, success, error (validation errors)

### Get API Keys Status
- **Frontend**: API keys section in settings
- **Backend**: `GET /api/settings/api-keys`
- **Response**: `{keys: object, status: object, last_sync: string}`
- **States**: loading, success, error

### Update API Key
- **Frontend**: API key input form
- **Backend**: `PUT /api/settings/api-keys/{service}`
- **Request**: `{api_key: string}`
- **Response**: `{status: string, message: string, tested_at: string}`
- **States**: loading, success, error (invalid key, service unavailable)

## Market Data

### Get Symbol Search
- **Frontend**: Symbol search input
- **Backend**: `GET /api/market/search`
- **Query Params**: `q: string, limit?: number`
- **Response**: `{symbols: Array<Symbol>, total_count: number}`
- **States**: loading, success, error, empty

### Get Market Data
- **Frontend**: Charts, price displays
- **Backend**: `GET /api/market/{symbol}/bars`
- **Query Params**: `timespan: string, multiplier: number, start_date: string, end_date: string`
- **Response**: `{bars: Array<Bar>, symbol: string, total_count: number}`
- **States**: loading, success, error (invalid symbol, no data)

## News

### Get News Feed
- **Frontend**: News pane, news alerts
- **Backend**: `GET /api/news`
- **Query Params**: `sources?: string[], tickers?: string[], limit?: number, offset?: number`
- **Response**: `{articles: Array<NewsArticle>, total_count: number, has_more: boolean}`
- **States**: loading, success, error, empty

### News Stream (SSE)
- **Frontend**: Real-time news updates
- **Backend**: `GET /api/news/stream`
- **Response**: Server-Sent Events stream
- **States**: connecting, connected, disconnected, error

## System

### Health Check
- **Frontend**: System status indicator
- **Backend**: `GET /api/health`
- **Response**: `{status: string, databases: object, services: object, version: string}`
- **States**: healthy, degraded, unhealthy

### Get System Status
- **Frontend**: Admin dashboard, system monitoring
- **Backend**: `GET /api/system/status`
- **Response**: `SystemStatusResponse`
- **States**: loading, success, error

## Error Envelope Format

All error responses follow this structure:
```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Human-readable error message",
  "details": {
    "field": "field_name",
    "validation": "specific_validation_rule",
    "provided_value": "what_was_provided"
  },
  "timestamp": "2025-01-15T10:30:00Z",
  "request_id": "req_abc123"
}
```

## Date Filter Contract

The header Date Filter affects:
- **Dashboard metrics**: All dashboard endpoints respect the global date filter
- **Calendar pane**: Displays P&L data within the selected date range
- **Performance charts**: Equity curve and P&L charts use the date filter

The header Date Filter does NOT affect:
- **AI chat queries**: Unless the user explicitly specifies a date range in their question
- **Real-time data**: Live positions, current account balances
- **Historical data requests**: When user explicitly specifies different dates

## Success Response Codes

- `200 OK`: Successful GET, PUT requests
- `201 Created`: Successful POST requests that create resources
- `204 No Content`: Successful DELETE requests
- `202 Accepted`: Async operations that are processing

## Error Response Codes

- `400 Bad Request`: Invalid request data, validation errors
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Resource already exists, business logic conflict
- `422 Unprocessable Entity`: Valid request format but business rule violation
- `429 Too Many Requests`: Rate limiting
- `500 Internal Server Error`: Server-side errors
- `503 Service Unavailable`: External service unavailable