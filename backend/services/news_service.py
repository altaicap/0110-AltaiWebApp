"""
Production-ready news service for Newsware and TradeXchange APIs
"""

import asyncio
import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class NewsArticle(BaseModel):
    """Standardized news article model"""
    id: str
    headline: str
    body: str
    source: str
    published_at: datetime
    tickers: List[str] = []
    category: Optional[str] = None
    metadata: Dict[str, Any] = {}


class NewsService:
    """Unified news service for multiple providers"""
    
    def __init__(self, newsware_api_key: Optional[str] = None, tradexchange_api_key: Optional[str] = None):
        self.newsware_api_key = newsware_api_key
        self.tradexchange_api_key = tradexchange_api_key
        self.newsware_base_url = "https://api.newsware.com"
        self.tradexchange_base_url = "https://api.tradexchange.com"
        
    async def get_live_news(self, limit: int = 50) -> List[NewsArticle]:
        """Get live news from all configured sources"""
        articles = []
        
        # Fetch from Newsware
        if self.newsware_api_key:
            try:
                newsware_articles = await self._fetch_newsware_articles(limit=limit//2)
                articles.extend(newsware_articles)
                logger.info(f"Fetched {len(newsware_articles)} articles from Newsware")
            except Exception as e:
                logger.error(f"Newsware API error: {e}")
        else:
            # Mock Newsware articles with clear labeling
            mock_articles = self._generate_mock_newsware_articles(limit//2)
            articles.extend(mock_articles)
            logger.info(f"Using {len(mock_articles)} mock Newsware articles (no API key)")
            
        # Fetch from TradeXchange
        if self.tradexchange_api_key:
            try:
                tradexchange_articles = await self._fetch_tradexchange_articles(limit=limit//2)
                articles.extend(tradexchange_articles)
                logger.info(f"Fetched {len(tradexchange_articles)} articles from TradeXchange")
            except Exception as e:
                logger.error(f"TradeXchange API error: {e}")
        else:
            # Mock TradeXchange articles with clear labeling
            mock_articles = self._generate_mock_tradexchange_articles(limit//2)
            articles.extend(mock_articles)
            logger.info(f"Using {len(mock_articles)} mock TradeXchange articles (no API key)")
            
        # Sort by published date (newest first)
        articles.sort(key=lambda x: x.published_at, reverse=True)
        
        return articles[:limit]
        
    async def _fetch_newsware_articles(self, limit: int = 25) -> List[NewsArticle]:
        """Fetch real articles from Newsware API"""
        headers = {
            'Authorization': f'Bearer {self.newsware_api_key}',
            'Content-Type': 'application/json'
        }
        
        params = {
            'limit': limit,
            'sort': 'published_at:desc'
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.newsware_base_url}/v1/articles",
                headers=headers,
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._normalize_newsware_articles(data.get('articles', []))
            elif response.status_code == 401:
                raise Exception("Newsware API: Invalid API key")
            elif response.status_code == 403:
                raise Exception("Newsware API: Access forbidden - check subscription")
            else:
                raise Exception(f"Newsware API error: {response.status_code} - {response.text}")
                
    async def _fetch_tradexchange_articles(self, limit: int = 25) -> List[NewsArticle]:
        """Fetch real articles from TradeXchange API"""
        headers = {
            'X-API-Key': self.tradexchange_api_key,
            'Content-Type': 'application/json'
        }
        
        params = {
            'limit': limit,
            'sort': 'timestamp',
            'order': 'desc'
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.tradexchange_base_url}/news/feed",
                headers=headers,
                params=params
            )
            
            if response.status_code == 200:
                data = response.json()
                return self._normalize_tradexchange_articles(data.get('news', []))
            elif response.status_code == 401:
                raise Exception("TradeXchange API: Invalid API key")
            elif response.status_code == 403:
                raise Exception("TradeXchange API: Access forbidden - check subscription")
            else:
                raise Exception(f"TradeXchange API error: {response.status_code} - {response.text}")
                
    def _normalize_newsware_articles(self, raw_articles: List[Dict[str, Any]]) -> List[NewsArticle]:
        """Normalize Newsware articles to standard format"""
        articles = []
        
        for raw in raw_articles:
            try:
                article = NewsArticle(
                    id=f"nw_{raw.get('id', 'unknown')}",
                    headline=raw.get('title', 'No title'),
                    body=raw.get('content', raw.get('summary', 'No content')),
                    source='NewsWare',
                    published_at=self._parse_datetime(raw.get('published_at')),
                    tickers=raw.get('symbols', []),
                    category=raw.get('category'),
                    metadata={
                        'priority': raw.get('priority', 'normal'),
                        'sentiment': raw.get('sentiment'),
                        'source_url': raw.get('url')
                    }
                )
                articles.append(article)
            except Exception as e:
                logger.warning(f"Error normalizing Newsware article: {e}")
                continue
                
        return articles
        
    def _normalize_tradexchange_articles(self, raw_articles: List[Dict[str, Any]]) -> List[NewsArticle]:
        """Normalize TradeXchange articles to standard format"""
        articles = []
        
        for raw in raw_articles:
            try:
                article = NewsArticle(
                    id=f"tx_{raw.get('id', 'unknown')}",
                    headline=raw.get('headline', 'No headline'),
                    body=raw.get('body', raw.get('excerpt', 'No content')),
                    source='TradeXchange',
                    published_at=self._parse_datetime(raw.get('timestamp')),
                    tickers=raw.get('tickers', []),
                    category=raw.get('section'),
                    metadata={
                        'importance': raw.get('importance', 'medium'),
                        'region': raw.get('region'),
                        'source_url': raw.get('link')
                    }
                )
                articles.append(article)
            except Exception as e:
                logger.warning(f"Error normalizing TradeXchange article: {e}")
                continue
                
        return articles
        
    def _generate_mock_newsware_articles(self, limit: int = 25) -> List[NewsArticle]:
        """Generate mock NewsWare articles with clear labeling"""
        articles = []
        
        for i in range(limit):
            articles.append(NewsArticle(
                id=f"mock_nw_{i}",
                headline=f"[MOCK] Tech Stocks Rally Continues - Update {i+1}",
                body=f"[MOCK MODE ACTIVE] Technology stocks continue their upward momentum as investors show renewed confidence in the sector. This is mock article {i+1} generated because no Newsware API key is configured. In production, this would contain real financial news from Newsware's premium feed.",
                source='NewsWare',
                published_at=datetime.utcnow() - timedelta(minutes=i*15),
                tickers=['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'][i % 5:i % 5 + 2],
                category='technology',
                metadata={
                    'priority': 'high',
                    'mock_mode': True,
                    'note': 'This is mock data - configure NEWSWARE_API_KEY for real articles'
                }
            ))
            
        return articles
        
    def _generate_mock_tradexchange_articles(self, limit: int = 25) -> List[NewsArticle]:
        """Generate mock TradeXchange articles with clear labeling"""
        articles = []
        
        headlines = [
            "[MOCK] Federal Reserve Signals Policy Shift",
            "[MOCK] Energy Sector Outperforms Market",
            "[MOCK] Earnings Season Beats Expectations",
            "[MOCK] Cryptocurrency Market Update",
            "[MOCK] Healthcare Innovation Announcement"
        ]
        
        for i in range(limit):
            articles.append(NewsArticle(
                id=f"mock_tx_{i}",
                headline=headlines[i % len(headlines)] + f" - Update {i+1}",
                body=f"[MOCK MODE ACTIVE] This is a simulated TradeXchange article {i+1}. The TradeXchange API provides real-time financial news and market-moving events. Configure TRADEXCHANGE_API_KEY in your environment to receive actual news articles from their premium feed instead of this mock content.",
                source='TradeXchange',
                published_at=datetime.utcnow() - timedelta(minutes=i*20 + 5),
                tickers=['SPY', 'QQQ', 'IWM', 'DIA', 'XLF'][i % 5:i % 5 + 1],
                category='markets',
                metadata={
                    'importance': 'medium',
                    'mock_mode': True,
                    'note': 'This is mock data - configure TRADEXCHANGE_API_KEY for real articles'
                }
            ))
            
        return articles
        
    def _parse_datetime(self, dt_string: Any) -> datetime:
        """Parse datetime string with multiple format support"""
        if isinstance(dt_string, datetime):
            return dt_string
            
        if not dt_string:
            return datetime.utcnow()
            
        # Try common datetime formats
        formats = [
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%dT%H:%M:%S',
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(str(dt_string), fmt)
            except ValueError:
                continue
                
        # If all parsing fails, return current time
        logger.warning(f"Could not parse datetime: {dt_string}")
        return datetime.utcnow()
        
    async def test_connections(self) -> Dict[str, Dict[str, Any]]:
        """Test connections to all news APIs"""
        results = {}
        
        # Test Newsware
        if self.newsware_api_key:
            try:
                articles = await self._fetch_newsware_articles(limit=1)
                results['newsware'] = {
                    'status': 'connected',
                    'message': f'Successfully fetched {len(articles)} articles',
                    'mode': 'live'
                }
            except Exception as e:
                results['newsware'] = {
                    'status': 'error',
                    'message': str(e),
                    'mode': 'error'
                }
        else:
            results['newsware'] = {
                'status': 'mock',
                'message': 'Mock mode active - no API key configured',
                'mode': 'mock'
            }
            
        # Test TradeXchange
        if self.tradexchange_api_key:
            try:
                articles = await self._fetch_tradexchange_articles(limit=1)
                results['tradexchange'] = {
                    'status': 'connected',
                    'message': f'Successfully fetched {len(articles)} articles',
                    'mode': 'live'
                }
            except Exception as e:
                results['tradexchange'] = {
                    'status': 'error',
                    'message': str(e),
                    'mode': 'error'
                }
        else:
            results['tradexchange'] = {
                'status': 'mock',
                'message': 'Mock mode active - no API key configured',
                'mode': 'mock'
            }
            
        return results