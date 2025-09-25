from dotenv import load_dotenv
load_dotenv()

"""
Production-ready Altai Trader Backend Server with LLM Chat Integration
Full implementation replacing mock logic with real APIs, backtesting, and safety controls
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, status, UploadFile, File, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import asyncio
import logging
import sys
import os
import uuid
import random

# Add current directory to path for imports
sys.path.append(os.path.dirname(__file__))

# Initialize production mode flag
PRODUCTION_MODE = False

# Import production services
try:
    from config import settings
    from services.backtest_service import BacktestService
    from services.news_service import NewsService
    from services.market_service import MarketDataService
    from services.chat_service import ChatService
    PRODUCTION_MODE = True
    logger = logging.getLogger(__name__)
    logger.info("Production services loaded successfully")
except ImportError as e:
    # Fallback to basic functionality if services not available
    PRODUCTION_MODE = False
    import os
    from dotenv import load_dotenv
    load_dotenv()
    
    # Basic settings fallback
    class BasicSettings:
        def __init__(self):
            self.mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
            self.db_name = os.environ.get("DB_NAME", "altai_trader")
            self.polygon_api_key = os.environ.get("POLYGON_API_KEY")
            self.newsware_api_key = os.environ.get("NEWSWARE_API_KEY")
            self.tradexchange_api_key = os.environ.get("TRADEXCHANGE_API_KEY")
            self.tradestation_client_id = os.environ.get("TRADESTATION_CLIENT_ID")
            self.cors_origins = ["*"]
            self.environment = "development"
            self.log_level = "INFO"
    
    settings = BasicSettings()

# Setup logging
logging.basicConfig(
    level=getattr(logging, getattr(settings, 'log_level', 'INFO').upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global variables
client = None
db = None
background_tasks_running = False

# Services (will be None if not in production mode)
backtest_service = None
news_service = None
market_service = None
tradestation_service = None
ibkr_service = None


# Pydantic Models
class BacktestRequest(BaseModel):
    strategy_name: str
    symbols: List[str] = Field(default_factory=lambda: ["AAPL"])
    symbol: str = "AAPL"  # For backward compatibility
    start_date: datetime
    end_date: datetime
    timeframe: str = "1D"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class BacktestResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    strategy_name: str
    symbol: str
    start_date: datetime
    end_date: datetime
    equity_curve: List[Dict[str, Any]] = Field(default_factory=list)
    trades: List[Dict[str, Any]] = Field(default_factory=list)
    summary_stats: Dict[str, Any] = Field(default_factory=dict)
    markers: List[Dict[str, Any]] = Field(default_factory=list)
    overlays: List[Dict[str, Any]] = Field(default_factory=list)
    status: str = "success"
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApiKeyUpdate(BaseModel):
    service: str
    api_key: str


class Strategy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    code: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global client, db, background_tasks_running
    global backtest_service, news_service, market_service, PRODUCTION_MODE
    
    # Startup
    logger.info(f"Starting Altai Trader API (Production Mode: {PRODUCTION_MODE})")
    
    # Initialize databases (MongoDB + SQLite/PostgreSQL)
    try:
        await db_manager.initialize_databases()
        logger.info("All databases initialized successfully")
        
        # Create default users for authentication
        await create_default_users()
        logger.info("Default users created/verified")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
    
    # Initialize MongoDB for existing functionality
    client = AsyncIOMotorClient(settings.mongo_url)
    db = client[settings.db_name]
    
    # Test database connection
    try:
        await client.admin.command('ping')
        logger.info("MongoDB connected successfully")
        
        # Create indexes
        await create_database_indexes()
        
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        
    # Initialize services (only in production mode)
    if PRODUCTION_MODE:
        try:
            backtest_service = BacktestService(
                timeout_seconds=getattr(settings, 'backtest_timeout', 300),
                max_memory_mb=getattr(settings, 'max_memory_mb', 1024),
                max_cpu_percent=getattr(settings, 'max_cpu_percent', 80.0)
            )
            
            news_service = NewsService(
                newsware_api_key=settings.newsware_api_key,
                tradexchange_api_key=settings.tradexchange_api_key
            )
            
            market_service = MarketDataService(
                polygon_api_key=settings.polygon_api_key
            )
            
            logger.info("Production services initialized successfully")
            
            # Start background tasks
            background_tasks_running = True
            asyncio.create_task(background_news_fetcher())
            
        except Exception as e:
            logger.error(f"Error initializing production services: {e}")
            PRODUCTION_MODE = False
    
    yield
    
    # Shutdown
    logger.info("Shutting down Altai Trader API")
    background_tasks_running = False
    
    # Cleanup services
    if backtest_service and hasattr(backtest_service, 'cleanup'):
        backtest_service.cleanup()
        
    # Close database connections
    if client:
        client.close()
        
    await db_manager.close_connections()


async def create_database_indexes():
    """Create necessary database indexes"""
    try:
        # News articles indexes
        await db.news_articles.create_index([("published_at", -1)])
        await db.news_articles.create_index([("source", 1)])
        await db.news_articles.create_index([("tickers", 1)])
        
        # Backtest results indexes
        await db.backtest_results.create_index([("created_at", -1)])
        await db.backtest_results.create_index([("symbol", 1)])
        await db.backtest_results.create_index([("strategy_name", 1)])
        
        # Strategies indexes
        await db.strategies.create_index([("name", 1)])
        await db.strategies.create_index([("updated_at", -1)])
        
        # Market data indexes
        await db.stock_aggregates.create_index([("symbol", 1), ("timestamp", -1)])
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.warning(f"Error creating database indexes: {e}")


app = FastAPI(
    title="Altai Trader Production API",
    description="Production-ready trading platform with real APIs, backtesting, and news feeds",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware with explicit configuration for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Background task for news fetching (production mode only)
async def background_news_fetcher():
    """Background task to continuously fetch news"""
    if not PRODUCTION_MODE or not news_service:
        return
        
    while background_tasks_running:
        try:
            articles = await news_service.get_live_news(limit=50)
            
            if articles:
                # Store articles in database
                for article in articles:
                    try:
                        article_dict = article.dict()
                        await db.news_articles.update_one(
                            {"id": article.id},
                            {"$set": article_dict},
                            upsert=True
                        )
                    except Exception as e:
                        logger.warning(f"Failed to store article: {e}")
                        
                logger.info(f"Fetched and cached {len(articles)} news articles")
            
            await asyncio.sleep(60)  # Fetch every minute
            
        except Exception as e:
            logger.error(f"Error in background news fetcher: {e}")
            await asyncio.sleep(300)  # Wait 5 minutes on error


# API Routes

@app.get("/")
async def root():
    return {
        "message": "Altai Trader Production API", 
        "status": "running", 
        "version": "2.0.0",
        "production_mode": PRODUCTION_MODE,
        "features": {
            "real_backtesting": PRODUCTION_MODE,
            "live_news": PRODUCTION_MODE,
            "market_data": PRODUCTION_MODE,
            "safety_controls": PRODUCTION_MODE
        }
    }


# Old health check replaced with comprehensive version below


# Settings API
@app.get("/api/settings")
async def get_settings():
    """Get application settings"""
    try:
        await client.admin.command('ping')
        db_connected = True
    except:
        db_connected = False
        
    return {
        "polygon_api_configured": bool(settings.polygon_api_key),
        "newsware_api_configured": bool(settings.newsware_api_key),
        "tradexchange_api_configured": bool(getattr(settings, 'tradexchange_api_key', None)),
        "tradestation_configured": bool(getattr(settings, 'tradestation_client_id', None)),
        "database_connected": db_connected,
        "production_mode": PRODUCTION_MODE,
        "api_keys": {
            "polygon": "Configured" if settings.polygon_api_key else "Not Set",
            "newsware": "Configured" if settings.newsware_api_key else "Not Set",
            "tradexchange": "Configured" if getattr(settings, 'tradexchange_api_key', None) else "Not Set",
            "tradestation": "Configured" if getattr(settings, 'tradestation_client_id', None) else "Not Set"
        },
        "features": {
            "backtesting": True,
            "live_trading": bool(getattr(settings, 'tradestation_client_id', None)),
            "news_feeds": True,
            "strategies": True,
            "safety_controls": PRODUCTION_MODE
        }
    }


@app.post("/api/settings/test-connection")
async def test_api_connections(service: str):
    """Test API connections with real checks (when available)"""
    if service == "polygon":
        if PRODUCTION_MODE and market_service:
            result = await market_service.test_connection()
            return {"status": result["status"], "message": result["message"]}
        elif settings.polygon_api_key:
            return {"status": "warning", "message": "API key configured but production services not available"}
        else:
            return {"status": "error", "message": "Polygon API key not configured"}
    
    elif service == "newsware":
        if PRODUCTION_MODE and news_service:
            results = await news_service.test_connections()
            newsware_result = results["newsware"]
            return {"status": newsware_result["status"], "message": newsware_result["message"]}
        elif settings.newsware_api_key:
            return {"status": "warning", "message": "API key configured but production services not available"}
        else:
            return {"status": "mock", "message": "Mock mode active - no API key configured"}
    
    elif service == "tradexchange":
        if PRODUCTION_MODE and news_service:
            results = await news_service.test_connections()
            tradexchange_result = results["tradexchange"]
            return {"status": tradexchange_result["status"], "message": tradexchange_result["message"]}
        else:
            return {"status": "mock", "message": "Mock mode active - TradeXchange not configured"}
    
    elif service == "tradestation":
        if tradestation_service:
            try:
                # Check if user has valid tokens stored
                # For now, just check if credentials are configured
                if getattr(settings, 'tradestation_client_id', None):
                    # TODO: Add actual token validation when user is connected
                    return {"status": "success", "message": "TradeStation OAuth configured and ready for connection"}
                else:
                    return {"status": "error", "message": "TradeStation credentials not configured"}
            except Exception as e:
                return {"status": "error", "message": f"TradeStation test failed: {str(e)}"}
        else:
            return {"status": "error", "message": "TradeStation service not available"}
    
    elif service == "ibkr":
        if ibkr_service:
            try:
                # Check IBKR mode and connectivity
                mode = os.environ.get('IBKR_MODE', 'gateway')
                if mode == 'gateway':
                    # For gateway mode, check if we can reach the gateway
                    return {"status": "warning", "message": "IBKR Gateway mode - manual connection required"}
                else:
                    # For oauth2 mode, check if credentials are configured
                    if getattr(settings, 'ibkr_client_id', None):
                        return {"status": "success", "message": "IBKR OAuth2 configured and ready for connection"}
                    else:
                        return {"status": "error", "message": "IBKR OAuth2 credentials not configured"}
            except Exception as e:
                return {"status": "error", "message": f"IBKR test failed: {str(e)}"}
        else:
            return {"status": "error", "message": "IBKR service not available"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid service name")


@app.post("/api/settings/update-api-key")
async def update_api_key(request: ApiKeyUpdate):
    """Update API key for a service"""
    global market_service, news_service
    
    try:
        if request.service == "polygon":
            # Update settings
            settings.polygon_api_key = request.api_key
            os.environ["POLYGON_API_KEY"] = request.api_key
            
            # Reinitialize market service if in production mode
            if PRODUCTION_MODE:
                market_service = MarketDataService(polygon_api_key=request.api_key)
            
            return {"status": "success", "message": "Polygon API key updated successfully"}
        
        elif request.service == "newsware":
            # Update settings
            settings.newsware_api_key = request.api_key
            os.environ["NEWSWARE_API_KEY"] = request.api_key
            
            # Reinitialize news service if in production mode
            if PRODUCTION_MODE:
                news_service = NewsService(
                    newsware_api_key=request.api_key,
                    tradexchange_api_key=getattr(settings, 'tradexchange_api_key', None)
                )
            
            return {"status": "success", "message": "NewsWare API key updated successfully"}
        
        elif request.service == "tradexchange":
            # Update settings
            settings.tradexchange_api_key = request.api_key
            os.environ["TRADEXCHANGE_API_KEY"] = request.api_key
            
            # Reinitialize news service if in production mode
            if PRODUCTION_MODE:
                news_service = NewsService(
                    newsware_api_key=getattr(settings, 'newsware_api_key', None),
                    tradexchange_api_key=request.api_key
                )
            
            return {"status": "success", "message": "TradeXchange API key updated successfully"}
        
        else:
            raise HTTPException(status_code=400, detail="Invalid service name")
            
    except Exception as e:
        logger.error(f"Error updating API key for {request.service}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update API key: {str(e)}")


# Production Backtesting API
@app.post("/api/backtest", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """Run backtest with production Backtrader implementation (when available)"""
    try:
        logger.info(f"Starting backtest for {request.strategy_name} on {request.symbols}")
        
        # Use primary symbol
        primary_symbol = request.symbols[0] if request.symbols else request.symbol
        
        if PRODUCTION_MODE and backtest_service and market_service:
            # Production implementation with real Backtrader
            start_date = request.start_date.strftime("%Y-%m-%d")
            end_date = request.end_date.strftime("%Y-%m-%d")
            
            # Convert timeframe to Polygon format
            multiplier, timespan = _parse_timeframe(request.timeframe)
            
            # Fetch market data
            polygon_data = await market_service.get_aggregates(
                primary_symbol, multiplier, timespan, start_date, end_date
            )
            
            if not polygon_data.get("results"):
                raise HTTPException(
                    status_code=404, 
                    detail=f"No market data available for {primary_symbol} from {start_date} to {end_date}"
                )
            
            # Run backtest with safety controls
            backtest_result = await backtest_service.run_backtest(
                symbol=primary_symbol,
                polygon_data=polygon_data["results"],
                strategy_params=request.parameters,
                start_date=request.start_date,
                end_date=request.end_date
            )
            
            # Create response
            response = BacktestResponse(
                strategy_name=request.strategy_name,
                symbol=primary_symbol,
                start_date=request.start_date,
                end_date=request.end_date,
                equity_curve=backtest_result["equity_curve"],
                trades=backtest_result["trades"],
                summary_stats=backtest_result["summary_stats"],
                markers=backtest_result["markers"],
                overlays=backtest_result["overlays"],
                status=backtest_result["status"]
            )
            
        else:
            # Fallback implementation (original mock logic)
            logger.warning("Using fallback backtest implementation - production services not available")
            
            # Generate mock but realistic results
            random.seed(hash(f"{request.strategy_name}{primary_symbol}{request.start_date}"))
            
            days_diff = (request.end_date - request.start_date).days
            total_trades = max(1, days_diff // 5)  # One trade every 5 days
            
            # Mock equity curve
            equity_curve = []
            initial_equity = 100000
            current_equity = initial_equity
            
            for i in range(min(days_diff, 50)):  # Max 50 points
                timestamp = request.start_date + timedelta(days=i)
                current_equity *= (1 + random.uniform(-0.02, 0.03))  # Daily return -2% to +3%
                equity_curve.append({
                    "timestamp": timestamp.isoformat(),
                    "equity": round(current_equity, 2)
                })
            
            # Mock trades
            trades = []
            for i in range(total_trades):
                entry_price = 150 + random.uniform(-20, 20)
                exit_price = entry_price * (1 + random.uniform(-0.05, 0.08))
                quantity = random.randint(10, 100)
                
                trades.append({
                    "datetime": (request.start_date + timedelta(days=i*5)).isoformat(),
                    "symbol": primary_symbol,
                    "signal": "BUY" if random.random() > 0.3 else "SELL",
                    "entry": round(entry_price, 2),
                    "exit": round(exit_price, 2),
                    "quantity": quantity,
                    "pnl": round((exit_price - entry_price) * quantity, 2),
                    "r_multiple": round((exit_price - entry_price) / (entry_price * 0.02), 2),
                    "stop": round(entry_price * 0.98, 2),
                    "tp1": round(entry_price * 1.03, 2),
                    "tp2": round(entry_price * 1.06, 2),
                    "tp3": round(entry_price * 1.09, 2),
                    "tp4": round(entry_price * 1.12, 2)
                })
            
            # Mock summary stats
            final_equity = equity_curve[-1]["equity"] if equity_curve else initial_equity
            total_return = ((final_equity - initial_equity) / initial_equity) * 100
            winning_trades = len([t for t in trades if t["pnl"] > 0])
            
            summary_stats = {
                "total_return_pct": round(total_return, 2),
                "max_drawdown_pct": round(abs(total_return) * 0.3, 2),
                "win_rate_pct": round((winning_trades / max(1, total_trades)) * 100, 2),
                "profit_factor": round(random.uniform(1.1, 2.5), 2),
                "sharpe_ratio": round(random.uniform(0.5, 2.0), 2),
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "losing_trades": total_trades - winning_trades,
                "final_equity": round(final_equity, 2),
                "initial_equity": initial_equity
            }
            
            # Mock markers for TradingView
            markers = []
            for trade in trades[:10]:  # Limit markers
                timestamp = int(datetime.fromisoformat(trade["datetime"]).timestamp())
                color = "#00C851" if trade["signal"] == "BUY" else "#FF4444"
                shape = "arrowUp" if trade["signal"] == "BUY" else "arrowDown"
                position = "belowBar" if trade["signal"] == "BUY" else "aboveBar"
                
                markers.append({
                    "time": timestamp,
                    "position": position,
                    "color": color,
                    "shape": shape,
                    "text": f"{trade['signal']} {trade['quantity']} @ {trade['entry']}"
                })
            
            response = BacktestResponse(
                strategy_name=request.strategy_name,
                symbol=primary_symbol,
                start_date=request.start_date,
                end_date=request.end_date,
                equity_curve=equity_curve,
                trades=trades,
                summary_stats=summary_stats,
                markers=markers,
                overlays=[],
                status="success"
            )
        
        # Store result in database
        await db.backtest_results.insert_one(response.dict())
        
        logger.info(f"Backtest completed successfully for {primary_symbol}")
        return response
        
    except Exception as e:
        logger.error(f"Backtesting error: {e}")
        raise HTTPException(status_code=500, detail=f"Backtesting failed: {str(e)}")


def _parse_timeframe(timeframe: str) -> tuple:
    """Parse timeframe to Polygon multiplier/timespan"""
    timeframe_map = {
        "1m": (1, "minute"),
        "5m": (5, "minute"),
        "15m": (15, "minute"),
        "30m": (30, "minute"),
        "1h": (1, "hour"),
        "1D": (1, "day"),
        "1W": (1, "week"),
        "1M": (1, "month")
    }
    
    return timeframe_map.get(timeframe, (1, "day"))


# Production Market Data API
@app.get("/api/market/{symbol}/aggregates")
async def get_market_data(
    symbol: str,
    timespan: str = "day",
    multiplier: int = 1,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Get market data aggregates (real data when available)"""
    try:
        if PRODUCTION_MODE and market_service:
            # Use real Polygon data
            data = await market_service.get_aggregates(symbol, multiplier, timespan, start_date, end_date)
            
            # Store aggregates in database for caching
            if data.get("results"):
                for result in data["results"]:
                    aggregate = {
                        "symbol": symbol,
                        "timestamp": datetime.fromtimestamp(result["t"] / 1000),
                        "open": result["o"],
                        "high": result["h"],
                        "low": result["l"],
                        "close": result["c"],
                        "volume": result["v"],
                        "vwap": result.get("vw"),
                        "created_at": datetime.utcnow()
                    }
                    
                    await db.stock_aggregates.update_one(
                        {"symbol": symbol, "timestamp": aggregate["timestamp"]},
                        {"$set": aggregate},
                        upsert=True
                    )
            
            return data
        else:
            # Fallback mock data
            logger.warning("Using mock market data - production services not available")
            
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            days = (end_dt - start_dt).days
            
            # Generate mock bars
            results = []
            current_price = 150.0
            
            for i in range(min(days, 100)):  # Limit to 100 bars
                timestamp = start_dt + timedelta(days=i)
                
                # Simulate price movement
                daily_change = random.uniform(-0.05, 0.05)  # -5% to +5%
                open_price = current_price
                high_price = open_price * (1 + abs(daily_change) + random.uniform(0, 0.02))
                low_price = open_price * (1 - abs(daily_change) - random.uniform(0, 0.02))
                close_price = open_price * (1 + daily_change)
                volume = random.randint(500000, 2000000)
                
                results.append({
                    "t": int(timestamp.timestamp() * 1000),
                    "o": round(open_price, 2),
                    "h": round(high_price, 2),
                    "l": round(low_price, 2),
                    "c": round(close_price, 2),
                    "v": volume,
                    "vw": round((open_price + high_price + low_price + close_price) / 4, 2)
                })
                
                current_price = close_price
            
            return {
                "status": "OK",
                "request_id": f"mock_{symbol}_{start_date}_{end_date}",
                "results": results,
                "resultsCount": len(results),
                "adjusted": True,
                "note": "This is mock data for development purposes"
            }
        
    except Exception as e:
        logger.error(f"Market data error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Production News API
@app.get("/api/news/live")
async def get_live_news(
    limit: int = Query(50, ge=1, le=1000),
    sources: Optional[List[str]] = Query(None),
    tickers: Optional[List[str]] = Query(None)
):
    """Get live news feed from all sources (real when available)"""
    try:
        # Build query for database
        query = {}
        if sources:
            query["source"] = {"$in": sources}
        if tickers:
            query["tickers"] = {"$in": tickers}
        
        # Get cached articles from database
        cursor = db.news_articles.find(query).sort("published_at", -1).limit(limit)
        articles = []
        
        async for doc in cursor:
            # Convert MongoDB document to JSON-serializable format
            article = {}
            for key, value in doc.items():
                if key == "_id":
                    continue  # Skip MongoDB ObjectId
                article[key] = value
            articles.append(article)
        
        # Get sources status
        sources_status = {}
        if PRODUCTION_MODE and news_service:
            sources_status = await news_service.test_connections()
        else:
            sources_status = {
                "newsware": {"status": "mock", "message": "Mock mode active"},
                "tradexchange": {"status": "mock", "message": "Mock mode active"}
            }
        
        return {
            "articles": articles,
            "total_count": len(articles),
            "has_more": len(articles) == limit,
            "cached": True,
            "production_mode": PRODUCTION_MODE,
            "sources_status": sources_status
        }
        
    except Exception as e:
        logger.error(f"News API error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")

@app.get("/api/news/stream")
async def news_stream():
    """Server-Sent Events stream for real-time news updates"""
    from fastapi.responses import StreamingResponse
    import asyncio
    import json
    
    async def event_generator():
        """Generate news events for SSE"""
        try:
            while True:
                # In a real implementation, this would listen to news service updates
                # For now, we'll send a heartbeat every 30 seconds
                yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
                await asyncio.sleep(30)
                
                # TODO: Add real news event generation when news service has new articles
                # This would typically involve listening to news service callbacks
                # and yielding new articles as they arrive
                
        except asyncio.CancelledError:
            # Client disconnected
            return
        except Exception as e:
            logger.error(f"SSE stream error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Stream error'})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )


# Strategy Management API (unchanged)
@app.get("/api/strategies", response_model=List[Strategy])
async def get_strategies():
    """Get all strategies"""
    cursor = db.strategies.find().sort("updated_at", -1)
    strategies = []
    async for doc in cursor:
        strategies.append(Strategy(**doc))
    return strategies


@app.post("/api/strategies", response_model=Strategy)
async def create_strategy(strategy: Strategy):
    """Create a new strategy"""
    strategy.created_at = datetime.utcnow()
    strategy.updated_at = datetime.utcnow()
    
    await db.strategies.insert_one(strategy.dict())
    return strategy


@app.get("/api/strategies/{strategy_id}", response_model=Strategy)
async def get_strategy(strategy_id: str):
    """Get strategy by ID"""
    doc = await db.strategies.find_one({"id": strategy_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return Strategy(**doc)


@app.put("/api/strategies/{strategy_id}", response_model=Strategy)
async def update_strategy(strategy_id: str, strategy: Strategy):
    """Update a strategy"""
    strategy.id = strategy_id
    strategy.updated_at = datetime.utcnow()
    
    result = await db.strategies.replace_one({"id": strategy_id}, strategy.dict())
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


@app.delete("/api/strategies/{strategy_id}")
async def delete_strategy(strategy_id: str):
    """Delete a strategy"""
    result = await db.strategies.delete_one({"id": strategy_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return {"message": "Strategy deleted successfully"}


# TradeXchange Webhook Integration
class TradeXchangeWebhook(BaseModel):
    source: str
    content: str
    timestamp: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


@app.post("/api/webhooks/tradexchange")
async def receive_tradexchange_webhook(webhook_data: TradeXchangeWebhook):
    """Receive news updates from TradeXchange via webhook"""
    try:
        logger.info(f"Received TradeXchange webhook from source: {webhook_data.source}")
        
        # Create a standardized news article from webhook data
        article_id = f"tx_webhook_{hash(webhook_data.content + webhook_data.source)}"
        
        # Parse tickers from content (basic implementation)
        import re
        ticker_pattern = r'\b[A-Z]{1,5}\b'  # Common stock ticker pattern
        tickers = re.findall(ticker_pattern, webhook_data.content)[:5]  # Limit to 5 tickers
        
        # Create NewsArticle object
        article = {
            "id": article_id,
            "headline": f"TradeXchange Update from {webhook_data.source}",
            "body": webhook_data.content,
            "source": "TradeXchange",
            "published_at": datetime.utcnow(),
            "tickers": tickers,
            "category": "markets",
            "metadata": {
                "webhook_source": webhook_data.source,
                "received_at": datetime.utcnow().isoformat(),
                "original_timestamp": webhook_data.timestamp,
                **webhook_data.metadata
            }
        }
        
        # Store in database
        await db.news_articles.update_one(
            {"id": article_id},
            {"$set": article},
            upsert=True
        )
        
        logger.info(f"Stored TradeXchange article: {article_id}")
        
        # Return HTTP 200 as required by TradeXchange
        return {
            "status": "success",
            "message": "Webhook received and processed",
            "article_id": article_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error processing TradeXchange webhook: {e}")
        # Still return 200 to prevent webhook retries
        return {
            "status": "error", 
            "message": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


@app.get("/api/webhooks/tradexchange/test")
async def test_tradexchange_webhook():
    """Test endpoint to verify webhook integration"""
    return {
        "message": "TradeXchange webhook endpoint is ready",
        "webhook_url": "/api/webhooks/tradexchange",
        "method": "POST",
        "expected_format": {
            "source": "TMNews1",
            "content": "This is the content of the newsdesk message",
            "timestamp": "optional ISO datetime string",
            "metadata": "optional additional data"
        },
        "status": "ready"
    }


# Backtest Results API
@app.get("/api/backtest/results")
async def get_backtest_results():
    """Get all backtest results"""
    try:
        cursor = db.backtest_results.find().sort("created_at", -1).limit(100)
        results = []
        async for doc in cursor:
            # Convert ObjectId to string for JSON serialization
            if '_id' in doc:
                doc['_id'] = str(doc['_id'])
            results.append(doc)
        return results
    except Exception as e:
        # Return empty list if there's an error
        return []


# Authentication and User Management Endpoints

# Import new dependencies
from database import get_db_session, get_mongodb, db_manager, create_default_users
from auth import AuthService, get_current_user, get_current_user_optional, PasswordResetService
from models import User, Subscription, PaymentMethod, Transaction, Notification, SUBSCRIPTION_PLANS, DashboardMetricsResponse, BacktestResultsResponse
from services.adyen_service import AdyenService
from services.metrics_service import get_metrics_service
from services.backtest_engine import get_backtest_engine
from services.ai_service import get_ai_assistant
from fastapi import Depends, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import EmailStr
import json

security = HTTPBearer()

# Pydantic models for requests/responses
class UserRegistration(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class SubscriptionCreate(BaseModel):
    plan_id: str
    payment_method_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    preferences: Dict[str, Any]

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    priority: str
    is_read: bool
    created_at: datetime
    action_type: Optional[str]
    action_data: Optional[Dict[str, Any]]

# Update get_current_user dependency to include database session
def get_current_user_with_db(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db_session)
) -> User:
    """Get current authenticated user with database session"""
    return get_current_user(credentials, db)

@app.get("/api/settings/api-keys")
async def get_api_keys(current_user: User = Depends(get_current_user_with_db)):
    """Get user's API keys (masked for security)"""
    return {
        "polygon": "****" + settings.polygon_api_key[-4:] if settings.polygon_api_key and len(settings.polygon_api_key) > 4 else "",
        "newsware": "****" + settings.newsware_api_key[-4:] if settings.newsware_api_key and len(settings.newsware_api_key) > 4 else "",
        "tradexchange": "****" + settings.tradexchange_api_key[-4:] if settings.tradexchange_api_key and len(settings.tradexchange_api_key) > 4 else "",
        "tradestation": "Configured" if getattr(settings, 'tradestation_client_id', None) else "",
        "ibkr": "Configured" if getattr(settings, 'ibkr_client_id', None) else ""
    }

# Update authentication endpoints to use proper dependency
@app.post("/api/auth/register", response_model=dict)
async def register_user(user_data: UserRegistration, db: Session = Depends(get_db_session)):
    """Register a new user"""
    try:
        user = AuthService.create_user(
            db=db,
            email=user_data.email,
            full_name=user_data.full_name,
            password=user_data.password
        )
        
        # Create access token
        access_token = AuthService.create_access_token(data={"sub": user.id})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/auth/login", response_model=dict)
async def login_user(user_data: UserLogin, db: Session = Depends(get_db_session)):
    """Login user"""
    user = AuthService.authenticate_user(db, user_data.email, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )
    
    access_token = AuthService.create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "last_login": user.last_login.isoformat() if user.last_login else None
        }
    }

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user_with_db)
):
    """Get current user information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        preferences=current_user.preferences or {}
    )

@app.put("/api/auth/me", response_model=UserResponse)
async def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Update current user information"""
    try:
        if user_data.full_name:
            current_user.full_name = user_data.full_name
        
        if user_data.email and user_data.email != current_user.email:
            # Check if email already exists
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already in use")
            current_user.email = user_data.email
        
        current_user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(current_user)
        
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            is_active=current_user.is_active,
            created_at=current_user.created_at,
            preferences=current_user.preferences or {}
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/auth/password")
async def update_password(
    password_data: PasswordUpdate,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Update user password"""
    # Verify current password
    if not AuthService.verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if not AuthService.validate_password(password_data.new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters with letters and numbers"
        )
    
    # Update password
    current_user.hashed_password = AuthService.hash_password(password_data.new_password)
    current_user.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Password updated successfully"}

# Billing and subscription endpoints
@app.get("/api/billing/plans")
async def get_subscription_plans():
    """Get available subscription plans"""
    return {"plans": list(SUBSCRIPTION_PLANS.values())}

@app.post("/api/billing/payment-session")
async def create_payment_session(
    amount: float,
    plan_id: str,
    current_user: User = Depends(get_current_user_with_db)
):
    """Create Adyen payment session"""
    try:
        adyen_service = AdyenService()
        
        # Validate plan
        if plan_id not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan ID")
        
        plan = SUBSCRIPTION_PLANS[plan_id]
        
        session_data = await adyen_service.create_payment_session(
            user=current_user,
            amount=plan["amount"],
            currency=plan["currency"],
            return_url=f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/billing/payment-result"
        )
        
        return session_data
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/billing/subscriptions")
async def get_user_subscriptions(
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Get user's subscriptions"""
    subscriptions = db.query(Subscription).filter(Subscription.user_id == current_user.id).all()
    
    return {
        "subscriptions": [
            {
                "id": sub.id,
                "plan_id": sub.plan_id,
                "plan_name": sub.plan_name,
                "status": sub.status,
                "amount": sub.amount,
                "currency": sub.currency,
                "billing_cycle": sub.billing_cycle,
                "current_period_start": sub.current_period_start.isoformat() if sub.current_period_start else None,
                "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
                "next_billing_date": sub.next_billing_date.isoformat() if sub.next_billing_date else None,
                "created_at": sub.created_at.isoformat()
            }
            for sub in subscriptions
        ]
    }

@app.post("/api/billing/subscriptions")
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Create a new subscription"""
    try:
        # Validate plan
        if subscription_data.plan_id not in SUBSCRIPTION_PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan ID")
        
        plan = SUBSCRIPTION_PLANS[subscription_data.plan_id]
        
        # Create subscription record
        subscription = Subscription(
            user_id=current_user.id,
            plan_id=plan["id"],
            plan_name=plan["name"],
            amount=plan["amount"],
            currency=plan["currency"],
            billing_cycle=plan["billing_cycle"],
            status="pending"
        )
        
        db.add(subscription)
        db.commit()
        db.refresh(subscription)
        
        return {
            "subscription_id": subscription.id,
            "status": subscription.status,
            "message": "Subscription created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/notifications")
async def get_user_notifications(
    limit: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Get user notifications"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()
    
    return {
        "notifications": [
            NotificationResponse(
                id=notif.id,
                title=notif.title,
                message=notif.message,
                notification_type=notif.notification_type,
                priority=notif.priority,
                is_read=notif.is_read,
                created_at=notif.created_at,
                action_type=notif.action_type,
                action_data=notif.action_data
            )
            for notif in notifications
        ]
    }

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Mark notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Notification marked as read"}

# Adyen webhook endpoint
@app.post("/api/webhooks/adyen")
async def handle_adyen_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db_session)
):
    """Handle Adyen webhook notifications"""
    try:
        # Get raw payload for signature verification
        payload = await request.body()
        payload_str = payload.decode('utf-8')
        
        # Get HMAC signature from headers
        signature = request.headers.get("hmac-signature")
        
        adyen_service = AdyenService()
        
        # Verify webhook signature (skip in development if key not configured)
        if signature and not adyen_service.verify_webhook_signature(payload_str, signature):
            raise HTTPException(status_code=403, detail="Invalid webhook signature")
        
        # Parse webhook payload
        webhook_data = json.loads(payload_str)
        notification_items = webhook_data.get("notificationItems", [])
        
        # Process each notification in background
        for item in notification_items:
            notification = item.get("NotificationRequestItem", {})
            background_tasks.add_task(
                adyen_service.process_webhook_notification,
                db,
                notification
            )
        
        # Return success response to Adyen
        return {"notificationResponse": "[accepted]"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling Adyen webhook: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# System health endpoint
@app.get("/api/system/health")
async def system_health():
    """Get system health status"""
    from database import check_database_health
    
    health_data = await check_database_health()
    
    # Check broker modes and connectivity
    broker_status = {
        "tradestation": {
            "configured": bool(getattr(settings, 'tradestation_client_id', None)),
            "mode": "oauth2",
            "service_available": tradestation_service is not None
        },
        "ibkr": {
            "configured": bool(getattr(settings, 'ibkr_client_id', None)) or os.environ.get('IBKR_MODE') == 'gateway',
            "mode": os.environ.get('IBKR_MODE', 'gateway'),
            "service_available": ibkr_service is not None
        }
    }
    
    # Check news connectivity
    news_status = {
        "production_mode": PRODUCTION_MODE,
        "services": {
            "newsware": {
                "configured": bool(settings.newsware_api_key),
                "service_available": news_service is not None
            },
            "tradexchange": {
                "configured": bool(settings.tradexchange_api_key),
                "service_available": news_service is not None
            }
        }
    }
    
    # Overall system status
    overall_status = "healthy"
    if not all(health_data[key] for key in ["mongodb", "sql"]):
        overall_status = "degraded"
    elif not any(broker_status[broker]["configured"] for broker in broker_status):
        overall_status = "partial"  # System works but no brokers configured
    
    return {
        "status": overall_status,
        "databases": health_data,
        "brokers": broker_status,
        "news": news_status,
        "version": "2.0.0-production-ready",
        "timestamp": datetime.utcnow().isoformat()
    }

# Trading Integration Endpoints

# Import trading services and models
from services.broker_service import broker_service, BrokerService, UnifiedOrder, BrokerType
from models.trading_models import BrokerConnection, TradingAccount, TradingConfiguration, OrderHistory, add_trading_relationships_to_user

# Add trading relationships to User model
add_trading_relationships_to_user()

# Trading-specific Pydantic models
class BrokerAuthRequest(BaseModel):
    broker: str
    state: Optional[str] = None

class BrokerCallbackRequest(BaseModel):
    broker: str
    code: str
    state: str

class OrderRequest(BaseModel):
    broker: str
    account_id: str
    symbol: str
    action: str  # BUY, SELL, BTC, SS
    quantity: int
    order_type: str = "MARKET"  # MARKET, LIMIT, STOP, STOP_LIMIT
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "DAY"

class TradingConfigRequest(BaseModel):
    strategy_id: str
    broker: str
    account_id: str
    default_order_type: str = "MARKET"
    default_quantity: int = 100
    max_position_size: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    configuration_name: Optional[str] = None

@app.get("/api/trading/brokers")
async def get_available_brokers():
    """Get list of available brokers and their configuration status"""
    try:
        brokers = broker_service.get_available_brokers()
        return {
            "brokers": brokers,
            "total_count": len(brokers)
        }
    except Exception as e:
        logger.error(f"Error fetching brokers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching brokers: {str(e)}"
        )

@app.post("/api/trading/auth/initiate")
async def initiate_broker_auth(
    request: BrokerAuthRequest,
    current_user: User = Depends(get_current_user_with_db)
):
    """Initiate OAuth flow for broker authentication"""
    try:
        auth_data = broker_service.generate_auth_url(request.broker, request.state)
        
        return {
            "broker": request.broker,
            "authorization_url": auth_data["authorization_url"],
            "state": auth_data["state"],
            "oauth_type": auth_data.get("oauth_type", "authorization_code"),
            "public_key": auth_data.get("public_key"),
            "registration_required": auth_data.get("registration_required", False),
            "instructions": auth_data.get("instructions")
        }
    except Exception as e:
        logger.error(f"Error initiating broker auth: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initiating authentication: {str(e)}"
        )

@app.post("/api/trading/auth/callback")
async def handle_broker_auth_callback(
    request: BrokerCallbackRequest,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Handle OAuth callback and store broker connection"""
    try:
        # Exchange code for tokens
        tokens = await broker_service.handle_oauth_callback(
            request.broker, request.code, request.state
        )
        
        # Store broker connection in database
        existing_connection = db.query(BrokerConnection).filter(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.broker_type == request.broker.lower()
        ).first()
        
        if existing_connection:
            # Update existing connection
            existing_connection.access_token = tokens["access_token"]
            existing_connection.refresh_token = tokens.get("refresh_token")
            existing_connection.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
            existing_connection.is_active = True
            existing_connection.last_used = datetime.utcnow()
            existing_connection.updated_at = datetime.utcnow()
            connection = existing_connection
        else:
            # Create new connection
            connection = BrokerConnection(
                user_id=current_user.id,
                broker_type=request.broker.lower(),
                access_token=tokens["access_token"],
                refresh_token=tokens.get("refresh_token"),
                token_expires_at=datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600)),
                connection_name=f"{request.broker.capitalize()} Connection",
                is_active=True,
                last_used=datetime.utcnow()
            )
            db.add(connection)
        
        db.commit()
        db.refresh(connection)
        
        # Fetch and store user's accounts
        try:
            accounts = await broker_service.get_accounts(request.broker, tokens["access_token"])
            
            for account_data in accounts:
                existing_account = db.query(TradingAccount).filter(
                    TradingAccount.broker_connection_id == connection.id,
                    TradingAccount.account_id == account_data["account_id"]
                ).first()
                
                if existing_account:
                    # Update existing account
                    existing_account.account_name = account_data["name"]
                    existing_account.account_type = account_data["type"]
                    existing_account.status = account_data["status"]
                    existing_account.margin_enabled = account_data["margin_enabled"]
                    existing_account.cash_balance = account_data["cash_balance"]
                    existing_account.equity = account_data["equity"]
                    existing_account.buying_power = account_data["buying_power"]
                    existing_account.last_sync = datetime.utcnow()
                else:
                    # Create new account
                    account = TradingAccount(
                        broker_connection_id=connection.id,
                        account_id=account_data["account_id"],
                        account_name=account_data["name"],
                        account_type=account_data["type"],
                        currency=account_data["currency"],
                        status=account_data["status"],
                        margin_enabled=account_data["margin_enabled"],
                        cash_balance=account_data["cash_balance"],
                        equity=account_data["equity"],
                        buying_power=account_data["buying_power"],
                        last_sync=datetime.utcnow()
                    )
                    db.add(account)
            
            db.commit()
            
        except Exception as e:
            logger.warning(f"Failed to fetch accounts during OAuth callback: {str(e)}")
        
        return {
            "success": True,
            "broker": request.broker,
            "connection_id": connection.id,
            "message": f"{request.broker.capitalize()} connected successfully",
            "expires_at": connection.token_expires_at.isoformat() if connection.token_expires_at else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error handling OAuth callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth callback failed: {str(e)}"
        )

@app.get("/api/trading/connections")
async def get_broker_connections(
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Get user's broker connections"""
    try:
        connections = db.query(BrokerConnection).filter(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.is_active == True
        ).all()
        
        result = []
        for conn in connections:
            # Check token expiration
            is_expired = conn.token_expires_at and conn.token_expires_at < datetime.utcnow()
            
            result.append({
                "id": conn.id,
                "broker": conn.broker_type,
                "broker_name": conn.broker_type.capitalize(),
                "connection_name": conn.connection_name,
                "is_active": conn.is_active and not is_expired,
                "is_expired": is_expired,
                "last_used": conn.last_used.isoformat() if conn.last_used else None,
                "expires_at": conn.token_expires_at.isoformat() if conn.token_expires_at else None,
                "created_at": conn.created_at.isoformat(),
                "accounts_count": len(conn.trading_accounts)
            })
        
        return {
            "connections": result,
            "total_count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Error fetching broker connections: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching connections: {str(e)}"
        )

@app.get("/api/trading/accounts")
async def get_trading_accounts(
    broker: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Get user's trading accounts"""
    try:
        query = db.query(TradingAccount).join(BrokerConnection).filter(
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.is_active == True
        )
        
        if broker:
            query = query.filter(BrokerConnection.broker_type == broker.lower())
        
        accounts = query.all()
        
        result = []
        for account in accounts:
            result.append({
                "id": account.id,
                "account_id": account.account_id,
                "account_name": account.account_name,
                "nickname": account.nickname,
                "broker": account.broker_connection.broker_type,
                "broker_name": account.broker_connection.broker_type.capitalize(),
                "account_type": account.account_type,
                "currency": account.currency,
                "status": account.status,
                "margin_enabled": account.margin_enabled,
                "cash_balance": account.cash_balance,
                "equity": account.equity,
                "buying_power": account.buying_power,
                "is_preferred": account.is_preferred,
                "last_sync": account.last_sync.isoformat() if account.last_sync else None
            })
        
        return {
            "accounts": result,
            "total_count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Error fetching trading accounts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching accounts: {str(e)}"
        )

@app.post("/api/trading/orders")
async def place_trading_order(
    request: OrderRequest,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Place a trading order"""
    try:
        # Get broker connection and account
        account = db.query(TradingAccount).join(BrokerConnection).filter(
            TradingAccount.account_id == request.account_id,
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.broker_type == request.broker.lower(),
            BrokerConnection.is_active == True
        ).first()
        
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trading account not found"
            )
        
        # Check token expiration
        if account.broker_connection.token_expires_at and account.broker_connection.token_expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Broker connection expired. Please re-authenticate."
            )
        
        # Create unified order
        try:
            unified_order = UnifiedOrder(
                symbol=request.symbol,
                action=request.action,
                quantity=request.quantity,
                order_type=request.order_type,
                limit_price=request.limit_price,
                stop_price=request.stop_price,
                time_in_force=request.time_in_force
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid order parameters: {str(e)}"
            )
        
        # Place order through broker
        result = await broker_service.place_order(
            request.broker,
            account.broker_connection.access_token,
            request.account_id,
            unified_order
        )
        
        # Record order in history
        platform_order_id = str(uuid.uuid4())
        order_history = OrderHistory(
            user_id=current_user.id,
            trading_account_id=account.id,
            broker_order_id=result.get("order_id"),
            platform_order_id=platform_order_id,
            symbol=request.symbol.upper(),
            action=request.action.upper(),
            quantity=request.quantity,
            order_type=request.order_type.upper(),
            limit_price=request.limit_price,
            stop_price=request.stop_price,
            status="SUBMITTED",
            time_in_force=request.time_in_force.upper(),
            submitted_at=datetime.utcnow()
        )
        
        db.add(order_history)
        db.commit()
        db.refresh(order_history)
        
        # Update account last used
        account.broker_connection.last_used = datetime.utcnow()
        db.commit()
        
        result["platform_order_id"] = platform_order_id
        return result
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error placing trading order: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error placing order: {str(e)}"
        )

@app.get("/api/trading/orders")
async def get_trading_orders(
    broker: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Get user's trading orders"""
    try:
        query = db.query(OrderHistory).filter(OrderHistory.user_id == current_user.id)
        
        if broker or account_id:
            query = query.join(TradingAccount).join(BrokerConnection)
            
            if broker:
                query = query.filter(BrokerConnection.broker_type == broker.lower())
            
            if account_id:
                query = query.filter(TradingAccount.account_id == account_id)
        
        orders = query.order_by(OrderHistory.submitted_at.desc()).limit(limit).all()
        
        result = []
        for order in orders:
            result.append({
                "id": order.id,
                "platform_order_id": order.platform_order_id,
                "broker_order_id": order.broker_order_id,
                "symbol": order.symbol,
                "action": order.action,
                "quantity": order.quantity,
                "filled_quantity": order.filled_quantity,
                "order_type": order.order_type,
                "limit_price": order.limit_price,
                "stop_price": order.stop_price,
                "average_fill_price": order.average_fill_price,
                "status": order.status,
                "time_in_force": order.time_in_force,
                "commission": order.commission,
                "fees": order.fees,
                "realized_pnl": order.realized_pnl,
                "submitted_at": order.submitted_at.isoformat(),
                "filled_at": order.filled_at.isoformat() if order.filled_at else None,
                "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
                "broker": order.trading_account.broker_connection.broker_type if order.trading_account else None,
                "account_name": order.trading_account.account_name if order.trading_account else None
            })
        
        return {
            "orders": result,
            "total_count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Error fetching trading orders: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching orders: {str(e)}"
        )

@app.post("/api/trading/configurations")
async def create_trading_configuration(
    request: TradingConfigRequest,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Create trading configuration linking strategy to broker account"""
    try:
        # Verify account exists and belongs to user
        account = db.query(TradingAccount).join(BrokerConnection).filter(
            TradingAccount.account_id == request.account_id,
            BrokerConnection.user_id == current_user.id,
            BrokerConnection.broker_type == request.broker.lower(),
            BrokerConnection.is_active == True
        ).first()
        
        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trading account not found"
            )
        
        # Check if configuration already exists
        existing_config = db.query(TradingConfiguration).filter(
            TradingConfiguration.user_id == current_user.id,
            TradingConfiguration.strategy_id == request.strategy_id
        ).first()
        
        if existing_config:
            # Update existing configuration
            existing_config.broker_connection_id = account.broker_connection_id
            existing_config.trading_account_id = account.id
            existing_config.default_order_type = request.default_order_type
            existing_config.default_quantity = request.default_quantity
            existing_config.max_position_size = request.max_position_size
            existing_config.daily_loss_limit = request.daily_loss_limit
            existing_config.configuration_name = request.configuration_name
            existing_config.updated_at = datetime.utcnow()
            config = existing_config
        else:
            # Create new configuration
            config = TradingConfiguration(
                user_id=current_user.id,
                strategy_id=request.strategy_id,
                broker_connection_id=account.broker_connection_id,
                trading_account_id=account.id,
                default_order_type=request.default_order_type,
                default_quantity=request.default_quantity,
                max_position_size=request.max_position_size,
                daily_loss_limit=request.daily_loss_limit,
                configuration_name=request.configuration_name or f"Config for {request.strategy_id}"
            )
            db.add(config)
        
        db.commit()
        db.refresh(config)
        
        return {
            "id": config.id,
            "strategy_id": config.strategy_id,
            "broker": account.broker_connection.broker_type,
            "account_id": account.account_id,
            "account_name": account.account_name,
            "default_order_type": config.default_order_type,
            "default_quantity": config.default_quantity,
            "configuration_name": config.configuration_name,
            "is_live": config.is_live,
            "created_at": config.created_at.isoformat()
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating trading configuration: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating configuration: {str(e)}"
        )

@app.get("/api/trading/configurations")
async def get_trading_configurations(
    strategy_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Get user's trading configurations"""
    try:
        query = db.query(TradingConfiguration).filter(
            TradingConfiguration.user_id == current_user.id
        )
        
        if strategy_id:
            query = query.filter(TradingConfiguration.strategy_id == strategy_id)
        
        configs = query.all()
        
        result = []
        for config in configs:
            result.append({
                "id": config.id,
                "strategy_id": config.strategy_id,
                "broker": config.broker_connection.broker_type,
                "broker_name": config.broker_connection.broker_type.capitalize(),
                "account_id": config.trading_account.account_id,
                "account_name": config.trading_account.account_name,
                "default_order_type": config.default_order_type,
                "default_quantity": config.default_quantity,
                "max_position_size": config.max_position_size,
                "daily_loss_limit": config.daily_loss_limit,
                "configuration_name": config.configuration_name,
                "is_live": config.is_live,
                "auto_execute": config.auto_execute,
                "last_executed": config.last_executed.isoformat() if config.last_executed else None,
                "created_at": config.created_at.isoformat()
            })
        
        return {
            "configurations": result,
            "total_count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Error fetching trading configurations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching configurations: {str(e)}"
        )

@app.put("/api/trading/configurations/{config_id}/live")
async def toggle_live_trading(
    config_id: str,
    is_live: bool,
    current_user: User = Depends(get_current_user_with_db),
    db: Session = Depends(get_db_session)
):
    """Toggle live trading for a configuration"""
    try:
        config = db.query(TradingConfiguration).filter(
            TradingConfiguration.id == config_id,
            TradingConfiguration.user_id == current_user.id
        ).first()
        
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trading configuration not found"
            )
        
        # Verify broker connection is still active
        if is_live:
            if not config.broker_connection.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Broker connection is not active"
                )
            
            if config.broker_connection.token_expires_at and config.broker_connection.token_expires_at < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Broker connection expired. Please re-authenticate."
                )
        
        config.is_live = is_live
        config.updated_at = datetime.utcnow()
        
        if is_live:
            config.last_executed = datetime.utcnow()
        
        db.commit()
        
        return {
            "id": config.id,
            "strategy_id": config.strategy_id,
            "is_live": config.is_live,
            "message": f"Live trading {'enabled' if is_live else 'disabled'} for strategy {config.strategy_id}"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Error toggling live trading: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating configuration: {str(e)}"
        )

# ============================================================================
# DASHBOARD METRICS ENDPOINTS
# ============================================================================

@app.get("/api/metrics/dashboard", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get comprehensive dashboard metrics with date filtering
    
    Query Parameters:
    - start_date: ISO date string (YYYY-MM-DD), defaults to 1 year ago
    - end_date: ISO date string (YYYY-MM-DD), defaults to today
    - source: Filter by trade source ('backtest', 'live', 'paper')
    """
    try:
        # Parse dates
        parsed_start = None
        parsed_end = None
        
        if start_date:
            try:
                parsed_start = datetime.fromisoformat(start_date).date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use YYYY-MM-DD"
                )
        
        if end_date:
            try:
                parsed_end = datetime.fromisoformat(end_date).date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use YYYY-MM-DD"
                )
        
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get metrics service and calculate dashboard metrics
        metrics_service = get_metrics_service(mongo_db)
        
        metrics = await metrics_service.get_dashboard_metrics(
            user_id=current_user["user_id"],
            start_date=parsed_start,
            end_date=parsed_end,
            source_filter=source
        )
        
        return metrics
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard metrics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error fetching dashboard metrics"
        )

@app.get("/api/metrics/daily-pnl")
async def get_daily_pnl(
    start_date: str,
    end_date: str,
    mode: str = "dollar",
    current_user: dict = Depends(get_current_user)
):
    """
    Get daily P&L series for calendar and charts
    
    Query Parameters:
    - start_date: ISO date string (YYYY-MM-DD)
    - end_date: ISO date string (YYYY-MM-DD)  
    - mode: 'dollar', 'runit', or 'percentage'
    """
    try:
        # Parse dates
        try:
            parsed_start = datetime.fromisoformat(start_date).date()
            parsed_end = datetime.fromisoformat(end_date).date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Validate mode
        if mode not in ["dollar", "runit", "percentage"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mode must be 'dollar', 'runit', or 'percentage'"
            )
        
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get metrics service and fetch daily P&L
        metrics_service = get_metrics_service(mongo_db)
        
        daily_pnl = await metrics_service.get_daily_pnl_series(
            user_id=current_user["user_id"],
            start_date=parsed_start,
            end_date=parsed_end,
            mode=mode
        )
        
        return daily_pnl
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching daily P&L: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error fetching daily P&L"
        )

@app.post("/api/metrics/create-sample-data")
async def create_sample_data(
    current_user: dict = Depends(get_current_user)
):
    """
    Create sample trading data for testing (development only)
    """
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get metrics service and create sample data
        metrics_service = get_metrics_service(mongo_db)
        
        result = await metrics_service.create_sample_data(
            user_id=current_user["user_id"]
        )
        
        return {
            "message": "Sample data created successfully",
            "details": result
        }
        
    except Exception as e:
        logger.error(f"Error creating sample data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error creating sample data"
        )

# ============================================================================
# BACKTEST ENDPOINTS
# ============================================================================

@app.post("/api/backtests/run")
async def run_backtest(
    request: BacktestRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new backtest
    
    Request body should include:
    - strategy_name: Name of the strategy
    - symbols: List of symbols to backtest
    - start_date: Start date for backtest
    - end_date: End date for backtest
    - initial_capital: Starting capital (optional, default 100000)
    - commission: Commission per trade (optional, default 1.0)
    - timeframe: Timeframe for data (optional, default "1D")
    - parameters: Strategy parameters (optional)
    """
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get backtest engine
        backtest_engine = get_backtest_engine(mongo_db)
        
        # Prepare backtest configuration
        config = {
            "user_id": current_user["user_id"],
            "name": request.strategy_name,
            "symbols": request.symbols if request.symbols else [request.symbol],
            "start_date": request.start_date.date(),
            "end_date": request.end_date.date(),
            "initial_capital": getattr(request, 'initial_capital', 100000.0),
            "commission": getattr(request, 'commission', 1.0),
            "slippage": getattr(request, 'slippage', 0.01),
            "timeframe": request.timeframe,
            "parameters": request.parameters
        }
        
        # Start backtest
        backtest_id = await backtest_engine.run_backtest(
            user_id=current_user["user_id"],
            backtest_config=config
        )
        
        return {
            "id": backtest_id,
            "status": "started",
            "message": "Backtest started successfully",
            "estimated_duration": 30  # seconds (placeholder)
        }
        
    except Exception as e:
        logger.error(f"Error starting backtest: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting backtest: {str(e)}"
        )

@app.get("/api/backtests/{backtest_id}")
async def get_backtest_status(
    backtest_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get backtest status and progress"""
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get backtest engine
        backtest_engine = get_backtest_engine(mongo_db)
        
        # Get status
        status_info = await backtest_engine.get_backtest_status(
            backtest_id=backtest_id,
            user_id=current_user["user_id"]
        )
        
        return status_info
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching backtest status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching backtest status"
        )

@app.get("/api/backtests/{backtest_id}/results", response_model=BacktestResultsResponse)
async def get_backtest_results(
    backtest_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive backtest results"""
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get backtest engine
        backtest_engine = get_backtest_engine(mongo_db)
        
        # Get results
        results = await backtest_engine.get_backtest_results(
            backtest_id=backtest_id,
            user_id=current_user["user_id"]
        )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching backtest results: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching backtest results"
        )

@app.get("/api/backtests")
async def list_backtests(
    limit: int = 20,
    offset: int = 0,
    status_filter: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List user's backtests with pagination and filtering"""
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get backtest engine
        backtest_engine = get_backtest_engine(mongo_db)
        
        # List backtests
        results = await backtest_engine.list_backtests(
            user_id=current_user["user_id"],
            limit=limit,
            offset=offset
        )
        
        # Apply status filter if specified
        if status_filter:
            filtered_backtests = [
                bt for bt in results["backtests"] 
                if bt["status"] == status_filter
            ]
            results["backtests"] = filtered_backtests
            results["total_count"] = len(filtered_backtests)
        
        return results
        
    except Exception as e:
        logger.error(f"Error listing backtests: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error listing backtests"
        )

# ============================================================================
# AI/CHAT ENDPOINTS
# ============================================================================

@app.post("/api/chat/message")
async def send_chat_message(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Send message to AI assistant for dashboard Q&A or support
    
    Request body:
    - message: User's question/message
    - context: Optional context object
    - date_range: Optional explicit date range {start: "YYYY-MM-DD", end: "YYYY-MM-DD"}
    """
    try:
        message = request.get("message", "").strip()
        if not message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get AI assistant
        ai_assistant = get_ai_assistant(mongo_db)
        
        context = request.get("context")
        date_range = request.get("date_range")
        
        # Determine if this is a dashboard query or general support
        message_lower = message.lower()
        
        is_dashboard_query = any(x in message_lower for x in [
            "performance", "pnl", "profit", "loss", "trade", "win rate", 
            "return", "equity", "drawdown", "sharpe", "my results",
            "how am i doing", "show me", "analyze"
        ])
        
        if is_dashboard_query:
            # Handle dashboard-related query
            response = await ai_assistant.handle_dashboard_query(
                user_id=current_user["user_id"],
                message=message,
                context=context,
                date_range=date_range
            )
        else:
            # Handle general support query
            response = await ai_assistant.handle_support_query(
                message=message,
                context=context
            )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing your message"
        )

@app.post("/api/chat/upload-watchlist")
async def upload_watchlist_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload Excel/CSV file for watchlist import
    
    Supports .csv, .xlsx, .xls files up to 5MB
    Returns preview and suggested column mappings
    """
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get AI assistant
        ai_assistant = get_ai_assistant(mongo_db)
        
        # Process file upload
        result = await ai_assistant.handle_watchlist_upload(
            user_id=current_user["user_id"],
            file=file
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading watchlist file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing uploaded file"
        )

@app.post("/api/chat/confirm-watchlist")
async def confirm_watchlist_import(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Confirm watchlist import with user-specified column mapping
    
    Request body:
    - import_id: Import ID from upload response
    - column_mapping: Object mapping fields to source columns
    - watchlist_name: Name for the new watchlist
    """
    try:
        import_id = request.get("import_id")
        column_mapping = request.get("column_mapping", {})
        watchlist_name = request.get("watchlist_name", "").strip()
        
        if not import_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="import_id is required"
            )
        
        if not watchlist_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="watchlist_name is required"
            )
        
        if not column_mapping.get("ticker"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ticker column mapping is required"
            )
        
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Get AI assistant
        ai_assistant = get_ai_assistant(mongo_db)
        
        # Confirm import
        result = await ai_assistant.confirm_watchlist_import(
            user_id=current_user["user_id"],
            import_id=import_id,
            column_mapping=column_mapping,
            watchlist_name=watchlist_name
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming watchlist import: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error importing watchlist"
        )

# ============================================================================
# WATCHLIST ENDPOINTS
# ============================================================================

@app.get("/api/watchlists")
async def get_watchlists(
    current_user: dict = Depends(get_current_user)
):
    """Get all watchlists for the current user"""
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Fetch watchlists
        cursor = mongo_db.watchlists.find({"user_id": current_user["user_id"]})
        watchlists = await cursor.to_list(length=None)
        
        # Format response
        formatted_watchlists = []
        for wl in watchlists:
            formatted_watchlists.append({
                "id": wl["id"],
                "name": wl["name"],
                "description": wl.get("description"),
                "columns": wl.get("columns", []),
                "created_at": wl["created_at"],
                "updated_at": wl["updated_at"]
            })
        
        return {
            "watchlists": formatted_watchlists,
            "total_count": len(formatted_watchlists)
        }
        
    except Exception as e:
        logger.error(f"Error fetching watchlists: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching watchlists"
        )

@app.post("/api/watchlists")
async def create_watchlist(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new watchlist"""
    try:
        name = request.get("name", "").strip()
        description = request.get("description", "").strip()
        columns = request.get("columns", [])
        
        if not name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Watchlist name is required"
            )
        
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Check if watchlist name already exists
        existing = await mongo_db.watchlists.find_one({
            "user_id": current_user["user_id"],
            "name": name
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Watchlist with this name already exists"
            )
        
        # Create watchlist record
        watchlist_id = str(uuid.uuid4())
        watchlist_record = {
            "id": watchlist_id,
            "user_id": current_user["user_id"],
            "name": name,
            "description": description,
            "columns": columns,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Store watchlist
        await mongo_db.watchlists.insert_one(watchlist_record)
        
        return {
            "id": watchlist_id,
            "name": name,
            "description": description,
            "columns": columns,
            "created_at": watchlist_record["created_at"],
            "updated_at": watchlist_record["updated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating watchlist: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating watchlist"
        )

@app.get("/api/watchlists/{watchlist_id}/items")
async def get_watchlist_items(
    watchlist_id: str,
    limit: int = 50,
    offset: int = 0,
    columns: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get items in a watchlist"""
    try:
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Verify watchlist ownership
        watchlist = await mongo_db.watchlists.find_one({
            "id": watchlist_id,
            "user_id": current_user["user_id"]
        })
        
        if not watchlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Watchlist not found"
            )
        
        # Count total items
        total_count = await mongo_db.watchlist_items.count_documents({
            "watchlist_id": watchlist_id,
            "user_id": current_user["user_id"]
        })
        
        # Fetch items with pagination
        cursor = mongo_db.watchlist_items.find({
            "watchlist_id": watchlist_id,
            "user_id": current_user["user_id"]
        }).sort("created_at", -1).skip(offset).limit(limit)
        
        items = await cursor.to_list(length=limit)
        
        # Format items
        formatted_items = []
        for item in items:
            formatted_items.append({
                "id": item["id"],
                "ticker": item["ticker"],
                "data": item["data"],
                "created_at": item["created_at"],
                "updated_at": item["updated_at"]
            })
        
        return {
            "items": formatted_items,
            "total_count": total_count,
            "columns_config": watchlist.get("columns", []),
            "has_more": (offset + len(formatted_items)) < total_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching watchlist items: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching watchlist items"
        )

@app.post("/api/watchlists/{watchlist_id}/items")
async def add_watchlist_item(
    watchlist_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Add item to watchlist"""
    try:
        ticker = request.get("ticker", "").strip().upper()
        data = request.get("data", {})
        
        if not ticker:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ticker is required"
            )
        
        # Validate ticker format
        import re
        if not re.match(r'^[A-Z0-9]{1,10}$', ticker):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ticker format"
            )
        
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Verify watchlist ownership
        watchlist = await mongo_db.watchlists.find_one({
            "id": watchlist_id,
            "user_id": current_user["user_id"]
        })
        
        if not watchlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Watchlist not found"
            )
        
        # Check for duplicates
        existing = await mongo_db.watchlist_items.find_one({
            "watchlist_id": watchlist_id,
            "user_id": current_user["user_id"],
            "ticker": ticker
        })
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ticker {ticker} already exists in this watchlist"
            )
        
        # Create item
        item_id = str(uuid.uuid4())
        item_record = {
            "id": item_id,
            "watchlist_id": watchlist_id,
            "user_id": current_user["user_id"],
            "ticker": ticker,
            "data": data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Store item
        await mongo_db.watchlist_items.insert_one(item_record)
        
        return {
            "id": item_id,
            "ticker": ticker,
            "data": data,
            "created_at": item_record["created_at"],
            "updated_at": item_record["updated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding watchlist item: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error adding item to watchlist"
        )

@app.put("/api/watchlists/{watchlist_id}/settings")
async def update_watchlist_settings(
    watchlist_id: str,
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update watchlist column settings"""
    try:
        columns = request.get("columns", [])
        
        # Get MongoDB connection
        mongo_db = get_mongodb()
        
        # Verify watchlist ownership
        watchlist = await mongo_db.watchlists.find_one({
            "id": watchlist_id,
            "user_id": current_user["user_id"]
        })
        
        if not watchlist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Watchlist not found"
            )
        
        # Update watchlist
        await mongo_db.watchlists.update_one(
            {"id": watchlist_id},
            {"$set": {
                "columns": columns,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {
            "columns_config": columns,
            "updated_at": datetime.utcnow().isoformat(),
            "message": "Watchlist settings updated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating watchlist settings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating watchlist settings"
        )

# ============================================================================
# HEALTH CHECK AND SYSTEM STATUS ENDPOINTS
# ============================================================================

@app.get("/api/health")
async def health_check():
    """Comprehensive health check for all system components"""
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "databases": {},
            "services": {}
        }
        
        # Test MongoDB connection
        try:
            mongo_db = get_mongodb()
            # Ping MongoDB
            await mongo_db.command("ping")
            health_status["databases"]["mongodb"] = {
                "status": "healthy",
                "message": "Connected successfully"
            }
        except Exception as e:
            health_status["databases"]["mongodb"] = {
                "status": "unhealthy", 
                "message": f"Connection failed: {str(e)}"
            }
            health_status["status"] = "degraded"
        
        # Test SQL Database connection
        try:
            # Test PostgreSQL connection (using proper session management)
            from database import SessionLocal
            db = SessionLocal()
            try:
                # Simple query to test connection  
                result = db.execute("SELECT 1")
                health_status["databases"]["postgresql"] = {
                    "status": "healthy",
                    "message": "Connected successfully"
                }
            finally:
                db.close()
        except Exception as e:
            health_status["databases"]["postgresql"] = {
                "status": "unhealthy",
                "message": f"Connection failed: {str(e)}"
            }
            health_status["status"] = "degraded"
        
        # Test broker services
        broker_service = BrokerService()
        available_brokers = broker_service.get_available_brokers()
        
        configured_count = sum(1 for broker in available_brokers.values() if broker.get("configured", False))
        total_count = len(available_brokers)
        
        health_status["services"]["broker_integrations"] = {
            "status": "healthy" if configured_count > 0 else "warning",
            "message": f"{configured_count}/{total_count} brokers configured"
        }
        
        # Test market data (if Polygon key is configured)
        polygon_key = os.getenv("POLYGON_API_KEY")
        if polygon_key:
            try:
                # Simple test - could expand to actual API call
                health_status["services"]["market_data"] = {
                    "status": "configured",
                    "message": "Polygon API key configured"
                }
            except Exception as e:
                health_status["services"]["market_data"] = {
                    "status": "error",
                    "message": f"Market data error: {str(e)}"
                }
                health_status["status"] = "degraded"
        else:
            health_status["services"]["market_data"] = {
                "status": "not_configured",
                "message": "No market data API key configured"
            }
        
        # Overall status determination
        unhealthy_components = []
        for category in ["databases", "services"]:
            for name, component in health_status[category].items():
                if component["status"] in ["unhealthy", "error"]:
                    unhealthy_components.append(f"{category}.{name}")
        
        if unhealthy_components:
            health_status["status"] = "unhealthy"
            health_status["unhealthy_components"] = unhealthy_components
        elif health_status["status"] != "degraded":
            health_status["status"] = "healthy"
        
        # Return appropriate HTTP status
        if health_status["status"] == "healthy":
            return health_status
        elif health_status["status"] == "degraded":
            return Response(
                content=json.dumps(health_status),
                status_code=200,  # Still functional but with issues
                media_type="application/json"
            )
        else:  # unhealthy
            return Response(
                content=json.dumps(health_status),
                status_code=503,  # Service Unavailable
                media_type="application/json"
            )
            
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return Response(
            content=json.dumps({
                "status": "error",
                "message": f"Health check failed: {str(e)}",
                "timestamp": datetime.utcnow().isoformat()
            }),
            status_code=500,
            media_type="application/json"
        )

@app.get("/api/health/ready")
async def readiness_check():
    """Kubernetes readiness probe - checks if app is ready to serve traffic"""
    try:
        # Test critical dependencies
        mongo_db = get_mongodb()
        await mongo_db.command("ping")
        
        # Test SQL database connection
        db_manager.get_sql_session().execute("SELECT 1")
        
        return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}
        
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service not ready: {str(e)}"
        )

@app.get("/api/health/live") 
async def liveness_check():
    """Kubernetes liveness probe - checks if app is alive"""
    return {
        "status": "alive", 
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": "unknown"  # Could add actual uptime tracking
    }

@app.get("/api/system/status")
async def get_system_status(
    current_user: dict = Depends(get_current_user)
):
    """Detailed system status for admin monitoring"""
    try:
        # Get basic health status
        health_response = await health_check()
        if isinstance(health_response, Response):
            health_data = json.loads(health_response.body)
        else:
            health_data = health_response
        
        # Add additional system information
        system_status = {
            **health_data,
            "system_info": {
                "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
                "platform": sys.platform,
                "memory_usage": "unknown",  # Could add psutil for detailed metrics
                "cpu_usage": "unknown"
            },
            "database_stats": {},
            "service_stats": {}
        }
        
        # Add database statistics if healthy
        if health_data["databases"]["mongodb"]["status"] == "healthy":
            try:
                mongo_db = get_mongodb()
                # Get collection stats
                collections_stats = {}
                for collection_name in ["users", "trades", "daily_performance", "broker_connections", "strategies"]:
                    try:
                        count = await mongo_db[collection_name].count_documents({})
                        collections_stats[collection_name] = {"count": count}
                    except:
                        collections_stats[collection_name] = {"count": "error"}
                
                system_status["database_stats"]["mongodb"] = {
                    "collections": collections_stats
                }
            except Exception as e:
                logger.warning(f"Could not get MongoDB stats: {str(e)}")
        
        return system_status
        
    except Exception as e:
        logger.error(f"System status error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching system status: {str(e)}"
        )

# ================================
# Support Endpoints
# ================================

@app.post("/api/support/submit")
async def submit_support_request(
    name: str = Form(...),
    email: str = Form(...),
    issueType: str = Form(...),
    message: str = Form(...),
    attachments: List[UploadFile] = File(default=[])
):
    """Submit a support request with optional file attachments"""
    try:
        # Create support request document
        support_request = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "issue_type": issueType,
            "message": message,
            "status": "new",
            "created_at": datetime.utcnow(),
            "attachments": []
        }

        # Handle file attachments
        attachment_dir = "/tmp/support_attachments"
        os.makedirs(attachment_dir, exist_ok=True)
        
        for attachment in attachments:
            if attachment.filename:
                # Sanitize filename
                safe_filename = f"{support_request['id']}_{attachment.filename}"
                file_path = os.path.join(attachment_dir, safe_filename)
                
                # Save file
                with open(file_path, "wb") as buffer:
                    content = await attachment.read()
                    buffer.write(content)
                
                support_request["attachments"].append({
                    "filename": attachment.filename,
                    "filepath": file_path,
                    "content_type": attachment.content_type,
                    "size": len(content)
                })

        # Store in database (MongoDB)
        if db is not None:
            await db.support_requests.insert_one(support_request)
            logger.info(f"Support request submitted: {support_request['id']}")
        
        # Log the request for debugging
        logger.info(f"Support request from {email}: {issueType} - {message[:100]}...")
        
        return {
            "status": "success",
            "message": "Support request submitted successfully",
            "request_id": support_request["id"]
        }

    except Exception as e:
        logger.error(f"Error submitting support request: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting support request: {str(e)}"
        )

# =====================================
# CHAT ENDPOINTS
# =====================================

@app.post("/api/chat/send")
async def send_chat_message(
    request: dict
    # current_user: dict = Depends(get_current_user)  # Temporarily disabled
):
    """Send a message to the AI assistant"""
    try:
        from services.chat_service import chat_service
        
        message = request.get('message', '')
        session_id = request.get('session_id')
        llm_provider = request.get('llm_provider', 'claude')  # Default to Claude
        user_context = request.get('context', {})
        
        if not message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message cannot be empty"
            )
        
        # Create session if not provided - use mock user ID for now
        if not session_id:
            session_id = await chat_service.create_chat_session('demo_user')
        
        # Add user context - use mock user data
        user_context.update({
            'user_id': 'demo_user',
            'user_name': 'Demo User'
        })
        
        # Send message
        response = await chat_service.send_message(session_id, message, llm_provider, user_context)
        
        return response
        
    except Exception as e:
        logger.error(f"Error sending chat message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending message: {str(e)}"
        )

@app.get("/api/chat/history/{session_id}")
async def get_chat_history(
    session_id: str
    # current_user: dict = Depends(get_current_user)  # Temporarily disabled
):
    """Get conversation history"""
    try:
        from services.chat_service import chat_service
        
        response = await chat_service.get_conversation_history(session_id)
        return response
        
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting history: {str(e)}"
        )

@app.post("/api/chat/clear/{session_id}")
async def clear_chat_history(
    session_id: str
    # current_user: dict = Depends(get_current_user)  # Temporarily disabled
):
    """Clear conversation history"""
    try:
        from services.chat_service import chat_service
        
        response = await chat_service.clear_conversation(session_id)
        return response
        
    except Exception as e:
        logger.error(f"Error clearing chat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing history: {str(e)}"
        )

@app.post("/api/chat/session")
async def create_chat_session():
    """Create a new chat session"""
    try:
        from services.chat_service import chat_service
        
        session_id = await chat_service.create_chat_session('demo_user')
        
        return {
            'success': True,
            'session_id': session_id
        }
        
    except Exception as e:
        logger.error(f"Error creating chat session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating session: {str(e)}"
        )

# =====================================
# LLM CONNECTIVITY ENDPOINTS
# =====================================

@app.get("/api/llm/providers")
async def get_llm_providers():
    """Get available LLM providers"""
    try:
        from services.chat_service import chat_service
        
        return {
            'success': True,
            'providers': [
                {
                    'id': 'claude',
                    'name': 'Claude (Anthropic)',
                    'model': 'claude-3-7-sonnet-20250219',
                    'configured': bool(chat_service.api_key)
                },
                {
                    'id': 'chatgpt', 
                    'name': 'ChatGPT (OpenAI)',
                    'model': 'gpt-4o',
                    'configured': bool(chat_service.api_key)
                }
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting LLM providers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting providers: {str(e)}"
        )

@app.post("/api/llm/test/{provider}")
async def test_llm_connection(
    provider: str
    # current_user: dict = Depends(get_current_user)  # Temporarily disabled
):
    """Test connection to specific LLM provider"""
    try:
        from services.chat_service import chat_service
        
        # Create a test session
        test_session_id = f"test_{uuid.uuid4().hex[:8]}"
        
        # Send a simple test message
        response = await chat_service.send_message(
            session_id=test_session_id,
            message="Hello! Please respond with just 'Connection successful'",
            llm_provider=provider
        )
        
        if response.get('success'):
            return {
                'success': True,
                'message': f'{provider.title()} connection successful',
                'provider': provider,
                'response': response.get('message', '')[:100] + '...' if len(response.get('message', '')) > 100 else response.get('message', '')
            }
        else:
            return {
                'success': False,
                'message': f'{provider.title()} connection failed',
                'provider': provider,
                'error': response.get('error', 'Unknown error')
            }
        
    except Exception as e:
        logger.error(f"Error testing {provider} connection: {str(e)}")
        return {
            'success': False,
            'message': f'{provider.title()} connection failed',
            'provider': provider,
            'error': str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)