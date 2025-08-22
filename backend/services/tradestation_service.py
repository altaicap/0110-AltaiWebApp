"""
TradeStation OAuth 2.0 Integration Service
Implements comprehensive TradeStation API integration with OAuth 2.0 authentication
"""

import os
import asyncio
import logging
import httpx
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, status
from pydantic import BaseModel
from jose import jwt, JWTError

logger = logging.getLogger(__name__)

class TradeStationAccount(BaseModel):
    """TradeStation account information"""
    account_id: str
    name: str
    type: str
    status: str
    currency: str
    margin_enabled: bool
    day_trading_buying_power: float
    overnight_buying_power: float
    cash_balance: float
    equity: float

class TradeStationOrder(BaseModel):
    """TradeStation order structure"""
    symbol: str
    action: str  # BUY, SELL, BTC, SS
    quantity: int
    order_type: str  # MARKET, LIMIT, STOP, STOP_LIMIT
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "DAY"  # DAY, GTC, IOC, FOK
    route: str = "Intelligent"

class TradeStationOAuthService:
    """TradeStation OAuth 2.0 authentication service"""
    
    def __init__(self):
        self.client_id = os.getenv("TRADESTATION_CLIENT_ID")
        self.client_secret = os.getenv("TRADESTATION_CLIENT_SECRET")
        self.redirect_uri = os.getenv("TRADESTATION_REDIRECT_URI", "http://localhost:3000/auth/tradestation/callback")
        
        # TradeStation OAuth endpoints
        self.auth_url = "https://signin.tradestation.com/authorize"
        self.token_url = "https://signin.tradestation.com/oauth/token"
        self.api_base_url = "https://api.tradestation.com"
        
        # Required scopes for comprehensive access
        self.scopes = [
            "openid", "offline_access", "profile", "MarketData", 
            "ReadAccount", "Trade", "Matrix", "OptionSpreads"
        ]
        
        self.timeout = httpx.Timeout(30.0)
    
    def generate_authorization_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """Generate authorization URL for OAuth flow initiation"""
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="TradeStation client credentials not configured"
            )
        
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "audience": "https://api.tradestation.com",
            "state": state,
            "scope": " ".join(self.scopes)
        }
        
        auth_url = f"{self.auth_url}?" + "&".join([f"{k}={v}" for k, v in params.items()])
        
        return {
            "authorization_url": auth_url,
            "state": state
        }
    
    async def exchange_code_for_tokens(self, authorization_code: str, state: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        if not self.client_id or not self.client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="TradeStation client credentials not configured"
            )
        
        token_data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": authorization_code,
            "redirect_uri": self.redirect_uri
        }
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=token_data,
                    headers=headers
                )
                
                if response.status_code != 200:
                    logger.error(f"Token exchange failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Token exchange failed: {response.text}"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token"),
                    "expires_in": token_response.get("expires_in", 1200),
                    "token_type": token_response.get("token_type", "Bearer"),
                    "scope": token_response.get("scope", " ".join(self.scopes))
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during token exchange: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token exchange: {str(e)}"
                )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        if not self.client_id or not self.client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="TradeStation client credentials not configured"
            )
        
        token_data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token
        }
        
        headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    self.token_url,
                    data=token_data,
                    headers=headers
                )
                
                if response.status_code != 200:
                    logger.error(f"Token refresh failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Refresh token invalid or expired"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token", refresh_token),
                    "expires_in": token_response.get("expires_in", 1200),
                    "token_type": token_response.get("token_type", "Bearer")
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during token refresh: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token refresh: {str(e)}"
                )

class TradeStationAPIClient:
    """TradeStation API client with comprehensive trading functionality"""
    
    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.api_base_url = "https://api.tradestation.com"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        self.timeout = httpx.Timeout(30.0)
    
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> httpx.Response:
        """Make authenticated API request with error handling"""
        url = f"{self.api_base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method, url, headers=self.headers, **kwargs
                )
                return response
            except httpx.RequestError as e:
                logger.error(f"API request failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"TradeStation API unavailable: {str(e)}"
                )
    
    async def get_accounts(self) -> List[TradeStationAccount]:
        """Retrieve all accounts for authenticated user"""
        try:
            response = await self._make_request("GET", "/v3/brokerage/accounts")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch accounts: {response.text}"
                )
            
            accounts_data = response.json().get("Accounts", [])
            
            accounts = []
            for account_data in accounts_data:
                account = TradeStationAccount(
                    account_id=account_data.get("Key"),
                    name=account_data.get("Name", ""),
                    type=account_data.get("Type", ""),
                    status=account_data.get("Status", ""),
                    currency=account_data.get("Currency", "USD"),
                    margin_enabled=account_data.get("MarginEnabled", False),
                    day_trading_buying_power=float(account_data.get("DayTradingBuyingPower", 0)),
                    overnight_buying_power=float(account_data.get("OvernightBuyingPower", 0)),
                    cash_balance=float(account_data.get("CashBalance", 0)),
                    equity=float(account_data.get("Equity", 0))
                )
                accounts.append(account)
            
            return accounts
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching accounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing account data: {str(e)}"
            )
    
    async def get_account_balances(self, account_id: str) -> Dict[str, Any]:
        """Retrieve detailed balance information for specific account"""
        try:
            response = await self._make_request("GET", f"/v3/brokerage/accounts/{account_id}/balances")
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Account {account_id} not found"
                )
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch balances: {response.text}"
                )
            
            balances_data = response.json()
            
            return {
                "account_id": account_id,
                "cash_balance": float(balances_data.get("CashBalance", 0)),
                "equity": float(balances_data.get("Equity", 0)),
                "market_value": float(balances_data.get("MarketValue", 0)),
                "buying_power": float(balances_data.get("BuyingPower", 0)),
                "day_trading_buying_power": float(balances_data.get("DayTradingBuyingPower", 0)),
                "maintenance_excess": float(balances_data.get("MaintenanceExcess", 0)),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching account balances: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing balance information: {str(e)}"
            )
    
    async def place_order(self, account_id: str, order: TradeStationOrder) -> Dict[str, Any]:
        """Place a trading order"""
        try:
            # Build order payload for TradeStation API
            order_payload = {
                "Symbol": order.symbol.upper(),
                "Quantity": str(order.quantity),
                "Type": self._map_order_type(order.order_type),
                "TimeInForce": self._map_time_in_force(order.time_in_force),
                "TradeAction": self._map_action(order.action),
                "Route": order.route
            }
            
            # Add prices if applicable
            if order.limit_price and order.order_type.upper() in ["LIMIT", "STOP_LIMIT"]:
                order_payload["LimitPrice"] = str(order.limit_price)
            
            if order.stop_price and order.order_type.upper() in ["STOP", "STOP_LIMIT"]:
                order_payload["StopPrice"] = str(order.stop_price)
            
            response = await self._make_request(
                "POST", 
                f"/v3/brokerage/accounts/{account_id}/orders",
                json=order_payload
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Order placement failed: {response.text}"
                )
            
            order_response = response.json()
            
            return {
                "order_id": order_response.get("OrderID"),
                "status": "SUBMITTED",
                "message": "Order submitted successfully",
                "account_id": account_id,
                "symbol": order.symbol,
                "action": order.action,
                "quantity": order.quantity,
                "order_type": order.order_type,
                "timestamp": datetime.utcnow().isoformat(),
                "response_data": order_response
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error placing order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error processing order: {str(e)}"
            )
    
    async def get_orders(self, account_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve orders for account"""
        try:
            endpoint = f"/v3/brokerage/accounts/{account_id}/orders"
            params = {}
            if status_filter:
                params["status"] = status_filter
            
            response = await self._make_request("GET", endpoint, params=params)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch orders: {response.text}"
                )
            
            orders_data = response.json().get("Orders", [])
            
            processed_orders = []
            for order_data in orders_data:
                processed_order = {
                    "order_id": order_data.get("OrderID"),
                    "symbol": order_data.get("Symbol"),
                    "action": order_data.get("Action"),
                    "quantity": float(order_data.get("Quantity", 0)),
                    "filled_quantity": float(order_data.get("FilledQuantity", 0)),
                    "order_type": order_data.get("Type"),
                    "status": order_data.get("Status"),
                    "limit_price": float(order_data.get("LimitPrice", 0)) if order_data.get("LimitPrice") else None,
                    "stop_price": float(order_data.get("StopPrice", 0)) if order_data.get("StopPrice") else None,
                    "time_in_force": order_data.get("TimeInForce"),
                    "created_at": order_data.get("OpenedDateTime"),
                    "updated_at": order_data.get("UpdatedDateTime"),
                }
                processed_orders.append(processed_order)
            
            return processed_orders
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching orders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error fetching orders: {str(e)}"
            )
    
    async def cancel_order(self, account_id: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order"""
        try:
            response = await self._make_request(
                "DELETE", 
                f"/v3/brokerage/accounts/{account_id}/orders/{order_id}"
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Order {order_id} not found"
                )
            elif response.status_code not in [200, 204]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Order cancellation failed: {response.text}"
                )
            
            return {
                "order_id": order_id,
                "status": "CANCELLED",
                "message": "Order cancelled successfully",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling order {order_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error cancelling order: {str(e)}"
            )
    
    def _map_order_type(self, order_type: str) -> str:
        """Map order type to TradeStation format"""
        mapping = {
            "MARKET": "Market",
            "LIMIT": "Limit",
            "STOP": "StopMarket",
            "STOP_LIMIT": "StopLimit"
        }
        return mapping.get(order_type.upper(), "Market")
    
    def _map_time_in_force(self, tif: str) -> str:
        """Map time in force to TradeStation format"""
        mapping = {
            "DAY": "Day",
            "GTC": "GTC",
            "IOC": "IOC",
            "FOK": "FOK"
        }
        return mapping.get(tif.upper(), "Day")
    
    def _map_action(self, action: str) -> str:
        """Map action to TradeStation format"""
        mapping = {
            "BUY": "Buy",
            "SELL": "Sell",
            "BTC": "BuyToCover",
            "SS": "SellShort"
        }
        return mapping.get(action.upper(), "Buy")

class TradeStationService:
    """Main TradeStation service combining OAuth and API functionality"""
    
    def __init__(self):
        self.oauth_service = TradeStationOAuthService()
    
    def is_configured(self) -> bool:
        """Check if TradeStation is properly configured"""
        return bool(self.oauth_service.client_id and self.oauth_service.client_secret)
    
    def generate_auth_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """Generate OAuth authorization URL"""
        return self.oauth_service.generate_authorization_url(state)
    
    async def handle_oauth_callback(self, code: str, state: str) -> Dict[str, Any]:
        """Handle OAuth callback and return tokens"""
        return await self.oauth_service.exchange_code_for_tokens(code, state)
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        return await self.oauth_service.refresh_access_token(refresh_token)
    
    def create_client(self, access_token: str, refresh_token: Optional[str] = None) -> TradeStationAPIClient:
        """Create authenticated API client"""
        return TradeStationAPIClient(access_token, refresh_token)
    
    async def test_connection(self, access_token: str) -> Dict[str, Any]:
        """Test TradeStation API connection"""
        try:
            client = self.create_client(access_token)
            accounts = await client.get_accounts()
            
            return {
                "status": "success",
                "message": f"Connected successfully. Found {len(accounts)} account(s).",
                "account_count": len(accounts)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Connection failed: {str(e)}"
            }