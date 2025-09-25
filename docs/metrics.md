# Dashboard Metrics Documentation

This document defines all metrics calculations used in the Altai Trader dashboard with precise formulas and examples.

## Core Performance Metrics

### Win Rate (by Trades)
**Formula**: `(Number of Winning Trades / Total Number of Trades) × 100`

**Example**:
- Total trades: 100
- Winning trades: 55
- Win Rate: `(55 / 100) × 100 = 55%`

**Implementation**:
```python
def calculate_win_rate_trades(trades):
    if not trades:
        return 0.0
    winning_trades = sum(1 for trade in trades if trade.pnl > 0)
    return (winning_trades / len(trades)) * 100
```

### Win Rate (by Days)
**Formula**: `(Number of Profitable Days / Total Trading Days) × 100`

**Definition**: A day is considered profitable if the total daily P&L > 0

**Example**:
- Total trading days: 30
- Profitable days: 18
- Daily Win Rate: `(18 / 30) × 100 = 60%`

**Implementation**:
```python
def calculate_win_rate_days(daily_performance):
    if not daily_performance:
        return 0.0
    profitable_days = sum(1 for day in daily_performance if day.net_pnl > 0)
    return (profitable_days / len(daily_performance)) * 100
```

### Profit Factor
**Formula**: `Sum(Gross Profits) / Sum(|Gross Losses|)`

**Definition**: Ratio of total winning trade profits to total losing trade losses

**Example**:
- Winning trades P&L: [+500, +300, +200] = +1000
- Losing trades P&L: [-200, -150, -100] = -450
- Profit Factor: `1000 / 450 = 2.22`

**Special Cases**:
- No losing trades: Returns `null` (infinite)
- No winning trades: Returns `0.0`
- No trades: Returns `null`

**Implementation**:
```python
def calculate_profit_factor(trades):
    if not trades:
        return None
    
    gross_wins = sum(trade.pnl for trade in trades if trade.pnl > 0)
    gross_losses = abs(sum(trade.pnl for trade in trades if trade.pnl < 0))
    
    if gross_losses == 0:
        return None if gross_wins == 0 else float('inf')
    
    return gross_wins / gross_losses
```

### Average Win
**Formula**: `Sum(Winning Trade P&Ls) / Count(Winning Trades)`

**Example**:
- Winning trades: [+500, +300, +200]
- Average Win: `(500 + 300 + 200) / 3 = $333.33`

### Average Loss
**Formula**: `|Sum(Losing Trade P&Ls)| / Count(Losing Trades)`

**Example**:
- Losing trades: [-200, -150, -100]
- Average Loss: `|(−200 + −150 + −100)| / 3 = $150.00`

### Total Return
**Formula**: `((Final Equity - Initial Capital) / Initial Capital) × 100`

**Example**:
- Initial Capital: $100,000
- Final Equity: $125,000
- Total Return: `((125,000 - 100,000) / 100,000) × 100 = 25%`

## Time-Based Calculations

### CAGR (Compound Annual Growth Rate)
**Formula**: `((Final Value / Initial Value)^(1/Years) - 1) × 100`

**Example**:
- Initial: $100,000
- Final: $150,000 (after 2 years)
- CAGR: `((150,000 / 100,000)^(1/2) - 1) × 100 = 22.47%`

**Implementation**:
```python
def calculate_cagr(initial_capital, final_value, days_elapsed):
    if days_elapsed <= 0 or initial_capital <= 0:
        return 0.0
    
    years = days_elapsed / 365.25
    if years <= 0:
        return 0.0
    
    return ((final_value / initial_capital) ** (1 / years) - 1) * 100
```

### Maximum Drawdown
**Formula**: `((Peak Equity - Trough Equity) / Peak Equity) × 100`

**Definition**: Largest peak-to-trough decline in equity curve

**Example**:
- Peak equity: $120,000
- Lowest point after peak: $95,000
- Max Drawdown: `((120,000 - 95,000) / 120,000) × 100 = 20.83%`

**Implementation**:
```python
def calculate_max_drawdown(equity_curve):
    if not equity_curve:
        return 0.0
    
    peak_equity = equity_curve[0]
    max_drawdown = 0.0
    
    for equity in equity_curve:
        if equity > peak_equity:
            peak_equity = equity
        
        drawdown = ((peak_equity - equity) / peak_equity) * 100
        max_drawdown = max(max_drawdown, drawdown)
    
    return max_drawdown
```

### Sharpe Ratio (Simplified)
**Formula**: `(Mean Daily Return / Standard Deviation of Daily Returns) × √252`

**Note**: Uses risk-free rate of 0 for simplification. √252 annualizes daily returns.

**Implementation**:
```python
def calculate_sharpe_ratio(daily_returns):
    if len(daily_returns) < 2:
        return None
    
    mean_return = np.mean(daily_returns)
    std_return = np.std(daily_returns)
    
    if std_return == 0:
        return None
    
    return (mean_return / std_return) * np.sqrt(252)
```

## R-Multiple Calculations

### R-Return (R-Multiple)
**Formula**: `Trade P&L / Risk Amount`

**Definition**: Measures profit/loss in terms of initial risk taken

**Example**:
- Trade P&L: +$400
- Risk (stop loss): $200
- R-Return: `400 / 200 = +2R`

**Daily R-Return**: `Sum(Daily Trade R-Returns)`

## Calendar Calculations

### Daily P&L Modes

#### Dollar Mode
**Formula**: `Net Daily P&L in USD`
- Direct sum of all trade P&Ls for the day
- Includes commissions and fees

#### R-Unit Mode  
**Formula**: `Daily P&L / Average Risk Per Trade`
- Normalizes P&L by risk taken
- Useful for comparing different position sizes

#### Percentage Mode
**Formula**: `(Daily P&L / Starting Equity for Day) × 100`
- Shows daily return as percentage of capital

## Equity Curve Construction

### Daily Equity Calculation
```python
def build_equity_curve(daily_performance, initial_capital):
    equity_curve = []
    current_equity = initial_capital
    peak_equity = initial_capital
    
    for day_data in sorted(daily_performance, key=lambda x: x.date):
        current_equity += day_data.net_pnl
        
        # Update peak for drawdown
        if current_equity > peak_equity:
            peak_equity = current_equity
        
        # Calculate drawdown
        drawdown = ((peak_equity - current_equity) / peak_equity) * 100
        
        equity_curve.append({
            "date": day_data.date,
            "equity": current_equity,
            "drawdown": drawdown,
            "daily_pnl": day_data.net_pnl
        })
    
    return equity_curve
```

## Data Source Filtering

### Trade Sources
- **Backtest**: Simulated trades from backtesting engine
- **Live**: Real trades executed through broker connections
- **Paper**: Paper trading (simulated with live data)

### Date Range Filtering
All calculations respect the date filter applied:
```python
def apply_date_filter(trades, start_date, end_date):
    return [
        trade for trade in trades 
        if start_date <= trade.entry_time.date() <= end_date
    ]
```

## Validation Rules

### Data Quality Checks
1. **Trade Validation**:
   - Entry time < Exit time (for closed trades)
   - Positive quantity
   - Valid symbol format
   - Reasonable price values

2. **P&L Validation**:
   - P&L = (Exit Price - Entry Price) × Quantity × Side Multiplier
   - Commission and slippage properly subtracted

3. **Date Validation**:
   - No future dates
   - Entry/exit times within market hours (optional)
   - Consistent timezone handling

## Performance Benchmarks

### Calculation Performance
- Dashboard metrics calculation: < 100ms for 10,000 trades
- Daily P&L series: < 50ms for 1 year of data
- Equity curve generation: < 200ms for 10,000 data points

### Memory Usage
- Trade data cached in MongoDB for fast retrieval
- Equity curves calculated on-demand
- Metrics cached for 5 minutes to improve response times

## API Response Format

### DashboardMetricsResponse
```json
{
  "total_trades": 156,
  "win_rate_trades": 58.97,
  "win_rate_days": 63.33,
  "profit_factor": 1.85,
  "avg_win": 287.50,
  "avg_loss": 162.30,
  "total_pnl": 12750.00,
  "total_return": 12.75,
  "daily_pnl": [
    {
      "date": "2024-01-15",
      "pnl": 450.00,
      "trades": 3,
      "return_percent": 0.45
    }
  ],
  "equity_curve": [
    {
      "date": "2024-01-15", 
      "equity": 100450.00,
      "drawdown": 0.00
    }
  ],
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "trading_days": 30
}
```

## Example Calculations

### Complete Example
Given these trades over 5 days:

| Date | Symbol | P&L | 
|------|--------|-----|
| 2024-01-01 | AAPL | +300 |
| 2024-01-01 | GOOGL | -150 |
| 2024-01-02 | MSFT | +200 |
| 2024-01-03 | TSLA | -100 |
| 2024-01-03 | AAPL | +400 |

**Calculations**:
- Total Trades: 5
- Win Rate (Trades): `(3 winning / 5 total) × 100 = 60%`
- Win Rate (Days): `(3 profitable days / 3 trading days) × 100 = 100%`
- Profit Factor: `(300 + 200 + 400) / (150 + 100) = 900 / 250 = 3.6`
- Average Win: `(300 + 200 + 400) / 3 = $300`
- Average Loss: `(150 + 100) / 2 = $125`
- Total P&L: `300 - 150 + 200 - 100 + 400 = $650`

This comprehensive calculation engine ensures accurate and consistent performance metrics across the entire Altai Trader platform.