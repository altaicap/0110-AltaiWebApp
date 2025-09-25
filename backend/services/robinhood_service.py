"""
Robinhood OAuth 2.0 Integration Service
Implements comprehensive Robinhood API integration with OAuth 2.0 authentication
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

logger = logging.getLogger(__name__)

class RobinhoodAccount(BaseModel):
    """Robinhood account information"""
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

class RobinhoodOrder(BaseModel):
    """Robinhood order structure"""
    symbol: str
    action: str  # buy, sell
    quantity: int
    order_type: str  # market, limit, stop_loss, stop_limit
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "gfd"  # gfd (good for day), gtc (good till cancelled), ioc, fok
    trigger: str = "immediate"  # immediate, stop

class RobinhoodOAuthService:
    """Robinhood OAuth 2.0 authentication service"""
    
    def __init__(self):
        self.client_id = os.getenv("ROBINHOOD_CLIENT_ID")
        self.client_secret = os.getenv("ROBINHOOD_CLIENT_SECRET")
        self.redirect_uri = os.getenv("ROBINHOOD_REDIRECT_URI", "http://localhost:3000/auth/robinhood/callback")
        
        # Robinhood OAuth endpoints
        self.auth_url = "https://robinhood.com/oauth2/authorize"
        self.token_url = "https://robinhood.com/oauth2/token"
        self.api_base_url = "https://nummus.robinhood.com"
        
        # Required scopes
        self.scopes = ["internal"]
        
        self.timeout = httpx.Timeout(30.0)
    
    def generate_authorization_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """Generate authorization URL for OAuth flow initiation"""
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Robinhood client credentials not configured"
            )
        
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
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
                detail="Robinhood client credentials not configured"
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
                    logger.error(f"Robinhood token exchange failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Token exchange failed: {response.text}"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token"),
                    "expires_in": token_response.get("expires_in", 86400),  # 24 hours default
                    "token_type": token_response.get("token_type", "Bearer"),
                    "scope": token_response.get("scope", " ".join(self.scopes))
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during Robinhood token exchange: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token exchange: {str(e)}"
                )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        if not self.client_id or not self.client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Robinhood client credentials not configured"
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
                    logger.error(f"Robinhood token refresh failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Refresh token invalid or expired"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token", refresh_token),
                    "expires_in": token_response.get("expires_in", 86400),
                    "token_type": token_response.get("token_type", "Bearer")
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during Robinhood token refresh: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token refresh: {str(e)}"
                )

class RobinhoodAPIClient:
    """Robinhood API client with comprehensive trading functionality"""
    
    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.api_base_url = "https://nummus.robinhood.com"
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
                logger.error(f"Robinhood API request failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Robinhood API unavailable: {str(e)}"
                )
    
    async def get_accounts(self) -> List[RobinhoodAccount]:
        """Retrieve all accounts for authenticated user"""
        try:
            response = await self._make_request("GET", "/accounts/")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch Robinhood accounts: {response.text}"
                )
            
            accounts_data = response.json().get("results", [])
            
            accounts = []
            for account_data in accounts_data:
                account = RobinhoodAccount(
                    account_id=account_data.get("account_number"),
                    name=f"Robinhood Account {account_data.get('account_number', '')[:8]}",
                    type=account_data.get("type", "cash"),
                    status="Active",
                    currency="USD",
                    margin_enabled=account_data.get("margin_balances") is not None,
                    day_trading_buying_power=float(account_data.get("day_trade_buying_power", 0)),
                    overnight_buying_power=float(account_data.get("buying_power", 0)),
                    cash_balance=float(account_data.get("cash", 0)),
                    equity=float(account_data.get("total_return_today", 0))
                )
                accounts.append(account)
            
            return accounts
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Robinhood accounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing account data: {str(e)}"
            )
    
    async def place_order(self, account_id: str, order: RobinhoodOrder) -> Dict[str, Any]:
        """Place a trading order"""
        try:
            # Build order payload for Robinhood API
            order_payload = {
                "account": f"https://nummus.robinhood.com/accounts/{account_id}/",
                "symbol": order.symbol.upper(),
                "type": self._map_order_type(order.order_type),
                "time_in_force": self._map_time_in_force(order.time_in_force),
                "trigger": order.trigger,
                "quantity": str(order.quantity),
                "side": order.action.lower()
            }
            
            # Add prices if applicable
            if order.limit_price and order.order_type.lower() in ["limit", "stop_limit"]:
                order_payload["price"] = str(order.limit_price)
            
            if order.stop_price and order.order_type.lower() in ["stop_loss", "stop_limit"]:
                order_payload["stop_price"] = str(order.stop_price)
            
            response = await self._make_request(
                "POST", 
                "/orders/",
                json=order_payload
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Robinhood order placement failed: {response.text}"
                )
            
            order_response = response.json()
            
            return {
                "order_id": order_response.get("id"),
                "status": "SUBMITTED",
                "message": "Order submitted successfully to Robinhood",
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
            logger.error(f"Error placing Robinhood order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error processing order: {str(e)}"
            )
    
    async def get_orders(self, account_id: str, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve orders for account"""
        try:
            endpoint = "/orders/"
            params = {}
            if status_filter:
                params["state"] = status_filter
            
            response = await self._make_request("GET", endpoint, params=params)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch Robinhood orders: {response.text}"
                )
            
            orders_data = response.json().get("results", [])
            
            processed_orders = []
            for order_data in orders_data:
                processed_order = {
                    "order_id": order_data.get("id"),
                    "symbol": order_data.get("symbol"),
                    "action": order_data.get("side"),
                    "quantity": float(order_data.get("quantity", 0)),
                    "filled_quantity": float(order_data.get("filled_quantity", 0)),
                    "order_type": order_data.get("type"),
                    "status": order_data.get("state"),
                    "limit_price": float(order_data.get("price", 0)) if order_data.get("price") else None,
                    "stop_price": float(order_data.get("stop_price", 0)) if order_data.get("stop_price") else None,
                    "time_in_force": order_data.get("time_in_force"),
                    "created_at": order_data.get("created_at"),
                    "updated_at": order_data.get("updated_at"),
                }
                processed_orders.append(processed_order)
            
            return processed_orders
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Robinhood orders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error fetching orders: {str(e)}"
            )
    
    async def cancel_order(self, account_id: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order"""
        try:
            response = await self._make_request(
                "POST", 
                f"/orders/{order_id}/cancel/"
            )
            
            if response.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Robinhood order {order_id} not found"
                )
            elif response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Robinhood order cancellation failed: {response.text}"
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
            logger.error(f"Error cancelling Robinhood order {order_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error cancelling order: {str(e)}"
            )
    
    def _map_order_type(self, order_type: str) -> str:
        """Map order type to Robinhood format"""
        mapping = {
            "market": "market",
            "limit": "limit",
            "stop_loss": "stop_loss",
            "stop_limit": "stop_limit"
        }
        return mapping.get(order_type.lower(), "market")
    
    def _map_time_in_force(self, tif: str) -> str:
        """Map time in force to Robinhood format"""
        mapping = {
            "day": "gfd",
            "gfd": "gfd",
            "gtc": "gtc",
            "ioc": "ioc",
            "fok": "fok"
        }
        return mapping.get(tif.lower(), "gfd")

class RobinhoodService:
    """Main Robinhood service combining OAuth and API functionality"""
    
    def __init__(self):
        self.oauth_service = RobinhoodOAuthService()
    
    def is_configured(self) -> bool:
        """Check if Robinhood is properly configured"""
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
    
    def create_client(self, access_token: str, refresh_token: Optional[str] = None) -> RobinhoodAPIClient:
        """Create authenticated API client"""
        return RobinhoodAPIClient(access_token, refresh_token)
    
    async def test_connection(self, access_token: str) -> Dict[str, Any]:
        """Test Robinhood API connection"""
        try:
            client = self.create_client(access_token)
            accounts = await client.get_accounts()
            
            return {
                "status": "success",
                "message": f"Connected successfully to Robinhood. Found {len(accounts)} account(s).",
                "account_count": len(accounts)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Robinhood connection failed: {str(e)}"
            }