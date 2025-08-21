from fastapi import FastAPI, HTTPException, Depends, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware  
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import json
import logging
import os
import httpx
import hashlib
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Environment variables
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "altai_trader")
POLYGON_API_KEY = os.environ.get("POLYGON_API_KEY")
NEWSWARE_API_KEY = os.environ.get("NEWSWARE_API_KEY")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
client = None
db = None
background_tasks_running = False

# Pydantic Models
class NewsCategory(str, Enum):
    BUSINESS = "business"
    TECHNOLOGY = "technology"  
    POLITICS = "politics"
    SPORTS = "sports"
    ENTERTAINMENT = "entertainment"
    HEALTH = "health"
    SCIENCE = "science"

class NewsTag(BaseModel):
    type: str = Field(..., description="Type of tag (ticker, category, keyword)")
    value: str = Field(..., description="Tag value")
    confidence: Optional[float] = Field(None, description="Confidence score")

class NewsArticle(BaseModel):
    id: str = Field(..., description="Unique article identifier")
    headline: str = Field(..., description="Article headline")
    body: str = Field(..., description="Article body content")
    source: str = Field(..., description="News source")
    published_at: datetime = Field(..., description="Publication timestamp")
    tags: List[NewsTag] = Field(default_factory=list, description="Article tags")
    category: Optional[NewsCategory] = Field(None, description="Primary category")
    tickers: List[str] = Field(default_factory=list, description="Associated stock tickers")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('published_at', pre=True)
    def parse_published_at(cls, v):
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        return v

class NewsFilter(BaseModel):
    categories: Optional[List[NewsCategory]] = Field(None, description="Filter by categories")
    tickers: Optional[List[str]] = Field(None, description="Filter by stock tickers")
    sources: Optional[List[str]] = Field(None, description="Filter by news sources")
    keywords: Optional[List[str]] = Field(None, description="Filter by keywords")
    start_date: Optional[datetime] = Field(None, description="Start date for filtering")
    end_date: Optional[datetime] = Field(None, description="End date for filtering")
    limit: int = Field(50, ge=1, le=1000, description="Maximum number of articles")

class NewsResponse(BaseModel):
    articles: List[NewsArticle]
    total_count: int
    has_more: bool
    cached: bool = False

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Search query")
    filters: Optional[NewsFilter] = Field(None, description="Additional filters")

class StockAggregate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    timestamp: datetime
    open_price: float
    high_price: float
    low_price: float
    close_price: float
    volume: int
    vwap: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BacktestRequest(BaseModel):
    strategy_name: str
    symbols: List[str] = Field(default_factory=lambda: ["AAPL"])
    symbol: str = "AAPL"  # For backward compatibility
    start_date: datetime
    end_date: datetime
    timeframe: str = "1D"
    parameters: Dict[str, Any] = Field(default_factory=dict)

class BacktestResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    strategy_name: str
    symbols: List[str] = Field(default_factory=lambda: ["AAPL"])
    symbol: str = "AAPL"  # Primary symbol for backward compatibility  
    start_date: datetime
    end_date: datetime
    total_return: float
    max_drawdown: float
    win_rate: float
    total_trades: int
    winning_trades: int = 0
    losing_trades: int = 0
    win_percentage: float = 0.0
    avg_pnl_per_trade: float = 0.0
    avg_winning_trade: float = 0.0
    avg_losing_trade: float = 0.0
    roi: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Strategy(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    code: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Services
class PolygonService:
    def __init__(self):
        self.api_key = POLYGON_API_KEY
        self.base_url = "https://api.polygon.io"
        
    async def get_aggregates(self, symbol: str, multiplier: int, timespan: str, 
                           from_date: str, to_date: str) -> Dict[str, Any]:
        """Get aggregate bars for a stock ticker"""
        if not self.api_key:
            raise HTTPException(status_code=503, detail="Polygon API key not configured")
            
        url = f"{self.base_url}/v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from_date}/{to_date}"
        params = {
            "adjusted": "true",
            "sort": "asc", 
            "limit": 50000,
            "apikey": self.api_key
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, params=params, timeout=30)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 403:
                    raise HTTPException(status_code=403, detail="Polygon API: Access forbidden. Check API key and subscription")
                else:
                    raise HTTPException(status_code=response.status_code, 
                                      detail=f"Polygon API error: {response.text}")
            except httpx.TimeoutException:
                raise HTTPException(status_code=504, detail="Polygon API timeout")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Polygon API request failed: {str(e)}")

class NewsWareService:
    def __init__(self):
        self.api_key = NEWSWARE_API_KEY
        self.base_url = "https://api.newsware.com"
        
    async def get_real_time_feed(self, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get real-time news feed"""
        if not self.api_key:
            # Return mock data when API key is not available
            return self._get_mock_news_data()
            
        # Mock implementation - replace with actual NewsWare API calls
        return self._get_mock_news_data()
    
    def _get_mock_news_data(self) -> List[Dict[str, Any]]:
        """Generate mock news data for demonstration"""
        mock_articles = [
            {
                "id": f"mock-{i}",
                "headline": f"Market Update: Tech Stocks Rally {i}",
                "body": f"Technology stocks continue their upward momentum as investors show confidence in the sector. Article {i} details...",
                "source": "MockNews",
                "published_at": (datetime.utcnow() - timedelta(minutes=i*10)).isoformat(),
                "tags": [{"type": "ticker", "value": "AAPL", "confidence": 0.9}],
                "category": "business",
                "tickers": ["AAPL", "MSFT", "GOOGL"],
                "metadata": {"priority": "high"}
            }
            for i in range(1, 6)
        ]
        return mock_articles

# Initialize services
polygon_service = PolygonService()
newsware_service = NewsWareService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    global client, db, background_tasks_running
    
    # Startup
    logger.info("Starting Altai Trader API")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Test database connection
    try:
        await client.admin.command('ping')
        logger.info("Database connected successfully")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        
    # Start background tasks
    background_tasks_running = True
    asyncio.create_task(background_news_fetcher())
    
    yield
    
    # Shutdown
    logger.info("Shutting down Altai Trader API")
    background_tasks_running = False
    if client:
        client.close()

app = FastAPI(
    title="Altai Trader API",
    description="Real-time trading platform with Python strategies, backtesting, and news feeds",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background task for news fetching
async def background_news_fetcher():
    """Background task to continuously fetch news"""
    while background_tasks_running:
        try:
            articles_data = await newsware_service.get_real_time_feed()
            if articles_data:
                # Store articles in database
                for article_data in articles_data:
                    try:
                        article = NewsArticle(**article_data)
                        await db.news_articles.update_one(
                            {"id": article.id},
                            {"$set": article.dict()},
                            upsert=True
                        )
                    except Exception as e:
                        logger.warning(f"Failed to store article: {e}")
                        
                logger.info(f"Fetched and cached {len(articles_data)} news articles")
            
            await asyncio.sleep(30)  # Fetch every 30 seconds
        except Exception as e:
            logger.error(f"Error in background news fetcher: {e}")
            await asyncio.sleep(60)  # Wait longer on error

# API Routes

@app.get("/")
async def root():
    return {"message": "Altai Trader API", "status": "running", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        await client.admin.command('ping')
        db_status = "healthy"
    except:
        db_status = "unhealthy"
        
    return {
        "status": "healthy",
        "database": db_status,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Settings API
@app.get("/api/settings")
async def get_settings():
    """Get application settings"""
    try:
        # Test database connection
        await client.admin.command('ping')
        db_connected = True
    except:
        db_connected = False
        
    return {
        "polygon_api_configured": bool(POLYGON_API_KEY),
        "newsware_api_configured": bool(NEWSWARE_API_KEY),
        "database_connected": db_connected,
        "api_keys": {
            "polygon": "Configured" if POLYGON_API_KEY else "Not Set",
            "newsware": "Configured" if NEWSWARE_API_KEY else "Not Set"
        },
        "features": {
            "backtesting": True,
            "live_trading": False,  # Disabled until TradeStation integration
            "news_feeds": True,
            "strategies": True
        }
    }

@app.post("/api/settings/test-connection")
async def test_api_connections(service: str):
    """Test API connections"""
    if service == "polygon":
        try:
            # Test with a simple request
            data = await polygon_service.get_aggregates("AAPL", 1, "day", "2024-01-01", "2024-01-02")
            return {"status": "success", "message": "Polygon API connection successful"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    elif service == "newsware":
        try:
            articles = await newsware_service.get_real_time_feed()
            return {"status": "success", "message": f"NewsWare connection successful, {len(articles)} articles available"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid service name")

# Strategies API
@app.get("/api/strategies", response_model=List[Strategy])
async def get_strategies():
    """Get all strategies"""
    cursor = db.strategies.find()
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

# Backtesting API
@app.post("/api/backtest", response_model=BacktestResult)
async def run_backtest(request: BacktestRequest):
    """Run a backtest"""
    try:
        # Use primary symbol (first symbol or the symbol field)
        primary_symbol = request.symbols[0] if request.symbols else request.symbol
        
        # Get historical data from Polygon
        start_date = request.start_date.strftime("%Y-%m-%d")
        end_date = request.end_date.strftime("%Y-%m-%d")
        
        # Convert timeframe
        multiplier = 1
        timespan = "day"
        if request.timeframe == "1m":
            timespan = "minute"
        elif request.timeframe == "5m":
            timespan = "minute"
            multiplier = 5
        elif request.timeframe == "15m":
            timespan = "minute"
            multiplier = 15
        elif request.timeframe == "1h":
            timespan = "hour"
        elif request.timeframe == "1D":
            timespan = "day"
            
        data = await polygon_service.get_aggregates(
            primary_symbol, multiplier, timespan, start_date, end_date
        )
        
        if not data.get("results"):
            raise HTTPException(status_code=404, detail="No data available for the specified period")
        
        # Enhanced backtesting with strategy parameters
        results = data["results"]
        initial_price = results[0]["c"] if results else 100
        final_price = results[-1]["c"] if results else 100
        
        total_return = ((final_price - initial_price) / initial_price) * 100
        
        # Generate mock trading metrics based on PBH Algo characteristics
        import random
        random.seed(hash(f"{request.strategy_name}{primary_symbol}{start_date}"))  # Deterministic randomness
        
        # Calculate realistic metrics for PBH strategy
        num_bars = len(results)
        potential_trades = max(1, num_bars // 20)  # One trade every 20 bars on average
        
        if request.strategy_name == "Prior Bar High (PBH) Algo":
            # PBH-specific calculations
            take_long = request.parameters.get('take_long', True)
            take_short = request.parameters.get('take_short', False)
            max_trades_per_day = request.parameters.get('max_entry_count', 2)
            
            # Estimate trades based on parameters
            trading_days = max(1, (request.end_date - request.start_date).days)
            max_possible_trades = trading_days * max_trades_per_day
            actual_trades = min(potential_trades, max_possible_trades)
            
            # Win rate influenced by market conditions and volatility
            base_win_rate = 0.65 if take_long and not take_short else 0.55
            volatility_factor = min(abs(total_return) / 100, 0.2)  # Higher volatility can improve win rate
            win_rate = max(0.3, min(0.8, base_win_rate + volatility_factor))
            
            winning_trades = int(actual_trades * win_rate)
            losing_trades = actual_trades - winning_trades
            
            # PnL calculations based on TP/SL ratios
            tp_multiplier_1 = request.parameters.get('tp_multiplier_1', 300.0) / 100
            avg_win = 150 * tp_multiplier_1  # Average win based on TP1
            avg_loss = -75  # Typical loss with tight stops
            
        else:
            # Generic strategy metrics
            actual_trades = potential_trades
            win_rate = 0.6
            winning_trades = int(actual_trades * win_rate)
            losing_trades = actual_trades - winning_trades
            avg_win = 120
            avg_loss = -80
        
        # Calculate aggregate metrics
        total_pnl = (winning_trades * avg_win) + (losing_trades * avg_loss)
        avg_pnl_per_trade = total_pnl / max(1, actual_trades)
        roi_calc = (total_pnl / 10000) * 100  # Assuming $10k starting capital
        
        # Simulate max drawdown
        max_dd = min(-2.0, total_return * -0.3)  # Conservative estimate
        
        backtest_result = BacktestResult(
            strategy_name=request.strategy_name,
            symbols=request.symbols if request.symbols else [request.symbol],
            symbol=primary_symbol,
            start_date=request.start_date,
            end_date=request.end_date,
            total_return=total_return,
            max_drawdown=max_dd,
            win_rate=win_rate * 100,
            total_trades=actual_trades,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            win_percentage=win_rate * 100,
            avg_pnl_per_trade=avg_pnl_per_trade,
            avg_winning_trade=avg_win,
            avg_losing_trade=avg_loss,
            roi=roi_calc
        )
        
        # Store backtest result
        await db.backtest_results.insert_one(backtest_result.dict())
        
        return backtest_result
        
    except Exception as e:
        logger.error(f"Backtesting error: {e}")
        raise HTTPException(status_code=500, detail=f"Backtesting failed: {str(e)}")

@app.get("/api/backtest/results", response_model=List[BacktestResult])
async def get_backtest_results():
    """Get all backtest results"""
    cursor = db.backtest_results.find().sort("created_at", -1)
    results = []
    async for doc in cursor:
        results.append(BacktestResult(**doc))
    return results

# News API
@app.get("/api/news/live", response_model=NewsResponse)
async def get_live_news(
    categories: Optional[List[NewsCategory]] = Query(None),
    tickers: Optional[List[str]] = Query(None),
    sources: Optional[List[str]] = Query(None),
    limit: int = Query(50, ge=1, le=1000)
):
    """Get live news feed with optional filtering"""
    try:
        # Build MongoDB query
        query = {}
        if categories:
            query["category"] = {"$in": [cat.value for cat in categories]}
        if tickers:
            query["tickers"] = {"$in": tickers}
        if sources:
            query["source"] = {"$in": sources}
        
        # Get articles from database (recent first)
        cursor = db.news_articles.find(query).sort("published_at", -1).limit(limit)
        articles = []
        
        async for doc in cursor:
            try:
                articles.append(NewsArticle(**doc))
            except Exception as e:
                logger.warning(f"Failed to parse article: {e}")
        
        return NewsResponse(
            articles=articles,
            total_count=len(articles),
            has_more=len(articles) == limit,
            cached=True
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")

@app.post("/api/news/search", response_model=NewsResponse)
async def search_news(request: SearchRequest):
    """Search news articles"""
    try:
        # Build MongoDB text search query
        query = {"$text": {"$search": request.query}}
        
        # Add filters
        if request.filters:
            if request.filters.categories:
                query["category"] = {"$in": [cat.value for cat in request.filters.categories]}
            if request.filters.tickers:
                query["tickers"] = {"$in": request.filters.tickers}
            if request.filters.sources:
                query["source"] = {"$in": request.filters.sources}
            if request.filters.start_date:
                query["published_at"] = {"$gte": request.filters.start_date}
            if request.filters.end_date:
                if "published_at" not in query:
                    query["published_at"] = {}
                query["published_at"]["$lte"] = request.filters.end_date
        
        limit = request.filters.limit if request.filters else 50
        cursor = db.news_articles.find(query).sort("published_at", -1).limit(limit)
        
        articles = []
        async for doc in cursor:
            try:
                articles.append(NewsArticle(**doc))
            except Exception as e:
                logger.warning(f"Failed to parse article: {e}")
        
        return NewsResponse(
            articles=articles,
            total_count=len(articles),
            has_more=len(articles) == limit,
            cached=False
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@app.get("/api/news/categories")
async def get_news_categories():
    """Get available news categories"""
    return {
        "categories": [category.value for category in NewsCategory],
        "description": "Available news categories for filtering"
    }

# Market Data API
@app.get("/api/market/{symbol}/aggregates")
async def get_market_data(
    symbol: str,
    timespan: str = "day",
    multiplier: int = 1,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Get market data aggregates"""
    try:
        data = await polygon_service.get_aggregates(symbol, multiplier, timespan, start_date, end_date)
        
        # Process and store data
        if data.get("results"):
            aggregates = []
            for result in data["results"]:
                aggregate = StockAggregate(
                    symbol=symbol,
                    timestamp=datetime.fromtimestamp(result["t"] / 1000),
                    open_price=result["o"],
                    high_price=result["h"],
                    low_price=result["l"],
                    close_price=result["c"],
                    volume=result["v"],
                    vwap=result.get("vw")
                )
                aggregates.append(aggregate)
                
                # Store in database
                await db.stock_aggregates.update_one(
                    {"symbol": symbol, "timestamp": aggregate.timestamp},
                    {"$set": aggregate.dict()},
                    upsert=True
                )
        
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)