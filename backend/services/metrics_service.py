"""
Dashboard Metrics Service
Calculates and returns comprehensive dashboard metrics with date filtering support
"""

import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, date, timedelta
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import DashboardMetricsResponse, TradeSource
import asyncio

logger = logging.getLogger(__name__)

class MetricsCalculator:
    """Core metrics calculation engine"""
    
    @staticmethod
    def calculate_win_rate_trades(trades: List[Dict[str, Any]]) -> float:
        """Calculate win rate by number of trades"""
        if not trades:
            return 0.0
        
        winning_trades = sum(1 for trade in trades if trade.get("pnl", 0) > 0)
        return (winning_trades / len(trades)) * 100
    
    @staticmethod
    def calculate_win_rate_days(daily_performance: List[Dict[str, Any]]) -> float:
        """Calculate win rate by profitable days"""
        if not daily_performance:
            return 0.0
        
        profitable_days = sum(1 for day in daily_performance if day.get("net_pnl", 0) > 0)
        return (profitable_days / len(daily_performance)) * 100
    
    @staticmethod
    def calculate_profit_factor(trades: List[Dict[str, Any]]) -> Optional[float]:
        """Calculate profit factor: sum(winning trades) / sum(losing trades)"""
        if not trades:
            return None
        
        gross_wins = sum(trade.get("pnl", 0) for trade in trades if trade.get("pnl", 0) > 0)
        gross_losses = abs(sum(trade.get("pnl", 0) for trade in trades if trade.get("pnl", 0) < 0))
        
        if gross_losses == 0:
            return None if gross_wins == 0 else float('inf')
        
        return gross_wins / gross_losses
    
    @staticmethod
    def calculate_avg_win_loss(trades: List[Dict[str, Any]]) -> Tuple[Optional[float], Optional[float]]:
        """Calculate average win and average loss"""
        if not trades:
            return None, None
        
        winning_trades = [trade.get("pnl", 0) for trade in trades if trade.get("pnl", 0) > 0]
        losing_trades = [trade.get("pnl", 0) for trade in trades if trade.get("pnl", 0) < 0]
        
        avg_win = sum(winning_trades) / len(winning_trades) if winning_trades else None
        avg_loss = abs(sum(losing_trades) / len(losing_trades)) if losing_trades else None
        
        return avg_win, avg_loss
    
    @staticmethod
    def calculate_total_return(initial_capital: float, final_equity: float) -> float:
        """Calculate total return percentage"""
        if initial_capital == 0:
            return 0.0
        return ((final_equity - initial_capital) / initial_capital) * 100

class DashboardMetricsService:
    """Service for calculating and serving dashboard metrics"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.calculator = MetricsCalculator()
    
    async def get_dashboard_metrics(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        source_filter: Optional[str] = None
    ) -> DashboardMetricsResponse:
        """
        Calculate comprehensive dashboard metrics for the specified period
        
        Args:
            user_id: User identifier
            start_date: Start date for metrics (inclusive)
            end_date: End date for metrics (inclusive)
            source_filter: Filter by trade source (backtest/live)
        
        Returns:
            DashboardMetricsResponse with all calculated metrics
        """
        
        # Set default date range if not provided
        if not start_date or not end_date:
            end_date = date.today()
            start_date = end_date - timedelta(days=365)  # Default to 1 year
        
        logger.info(f"Calculating dashboard metrics for user {user_id} from {start_date} to {end_date}")
        
        try:
            # Build query filters
            trade_filter = {
                "user_id": user_id,
                "entry_time": {
                    "$gte": datetime.combine(start_date, datetime.min.time()),
                    "$lte": datetime.combine(end_date, datetime.max.time())
                }
            }
            
            daily_filter = {
                "user_id": user_id,
                "date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
            
            # Apply source filter if specified
            if source_filter:
                trade_filter["source"] = source_filter
                daily_filter["source"] = source_filter
            
            # Fetch data from MongoDB
            trades_cursor = self.db.trades.find(trade_filter)
            daily_cursor = self.db.daily_performance.find(daily_filter)
            
            trades = await trades_cursor.to_list(length=None)
            daily_performance = await daily_cursor.to_list(length=None)
            
            # Calculate metrics
            metrics = await self._calculate_all_metrics(
                trades, daily_performance, start_date, end_date, source_filter
            )
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating dashboard metrics: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error calculating metrics: {str(e)}"
            )
    
    async def _calculate_all_metrics(
        self,
        trades: List[Dict[str, Any]],
        daily_performance: List[Dict[str, Any]],
        start_date: date,
        end_date: date,
        source_filter: Optional[str]
    ) -> DashboardMetricsResponse:
        """Calculate all dashboard metrics from raw data"""
        
        # Basic counts
        total_trades = len(trades)
        total_days = (end_date - start_date).days + 1
        trading_days = len(daily_performance)
        
        # Performance calculations
        win_rate_trades = self.calculator.calculate_win_rate_trades(trades)
        win_rate_days = self.calculator.calculate_win_rate_days(daily_performance) if daily_performance else None
        profit_factor = self.calculator.calculate_profit_factor(trades)
        avg_win, avg_loss = self.calculator.calculate_avg_win_loss(trades)
        
        # P&L calculations
        total_pnl = sum(trade.get("pnl", 0) for trade in trades)
        
        # Equity curve calculation
        equity_curve = await self._calculate_equity_curve(daily_performance, start_date)
        
        # Daily P&L series
        daily_pnl = await self._format_daily_pnl(daily_performance)
        
        # Total return calculation
        initial_equity = equity_curve[0]["equity"] if equity_curve else 100000.0  # Default starting capital
        final_equity = equity_curve[-1]["equity"] if equity_curve else initial_equity + total_pnl
        total_return = self.calculator.calculate_total_return(initial_equity, final_equity)
        
        return DashboardMetricsResponse(
            total_trades=total_trades,
            win_rate_trades=win_rate_trades,
            win_rate_days=win_rate_days,
            profit_factor=profit_factor,
            avg_win=avg_win,
            avg_loss=avg_loss,
            total_pnl=total_pnl,
            total_return=total_return,
            daily_pnl=daily_pnl,
            equity_curve=equity_curve,
            start_date=start_date,
            end_date=end_date,
            total_days=total_days,
            trading_days=trading_days,
            source_filter=source_filter
        )
    
    async def _calculate_equity_curve(
        self, 
        daily_performance: List[Dict[str, Any]], 
        start_date: date,
        initial_capital: float = 100000.0
    ) -> List[Dict[str, Any]]:
        """Calculate equity curve from daily performance data"""
        
        if not daily_performance:
            return [{"date": start_date.isoformat(), "equity": initial_capital, "drawdown": 0.0}]
        
        # Sort by date
        sorted_performance = sorted(daily_performance, key=lambda x: x["date"])
        
        equity_curve = []
        current_equity = initial_capital
        peak_equity = initial_capital
        
        for day_data in sorted_performance:
            daily_pnl = day_data.get("net_pnl", 0)
            current_equity += daily_pnl
            
            # Update peak for drawdown calculation
            if current_equity > peak_equity:
                peak_equity = current_equity
            
            # Calculate drawdown
            drawdown = ((current_equity - peak_equity) / peak_equity) * 100 if peak_equity > 0 else 0.0
            
            equity_curve.append({
                "date": day_data["date"].isoformat() if isinstance(day_data["date"], date) else day_data["date"],
                "equity": current_equity,
                "drawdown": drawdown,
                "daily_pnl": daily_pnl,
                "trades": day_data.get("trades_count", 0)
            })
        
        return equity_curve
    
    async def _format_daily_pnl(self, daily_performance: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format daily P&L data for frontend consumption"""
        
        formatted_data = []
        
        for day_data in daily_performance:
            formatted_data.append({
                "date": day_data["date"].isoformat() if isinstance(day_data["date"], date) else day_data["date"],
                "pnl": day_data.get("net_pnl", 0),
                "trades": day_data.get("trades_count", 0),
                "return_percent": day_data.get("return_percent", 0),
                "return_r": day_data.get("return_r", 0)
            })
        
        # Sort by date
        formatted_data.sort(key=lambda x: x["date"])
        
        return formatted_data
    
    async def get_daily_pnl_series(
        self,
        user_id: str,
        start_date: date,
        end_date: date,
        mode: str = "dollar"  # dollar, runit, percentage
    ) -> Dict[str, Any]:
        """Get daily P&L series for calendar and charts"""
        
        try:
            daily_filter = {
                "user_id": user_id,
                "date": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
            
            cursor = self.db.daily_performance.find(daily_filter)
            daily_performance = await cursor.to_list(length=None)
            
            # Format data based on mode
            data = []
            for day_data in daily_performance:
                if mode == "dollar":
                    pnl_value = day_data.get("net_pnl", 0)
                elif mode == "runit":
                    pnl_value = day_data.get("return_r", 0)
                else:  # percentage
                    pnl_value = day_data.get("return_percent", 0)
                
                data.append({
                    "date": day_data["date"].isoformat() if isinstance(day_data["date"], date) else day_data["date"],
                    "pnl": pnl_value,
                    "trades": day_data.get("trades_count", 0)
                })
            
            return {
                "data": sorted(data, key=lambda x: x["date"]),
                "total_days": len(data),
                "mode": mode
            }
            
        except Exception as e:
            logger.error(f"Error fetching daily P&L series: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching daily P&L: {str(e)}"
            )
    
    async def create_sample_data(self, user_id: str):
        """Create sample trading data for testing (development only)"""
        
        logger.info(f"Creating sample data for user {user_id}")
        
        # Sample trades
        sample_trades = []
        sample_daily = []
        
        current_date = date.today() - timedelta(days=30)
        current_equity = 100000.0
        
        for i in range(30):
            # Generate 1-3 trades per day
            daily_trades = []
            daily_pnl = 0.0
            trades_count = min(3, max(0, int((i % 5) > 0)))  # Some days have no trades
            
            for j in range(trades_count):
                # Random trade
                is_winner = (i * j + j) % 3 != 0  # Roughly 67% win rate
                pnl = (200 + (i * 10) + (j * 50)) * (1 if is_winner else -0.7)
                
                trade = {
                    "id": f"sample_trade_{i}_{j}",
                    "user_id": user_id,
                    "symbol": ["AAPL", "GOOGL", "MSFT", "TSLA"][j % 4],
                    "side": "long",
                    "quantity": 100,
                    "entry_price": 150.0 + i,
                    "exit_price": 150.0 + i + (pnl / 100),
                    "entry_time": datetime.combine(current_date, datetime.min.time()),
                    "exit_time": datetime.combine(current_date, datetime.max.time()),
                    "pnl": pnl,
                    "pnl_percent": (pnl / (150.0 + i)) * 100,
                    "commission": 1.0,
                    "source": "backtest"
                }
                
                daily_trades.append(trade)
                daily_pnl += pnl
            
            # Daily performance record
            if trades_count > 0:
                current_equity += daily_pnl
                winning_trades = sum(1 for t in daily_trades if t["pnl"] > 0)
                
                daily_record = {
                    "id": f"sample_daily_{i}",
                    "user_id": user_id,
                    "date": current_date,
                    "trades_count": trades_count,
                    "winning_trades": winning_trades,
                    "losing_trades": trades_count - winning_trades,
                    "gross_pnl": daily_pnl,
                    "net_pnl": daily_pnl - (trades_count * 1.0),  # Subtract commissions
                    "return_percent": (daily_pnl / current_equity) * 100,
                    "return_r": daily_pnl / 200.0,  # Assume $200 risk per R
                    "ending_equity": current_equity,
                    "source": "backtest"
                }
                
                sample_daily.append(daily_record)
                sample_trades.extend(daily_trades)
            
            current_date += timedelta(days=1)
        
        # Insert sample data
        if sample_trades:
            await self.db.trades.insert_many(sample_trades)
        if sample_daily:
            await self.db.daily_performance.insert_many(sample_daily)
        
        logger.info(f"Created {len(sample_trades)} sample trades and {len(sample_daily)} daily records")
        
        return {
            "trades_created": len(sample_trades),
            "daily_records_created": len(sample_daily),
            "date_range": {
                "start": (date.today() - timedelta(days=30)).isoformat(),
                "end": date.today().isoformat()
            }
        }

# Global service instance
metrics_service = None

def get_metrics_service(db: AsyncIOMotorDatabase) -> DashboardMetricsService:
    """Get or create metrics service instance"""
    global metrics_service
    if metrics_service is None:
        metrics_service = DashboardMetricsService(db)
    return metrics_service