"""
Comprehensive Backtest Engine
Handles strategy backtesting with equity curves, statistics, and trade analysis
"""

import asyncio
import logging
import pandas as pd
import numpy as np
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from models import BacktestModel, BacktestResultsResponse, TradeModel, DailyPerformanceModel
import uuid
import json

logger = logging.getLogger(__name__)

class BacktestEngine:
    """Core backtesting engine with comprehensive analytics"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
    async def run_backtest(
        self,
        user_id: str,
        backtest_config: Dict[str, Any]
    ) -> str:
        """
        Start a new backtest with the given configuration
        
        Returns:
            backtest_id: Unique identifier for tracking the backtest
        """
        
        # Create backtest record
        backtest_id = str(uuid.uuid4())
        
        backtest_record = {
            "id": backtest_id,
            "user_id": user_id,
            "strategy_id": backtest_config.get("strategy_id", "default"),
            "name": backtest_config.get("name", f"Backtest {datetime.now().strftime('%Y-%m-%d %H:%M')}"),
            "symbols": backtest_config.get("symbols", ["AAPL"]),
            "start_date": backtest_config["start_date"],
            "end_date": backtest_config["end_date"],
            "initial_capital": backtest_config.get("initial_capital", 100000.0),
            "commission": backtest_config.get("commission", 1.0),
            "slippage": backtest_config.get("slippage", 0.01),
            "timeframe": backtest_config.get("timeframe", "1D"),
            "parameters": backtest_config.get("parameters", {}),
            "status": "running",
            "progress": 0.0,
            "started_at": datetime.utcnow(),
            "created_at": datetime.utcnow()
        }
        
        # Store backtest record
        await self.db.backtests.insert_one(backtest_record)
        
        # Start backtest execution in background
        asyncio.create_task(self._execute_backtest(backtest_id, backtest_config))
        
        return backtest_id
    
    async def _execute_backtest(
        self, 
        backtest_id: str, 
        config: Dict[str, Any]
    ):
        """Execute the backtest logic"""
        
        try:
            # Update status to running
            await self.db.backtests.update_one(
                {"id": backtest_id},
                {"$set": {"status": "running", "progress": 0.1}}
            )
            
            # Generate sample backtest data (in production, this would use real strategy logic)
            trades, equity_curve, stats = await self._simulate_strategy(config, backtest_id)
            
            # Update progress
            await self.db.backtests.update_one(
                {"id": backtest_id},
                {"$set": {"progress": 0.8}}
            )
            
            # Store trades in database
            if trades:
                await self.db.trades.insert_many(trades)
            
            # Calculate final statistics
            final_stats = await self._calculate_backtest_statistics(trades, config)
            
            # Update backtest with results
            await self.db.backtests.update_one(
                {"id": backtest_id},
                {"$set": {
                    "status": "completed",
                    "progress": 1.0,
                    "completed_at": datetime.utcnow(),
                    "total_trades": final_stats["total_trades"],
                    "win_rate": final_stats["win_rate"], 
                    "profit_factor": final_stats["profit_factor"],
                    "total_return": final_stats["total_return"],
                    "max_drawdown": final_stats["max_drawdown"],
                    "sharpe_ratio": final_stats.get("sharpe_ratio")
                }}
            )
            
            logger.info(f"Backtest {backtest_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Backtest {backtest_id} failed: {str(e)}")
            
            # Update status to error
            await self.db.backtests.update_one(
                {"id": backtest_id},
                {"$set": {
                    "status": "error",
                    "error_message": str(e),
                    "completed_at": datetime.utcnow()
                }}
            )
    
    async def _simulate_strategy(
        self, 
        config: Dict[str, Any], 
        backtest_id: str
    ) -> Tuple[List[Dict], List[Dict], Dict]:
        """
        Simulate a trading strategy (placeholder for real strategy execution)
        
        In production, this would:
        1. Load market data for the symbols and date range
        2. Execute the actual trading strategy logic
        3. Generate real trades based on strategy signals
        
        For now, we'll generate realistic sample data
        """
        
        start_date = config["start_date"]
        end_date = config["end_date"] 
        initial_capital = config.get("initial_capital", 100000.0)
        symbols = config.get("symbols", ["AAPL"])
        user_id = config.get("user_id")
        
        # Convert dates if they're strings
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date).date()
        if isinstance(end_date, str):
            end_date = datetime.fromisoformat(end_date).date()
        
        # Generate sample trades
        trades = []
        equity_curve = []
        current_equity = initial_capital
        current_date = start_date
        
        trade_count = 0
        
        while current_date <= end_date:
            # Skip weekends
            if current_date.weekday() < 5:  # Monday = 0, Friday = 4
                
                # Generate 0-2 trades per day
                daily_trades = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
                
                daily_pnl = 0
                
                for _ in range(daily_trades):
                    trade_count += 1
                    
                    # Random symbol selection
                    symbol = np.random.choice(symbols)
                    
                    # Generate realistic trade
                    is_winner = np.random.random() < 0.55  # 55% win rate
                    
                    if is_winner:
                        pnl = np.random.normal(300, 100)  # Average win $300 ± $100
                    else:
                        pnl = -np.random.normal(180, 60)  # Average loss $180 ± $60
                    
                    # Entry and exit prices (simplified)
                    entry_price = 150 + np.random.normal(0, 20)
                    exit_price = entry_price + (pnl / 100)  # Assuming 100 shares
                    
                    # Create trade record
                    trade = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "backtest_id": backtest_id,
                        "symbol": symbol,
                        "side": "long",
                        "quantity": 100,
                        "entry_price": round(entry_price, 2),
                        "exit_price": round(exit_price, 2),
                        "entry_time": datetime.combine(current_date, datetime.min.time()),
                        "exit_time": datetime.combine(current_date, datetime.max.time()),
                        "pnl": round(pnl, 2),
                        "pnl_percent": round((pnl / (entry_price * 100)) * 100, 2),
                        "commission": config.get("commission", 1.0),
                        "source": "backtest",
                        "created_at": datetime.utcnow()
                    }
                    
                    trades.append(trade)
                    daily_pnl += pnl
                
                # Update equity
                current_equity += daily_pnl
                
                # Record equity curve point
                equity_curve.append({
                    "date": current_date.isoformat(),
                    "equity": round(current_equity, 2),
                    "daily_pnl": round(daily_pnl, 2),
                    "trades": daily_trades
                })
            
            current_date += timedelta(days=1)
        
        # Calculate basic statistics
        stats = {
            "total_trades": len(trades),
            "final_equity": current_equity,
            "total_return": ((current_equity - initial_capital) / initial_capital) * 100
        }
        
        return trades, equity_curve, stats
    
    async def _calculate_backtest_statistics(
        self, 
        trades: List[Dict], 
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate comprehensive backtest statistics"""
        
        if not trades:
            return {
                "total_trades": 0,
                "win_rate": 0.0,
                "profit_factor": None,
                "total_return": 0.0,
                "max_drawdown": 0.0,
                "avg_win": None,
                "avg_loss": None,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "sharpe_ratio": None
            }
        
        # Extract P&L values
        pnls = [trade["pnl"] for trade in trades]
        winning_trades = [pnl for pnl in pnls if pnl > 0]
        losing_trades = [pnl for pnl in pnls if pnl < 0]
        
        # Basic statistics
        total_trades = len(trades)
        win_rate = (len(winning_trades) / total_trades) * 100 if total_trades > 0 else 0
        
        # Profit factor
        gross_wins = sum(winning_trades) if winning_trades else 0
        gross_losses = abs(sum(losing_trades)) if losing_trades else 0
        profit_factor = gross_wins / gross_losses if gross_losses > 0 else None
        
        # Average win/loss
        avg_win = np.mean(winning_trades) if winning_trades else None
        avg_loss = abs(np.mean(losing_trades)) if losing_trades else None
        
        # Largest win/loss
        largest_win = max(pnls) if pnls else 0
        largest_loss = abs(min(pnls)) if pnls else 0
        
        # Total return
        initial_capital = config.get("initial_capital", 100000.0)
        total_pnl = sum(pnls)
        total_return = (total_pnl / initial_capital) * 100
        
        # Calculate drawdown (simplified)
        equity_curve = []
        current_equity = initial_capital
        peak_equity = initial_capital
        max_drawdown = 0
        
        for trade in trades:
            current_equity += trade["pnl"]
            if current_equity > peak_equity:
                peak_equity = current_equity
            
            drawdown = ((peak_equity - current_equity) / peak_equity) * 100
            max_drawdown = max(max_drawdown, drawdown)
        
        # Sharpe ratio (simplified calculation)
        if len(pnls) > 1:
            daily_returns = pd.Series(pnls)
            if daily_returns.std() > 0:
                sharpe_ratio = (daily_returns.mean() / daily_returns.std()) * np.sqrt(252)  # Annualized
            else:
                sharpe_ratio = None
        else:
            sharpe_ratio = None
        
        # CAGR calculation
        days_elapsed = (config["end_date"] - config["start_date"]).days
        if days_elapsed > 0:
            years = days_elapsed / 365.25
            final_value = initial_capital + total_pnl
            cagr = ((final_value / initial_capital) ** (1 / years) - 1) * 100 if years > 0 else 0
        else:
            cagr = 0
        
        return {
            "total_trades": total_trades,
            "win_rate": round(win_rate, 2),
            "profit_factor": round(profit_factor, 2) if profit_factor else None,
            "total_return": round(total_return, 2),
            "cagr": round(cagr, 2),
            "max_drawdown": round(max_drawdown, 2),
            "avg_win": round(avg_win, 2) if avg_win else None,
            "avg_loss": round(avg_loss, 2) if avg_loss else None,
            "largest_win": round(largest_win, 2),
            "largest_loss": round(largest_loss, 2),
            "sharpe_ratio": round(sharpe_ratio, 2) if sharpe_ratio else None
        }
    
    async def get_backtest_status(self, backtest_id: str, user_id: str) -> Dict[str, Any]:
        """Get backtest status and progress"""
        
        backtest = await self.db.backtests.find_one({
            "id": backtest_id,
            "user_id": user_id
        })
        
        if not backtest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backtest not found"
            )
        
        return {
            "id": backtest["id"],
            "name": backtest["name"],
            "status": backtest["status"],
            "progress": backtest["progress"],
            "started_at": backtest.get("started_at"),
            "completed_at": backtest.get("completed_at"),
            "error_message": backtest.get("error_message")
        }
    
    async def get_backtest_results(
        self, 
        backtest_id: str, 
        user_id: str
    ) -> BacktestResultsResponse:
        """Get comprehensive backtest results"""
        
        # Fetch backtest record
        backtest = await self.db.backtests.find_one({
            "id": backtest_id,
            "user_id": user_id
        })
        
        if not backtest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backtest not found"
            )
        
        if backtest["status"] != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Backtest not completed. Current status: {backtest['status']}"
            )
        
        # Fetch trades
        trades_cursor = self.db.trades.find({"backtest_id": backtest_id})
        trades = await trades_cursor.to_list(length=None)
        
        # Format trades for response
        formatted_trades = []
        for trade in trades:
            formatted_trades.append({
                "id": trade["id"],
                "symbol": trade["symbol"],
                "side": trade["side"],
                "quantity": trade["quantity"],
                "entry_price": trade["entry_price"],
                "exit_price": trade["exit_price"],
                "entry_time": trade["entry_time"].isoformat(),
                "exit_time": trade["exit_time"].isoformat(),
                "pnl": trade["pnl"],
                "pnl_percent": trade["pnl_percent"],
                "commission": trade.get("commission", 0)
            })
        
        # Generate equity curve
        equity_curve = await self._generate_equity_curve(trades, backtest["initial_capital"])
        
        # Recalculate statistics for response
        stats = await self._calculate_backtest_statistics(trades, backtest)
        
        return BacktestResultsResponse(
            backtest_id=backtest["id"],
            name=backtest["name"],
            status=backtest["status"],
            symbols=backtest["symbols"],
            start_date=backtest["start_date"],
            end_date=backtest["end_date"], 
            initial_capital=backtest["initial_capital"],
            total_trades=stats["total_trades"],
            win_rate=stats["win_rate"],
            profit_factor=stats["profit_factor"] or 0.0,
            total_return=stats["total_return"],
            cagr=stats["cagr"],
            max_drawdown=stats["max_drawdown"],
            sharpe_ratio=stats["sharpe_ratio"],
            equity_curve=equity_curve,
            trades=formatted_trades,
            avg_win=stats["avg_win"] or 0.0,
            avg_loss=stats["avg_loss"] or 0.0,
            largest_win=stats["largest_win"],
            largest_loss=stats["largest_loss"],
            completed_at=backtest.get("completed_at")
        )
    
    async def _generate_equity_curve(
        self, 
        trades: List[Dict], 
        initial_capital: float
    ) -> List[Dict[str, Any]]:
        """Generate equity curve from trades"""
        
        if not trades:
            return []
        
        # Sort trades by entry time
        sorted_trades = sorted(trades, key=lambda x: x["entry_time"])
        
        equity_curve = []
        current_equity = initial_capital
        peak_equity = initial_capital
        
        # Add starting point
        if sorted_trades:
            first_date = sorted_trades[0]["entry_time"].date()
            equity_curve.append({
                "date": first_date.isoformat(),
                "equity": initial_capital,
                "drawdown": 0.0
            })
        
        # Process trades
        for trade in sorted_trades:
            current_equity += trade["pnl"]
            
            # Update peak for drawdown calculation
            if current_equity > peak_equity:
                peak_equity = current_equity
            
            # Calculate drawdown percentage
            drawdown = ((peak_equity - current_equity) / peak_equity) * 100 if peak_equity > 0 else 0.0
            
            trade_date = trade["exit_time"].date()
            
            equity_curve.append({
                "date": trade_date.isoformat(),
                "equity": round(current_equity, 2),
                "drawdown": round(drawdown, 2)
            })
        
        return equity_curve
    
    async def list_backtests(
        self, 
        user_id: str, 
        limit: int = 20, 
        offset: int = 0
    ) -> Dict[str, Any]:
        """List user's backtests with pagination"""
        
        # Count total backtests
        total_count = await self.db.backtests.count_documents({"user_id": user_id})
        
        # Fetch backtests with pagination
        cursor = self.db.backtests.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        backtests = await cursor.to_list(length=limit)
        
        # Format for response
        formatted_backtests = []
        for backtest in backtests:
            formatted_backtests.append({
                "id": backtest["id"],
                "name": backtest["name"],
                "status": backtest["status"],
                "symbols": backtest["symbols"],
                "start_date": backtest["start_date"],
                "end_date": backtest["end_date"],
                "total_trades": backtest.get("total_trades"),
                "total_return": backtest.get("total_return"),
                "win_rate": backtest.get("win_rate"),
                "created_at": backtest["created_at"],
                "completed_at": backtest.get("completed_at")
            })
        
        return {
            "backtests": formatted_backtests,
            "total_count": total_count,
            "has_more": (offset + len(formatted_backtests)) < total_count
        }

# Global service instance
backtest_engine = None

def get_backtest_engine(db: AsyncIOMotorDatabase) -> BacktestEngine:
    """Get or create backtest engine instance"""
    global backtest_engine
    if backtest_engine is None:
        backtest_engine = BacktestEngine(db)
    return backtest_engine