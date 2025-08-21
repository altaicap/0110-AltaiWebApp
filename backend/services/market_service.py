"""
Production market data service with real Polygon integration
"""

import asyncio
import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import pandas as pd

logger = logging.getLogger(__name__)


class MarketDataService:
    """Production market data service using Polygon API"""
    
    def __init__(self, polygon_api_key: Optional[str] = None):
        self.api_key = polygon_api_key
        self.base_url = "https://api.polygon.io"
        
    async def get_aggregates(self, 
                           symbol: str, 
                           multiplier: int, 
                           timespan: str,
                           from_date: str, 
                           to_date: str) -> Dict[str, Any]:
        """Get aggregate bars from Polygon API"""
        if not self.api_key:
            raise ValueError("Polygon API key not configured")
            
        url = f"{self.base_url}/v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{from_date}/{to_date}"
        params = {
            "adjusted": "true",
            "sort": "asc",
            "limit": 50000,
            "apikey": self.api_key
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                logger.info(f"Fetching {symbol} data from {from_date} to {to_date}")
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Validate response
                    if data.get("status") == "OK":
                        results = data.get("results", [])
                        logger.info(f"Successfully fetched {len(results)} bars for {symbol}")
                        return data
                    else:
                        error_msg = data.get("error", "Unknown error")
                        raise Exception(f"Polygon API error: {error_msg}")
                        
                elif response.status_code == 401:
                    raise Exception("Polygon API: Invalid API key")
                elif response.status_code == 403:
                    raise Exception("Polygon API: Access forbidden - check subscription level")
                elif response.status_code == 429:
                    raise Exception("Polygon API: Rate limit exceeded")
                else:
                    raise Exception(f"Polygon API error: {response.status_code} - {response.text}")
                    
            except httpx.TimeoutException:
                raise Exception("Polygon API request timeout")
            except httpx.ConnectError:
                raise Exception("Cannot connect to Polygon API")
            except Exception as e:
                if "Polygon API" in str(e):
                    raise e
                else:
                    raise Exception(f"Polygon API request failed: {str(e)}")
                    
    async def get_tradingview_bars(self,
                                 symbol: str,
                                 resolution: str,
                                 from_timestamp: int,
                                 to_timestamp: int) -> Dict[str, Any]:
        """Get bars formatted for TradingView widget"""
        try:
            # Convert TradingView resolution to Polygon format
            multiplier, timespan = self._parse_tradingview_resolution(resolution)
            
            # Convert timestamps to dates
            from_date = datetime.fromtimestamp(from_timestamp).strftime("%Y-%m-%d")
            to_date = datetime.fromtimestamp(to_timestamp).strftime("%Y-%m-%d")
            
            # Get data from Polygon
            polygon_data = await self.get_aggregates(symbol, multiplier, timespan, from_date, to_date)
            
            # Convert to TradingView format
            tv_data = self._convert_to_tradingview_format(polygon_data.get("results", []))
            
            return {
                "s": "ok",  # Status
                "t": tv_data["times"],
                "o": tv_data["opens"],
                "h": tv_data["highs"],
                "l": tv_data["lows"],
                "c": tv_data["closes"],
                "v": tv_data["volumes"]
            }
            
        except Exception as e:
            logger.error(f"Error getting TradingView bars: {e}")
            return {
                "s": "error",
                "errmsg": str(e)
            }
            
    def _parse_tradingview_resolution(self, resolution: str) -> tuple:
        """Parse TradingView resolution to Polygon multiplier/timespan"""
        if resolution == "1":
            return 1, "minute"
        elif resolution == "5":
            return 5, "minute"
        elif resolution == "15":
            return 15, "minute"
        elif resolution == "30":
            return 30, "minute"
        elif resolution == "60":
            return 1, "hour"
        elif resolution == "1D":
            return 1, "day"
        elif resolution == "1W":
            return 1, "week"
        elif resolution == "1M":
            return 1, "month"
        else:
            # Default to 1 day
            return 1, "day"
            
    def _convert_to_tradingview_format(self, polygon_bars: List[Dict[str, Any]]) -> Dict[str, List]:
        """Convert Polygon bars to TradingView format"""
        times = []
        opens = []
        highs = []
        lows = []
        closes = []
        volumes = []
        
        for bar in polygon_bars:
            times.append(int(bar["t"] / 1000))  # Convert to seconds
            opens.append(float(bar["o"]))
            highs.append(float(bar["h"]))
            lows.append(float(bar["l"]))
            closes.append(float(bar["c"]))
            volumes.append(int(bar["v"]))
            
        return {
            "times": times,
            "opens": opens,
            "highs": highs,
            "lows": lows,
            "closes": closes,
            "volumes": volumes
        }
        
    async def test_connection(self) -> Dict[str, Any]:
        """Test Polygon API connection"""
        if not self.api_key:
            return {
                "status": "error",
                "message": "Polygon API key not configured",
                "mode": "not_configured"
            }
            
        try:
            # Test with a simple request (last 2 days of AAPL data)
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d")
            
            data = await self.get_aggregates("AAPL", 1, "day", start_date, end_date)
            
            if data.get("results"):
                return {
                    "status": "connected",
                    "message": f"Successfully connected - {len(data['results'])} bars retrieved",
                    "mode": "live"
                }
            else:
                return {
                    "status": "warning",
                    "message": "Connected but no data returned - check subscription level",
                    "mode": "limited"
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": str(e),
                "mode": "error"
            }
            
    async def get_symbol_info(self, symbol: str) -> Dict[str, Any]:
        """Get symbol information for TradingView"""
        if not self.api_key:
            raise ValueError("Polygon API key not configured")
            
        url = f"{self.base_url}/v3/reference/tickers/{symbol}"
        params = {"apikey": self.api_key}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("status") == "OK":
                        ticker_info = data.get("results", {})
                        
                        # Format for TradingView
                        return {
                            "symbol": symbol,
                            "description": ticker_info.get("name", symbol),
                            "exchange": ticker_info.get("primary_exchange", "NASDAQ"),
                            "type": "stock",
                            "currency": ticker_info.get("currency_name", "USD"),
                            "timezone": "America/New_York",
                            "minmov": 1,
                            "pricescale": 100,
                            "has_intraday": True,
                            "has_daily": True,
                            "has_weekly_and_monthly": True,
                            "supported_resolutions": ["1", "5", "15", "30", "60", "1D", "1W", "1M"]
                        }
                    else:
                        raise Exception(f"Symbol not found: {symbol}")
                        
                elif response.status_code == 404:
                    raise Exception(f"Symbol not found: {symbol}")
                else:
                    raise Exception(f"Polygon API error: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"Error getting symbol info: {e}")
                # Return default info
                return {
                    "symbol": symbol,
                    "description": symbol,
                    "exchange": "NASDAQ",
                    "type": "stock",
                    "currency": "USD",
                    "timezone": "America/New_York",
                    "minmov": 1,
                    "pricescale": 100,
                    "has_intraday": True,
                    "has_daily": True,
                    "has_weekly_and_monthly": True,
                    "supported_resolutions": ["1", "5", "15", "30", "60", "1D", "1W", "1M"]
                }