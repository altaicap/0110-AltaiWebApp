# Backtest System Documentation

Comprehensive documentation for the Altai Trader backtesting engine, including API contracts, execution flow, and result analysis.

## Overview

The backtesting system provides comprehensive strategy testing capabilities with:
- Asynchronous execution for long-running backtests
- Detailed trade-by-trade analysis
- Equity curve generation with drawdown tracking
- Statistical analysis and performance metrics
- Result storage and retrieval

## API Endpoints

### Start Backtest
**Endpoint**: `POST /api/backtests/run`

**Request Body**:
```json
{
  "strategy_name": "Moving Average Crossover",
  "symbols": ["AAPL", "GOOGL", "MSFT"],
  "start_date": "2023-01-01",
  "end_date": "2024-01-01", 
  "initial_capital": 100000.0,
  "commission": 1.0,
  "slippage": 0.01,
  "timeframe": "1D",
  "parameters": {
    "fast_ma": 10,
    "slow_ma": 20,
    "position_size": 0.05
  }
}
```

**Response**:
```json
{
  "id": "bt_abc123def456",
  "status": "started",
  "message": "Backtest started successfully", 
  "estimated_duration": 30
}
```

### Get Backtest Status
**Endpoint**: `GET /api/backtests/{backtest_id}`

**Response**:
```json
{
  "id": "bt_abc123def456",
  "name": "Moving Average Crossover",
  "status": "running",
  "progress": 0.65,
  "started_at": "2024-01-15T10:30:00Z",
  "completed_at": null,
  "error_message": null
}
```

**Status Values**:
- `pending` - Backtest queued for execution
- `running` - Currently executing
- `completed` - Finished successfully
- `error` - Failed with error
- `cancelled` - Cancelled by user

### Get Backtest Results
**Endpoint**: `GET /api/backtests/{backtest_id}/results`

**Response**: See [BacktestResultsResponse](#backtestresultsresponse) below

### List Backtests
**Endpoint**: `GET /api/backtests?limit=20&offset=0&status=completed`

**Response**:
```json
{
  "backtests": [
    {
      "id": "bt_abc123def456",
      "name": "Moving Average Crossover",
      "status": "completed",
      "symbols": ["AAPL", "GOOGL"],
      "start_date": "2023-01-01",
      "end_date": "2024-01-01",
      "total_trades": 156,
      "total_return": 15.67,
      "win_rate": 58.33,
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:32:45Z"
    }
  ],
  "total_count": 45,
  "has_more": true
}
```

## Data Models

### BacktestResultsResponse

Complete results structure returned by `/api/backtests/{id}/results`:

```json
{
  "backtest_id": "bt_abc123def456",
  "name": "Moving Average Crossover",
  "status": "completed",
  "symbols": ["AAPL", "GOOGL", "MSFT"],
  "start_date": "2023-01-01",
  "end_date": "2024-01-01",
  "initial_capital": 100000.0,
  
  "total_trades": 156,
  "win_rate": 58.33,
  "profit_factor": 1.85,
  "total_return": 15.67,
  "cagr": 14.89,
  "max_drawdown": 8.45,
  "sharpe_ratio": 1.23,
  
  "avg_win": 287.50,
  "avg_loss": 162.30,
  "largest_win": 1250.00,
  "largest_loss": 875.00,
  
  "equity_curve": [
    {
      "date": "2023-01-03",
      "equity": 100450.00,
      "drawdown": 0.00
    },
    {
      "date": "2023-01-04", 
      "equity": 100320.00,
      "drawdown": 0.13
    }
  ],
  
  "trades": [
    {
      "id": "trade_001",
      "symbol": "AAPL",
      "side": "long",
      "quantity": 100,
      "entry_price": 150.25,
      "exit_price": 153.75,
      "entry_time": "2023-01-03T09:30:00Z",
      "exit_time": "2023-01-03T15:45:00Z",
      "pnl": 350.00,
      "pnl_percent": 2.33,
      "commission": 1.00
    }
  ],
  
  "completed_at": "2024-01-15T10:32:45Z"
}
```

### Trade Record Schema

Each trade in the results contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique trade identifier |
| `symbol` | string | Trading symbol (e.g., "AAPL") |
| `side` | string | Position side ("long" or "short") |
| `quantity` | number | Number of shares/units |
| `entry_price` | number | Entry execution price |
| `exit_price` | number | Exit execution price |
| `entry_time` | string | Entry timestamp (ISO 8601) |
| `exit_time` | string | Exit timestamp (ISO 8601) |
| `pnl` | number | Profit/Loss in dollars |
| `pnl_percent` | number | P&L as percentage of position value |
| `commission` | number | Commission paid |

### Equity Curve Points

Each equity curve point contains:

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Date (YYYY-MM-DD) |
| `equity` | number | Account equity at end of day |
| `drawdown` | number | Drawdown percentage from peak |

## Execution Flow

### 1. Backtest Initialization
```python
# Create backtest record in database
backtest_record = {
    "id": generate_uuid(),
    "user_id": current_user["user_id"],
    "status": "running", 
    "progress": 0.0,
    "started_at": datetime.utcnow(),
    # ... configuration fields
}
```

### 2. Asynchronous Execution
```python
# Background task processes the backtest
async def execute_backtest(backtest_id, config):
    try:
        # Update progress: Data loading
        await update_progress(backtest_id, 0.1, "Loading market data")
        
        # Load historical data for symbols and date range
        market_data = await load_market_data(config)
        
        # Update progress: Strategy execution
        await update_progress(backtest_id, 0.3, "Running strategy")
        
        # Execute strategy logic
        trades = await execute_strategy(market_data, config)
        
        # Update progress: Analysis
        await update_progress(backtest_id, 0.8, "Calculating statistics")
        
        # Calculate comprehensive statistics
        stats = await calculate_statistics(trades, config)
        
        # Update progress: Complete
        await update_progress(backtest_id, 1.0, "Completed")
        
        # Store results
        await store_results(backtest_id, trades, stats)
        
    except Exception as e:
        await mark_backtest_error(backtest_id, str(e))
```

### 3. Strategy Simulation

The current implementation generates realistic sample data. In production, this would execute actual strategy logic:

```python
async def simulate_strategy(config):
    """
    Placeholder for actual strategy execution
    
    Production implementation would:
    1. Load market data from Polygon API
    2. Execute user's strategy code
    3. Generate real trading signals
    4. Simulate order execution with slippage/commission
    """
    
    # Generate sample trades with realistic characteristics
    trades = []
    current_equity = config["initial_capital"]
    
    for trading_day in date_range:
        # Strategy logic would generate signals here
        signals = generate_strategy_signals(trading_day, config)
        
        for signal in signals:
            trade = execute_simulated_trade(signal, current_equity, config)
            trades.append(trade)
            current_equity += trade["pnl"]
    
    return trades
```

## Performance Statistics

### Key Metrics Calculated

| Metric | Formula | Description |
|--------|---------|-------------|
| **Total Trades** | Count(all trades) | Number of completed trades |
| **Win Rate** | Winners / Total × 100 | Percentage of profitable trades |
| **Profit Factor** | Gross Wins / Gross Losses | Ratio of total profits to losses |
| **Total Return** | (Final - Initial) / Initial × 100 | Overall percentage return |
| **CAGR** | (Final/Initial)^(1/Years) - 1 | Compound annual growth rate |
| **Max Drawdown** | Max((Peak - Trough) / Peak) | Largest peak-to-trough decline |
| **Sharpe Ratio** | (Return - RiskFree) / StdDev | Risk-adjusted return measure |
| **Average Win** | Sum(Winners) / Count(Winners) | Average profitable trade |
| **Average Loss** | Sum(Losers) / Count(Losers) | Average losing trade |

### Statistical Analysis
```python
def calculate_comprehensive_statistics(trades, config):
    """Calculate all performance metrics for backtest results"""
    
    if not trades:
        return default_empty_stats()
    
    # Basic counts and ratios
    total_trades = len(trades)
    winners = [t for t in trades if t["pnl"] > 0]
    losers = [t for t in trades if t["pnl"] < 0]
    
    win_rate = (len(winners) / total_trades) * 100
    
    # Profit factor
    gross_wins = sum(t["pnl"] for t in winners)
    gross_losses = abs(sum(t["pnl"] for t in losers))
    profit_factor = gross_wins / gross_losses if gross_losses > 0 else None
    
    # Return calculations
    total_pnl = sum(t["pnl"] for t in trades)
    total_return = (total_pnl / config["initial_capital"]) * 100
    
    # Time-based calculations
    days_elapsed = (config["end_date"] - config["start_date"]).days
    years = days_elapsed / 365.25
    cagr = ((config["initial_capital"] + total_pnl) / config["initial_capital"]) ** (1/years) - 1
    
    # Drawdown analysis
    equity_curve = build_equity_curve(trades, config["initial_capital"])
    max_drawdown = calculate_max_drawdown(equity_curve)
    
    # Risk metrics
    daily_returns = calculate_daily_returns(equity_curve)
    sharpe_ratio = calculate_sharpe_ratio(daily_returns)
    
    return {
        "total_trades": total_trades,
        "win_rate": round(win_rate, 2),
        "profit_factor": round(profit_factor, 2) if profit_factor else None,
        "total_return": round(total_return, 2),
        "cagr": round(cagr * 100, 2),
        "max_drawdown": round(max_drawdown, 2),
        "sharpe_ratio": round(sharpe_ratio, 2) if sharpe_ratio else None,
        # ... additional metrics
    }
```

## Error Handling

### Common Error Types

| Error Type | Cause | Resolution |
|------------|-------|-----------|
| `INVALID_SYMBOLS` | Unknown or delisted symbols | Validate symbols before execution |
| `INSUFFICIENT_DATA` | Not enough historical data | Extend date range or change timeframe |
| `STRATEGY_ERROR` | Error in strategy logic | Debug strategy code |
| `TIMEOUT` | Execution exceeded time limit | Optimize strategy or reduce scope |
| `MEMORY_ERROR` | Out of memory | Reduce date range or symbols |

### Error Response Format
```json
{
  "error_code": "INSUFFICIENT_DATA",
  "message": "Insufficient market data for NEWSTOCK from 2023-01-01 to 2024-01-01",
  "details": {
    "symbol": "NEWSTOCK",
    "requested_start": "2023-01-01",
    "available_start": "2023-06-15",
    "data_points": 120
  },
  "timestamp": "2024-01-15T10:45:00Z",
  "backtest_id": "bt_abc123def456"
}
```

## Configuration Parameters

### Required Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `strategy_name` | string | Name for the backtest | "MA Crossover" |
| `symbols` | array | List of symbols to test | ["AAPL", "GOOGL"] |
| `start_date` | date | Backtest start date | "2023-01-01" |
| `end_date` | date | Backtest end date | "2024-01-01" |

### Optional Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `initial_capital` | number | 100000.0 | Starting capital |
| `commission` | number | 1.0 | Commission per trade |
| `slippage` | number | 0.01 | Slippage percentage |
| `timeframe` | string | "1D" | Data timeframe |
| `parameters` | object | {} | Strategy-specific parameters |

### Strategy Parameters Example
```json
{
  "parameters": {
    "moving_average_fast": 10,
    "moving_average_slow": 20,
    "position_size_percent": 0.05,
    "stop_loss_percent": 0.02,
    "take_profit_percent": 0.04,
    "max_positions": 5,
    "rebalance_frequency": "weekly"
  }
}
```

## Performance Considerations

### Execution Time Estimates
- **Simple strategies** (1 symbol, 1 year): 5-15 seconds
- **Medium complexity** (5 symbols, 2 years): 30-60 seconds  
- **Complex strategies** (20 symbols, 5 years): 2-5 minutes

### Memory Usage
- **Trade storage**: ~500 bytes per trade
- **Market data**: ~50MB per symbol per year (1-minute bars)
- **Equity curve**: ~10KB per year of data

### Optimization Tips
1. **Limit symbols**: Start with 1-5 symbols for testing
2. **Shorter periods**: Use 1-2 years for initial development
3. **Coarser timeframes**: Use daily bars instead of minute bars
4. **Efficient strategies**: Minimize indicator calculations
5. **Progress monitoring**: Check progress regularly for long backtests

## Data Storage

### Database Collections

#### `backtests`
Stores backtest configuration and results:
```javascript
{
  _id: ObjectId,
  id: "bt_uuid",
  user_id: "user_uuid", 
  name: "Strategy Name",
  symbols: ["AAPL", "GOOGL"],
  start_date: ISODate,
  end_date: ISODate,
  initial_capital: 100000.0,
  status: "completed",
  total_trades: 156,
  win_rate: 58.33,
  profit_factor: 1.85,
  // ... other metrics
  created_at: ISODate,
  completed_at: ISODate
}
```

#### `trades`  
Stores individual trade records:
```javascript
{
  _id: ObjectId,
  id: "trade_uuid",
  user_id: "user_uuid",
  backtest_id: "bt_uuid",
  symbol: "AAPL",
  side: "long",
  quantity: 100,
  entry_price: 150.25,
  exit_price: 153.75,
  pnl: 350.00,
  source: "backtest",
  created_at: ISODate
}
```

## Integration Points

### Market Data Integration
```python
# Future integration with Polygon.io
async def load_market_data(symbols, start_date, end_date, timeframe):
    """
    Load historical market data for backtesting
    
    Production implementation will:
    1. Query Polygon API for OHLCV data
    2. Handle rate limits and pagination
    3. Cache data for performance
    4. Validate data quality
    """
    pass
```

### Strategy Engine Integration
```python
# Future integration with user strategy code
async def execute_user_strategy(market_data, parameters):
    """
    Execute user-defined strategy logic
    
    Production implementation will:
    1. Load user's strategy code
    2. Provide safe execution environment
    3. Handle strategy errors gracefully
    4. Apply position sizing and risk management
    """
    pass
```

## Testing and Validation

### Unit Tests
- Metrics calculation accuracy
- Date handling and timezone issues  
- Edge cases (no trades, all winners, all losers)
- Performance with large datasets

### Integration Tests
- End-to-end backtest execution
- Database storage and retrieval
- Error handling and recovery
- Concurrent backtest execution

### Performance Tests
- Large backtests (10,000+ trades)
- Multiple concurrent users
- Memory usage under load
- Database query performance

This comprehensive backtesting system provides the foundation for sophisticated strategy development and analysis within the Altai Trader platform.