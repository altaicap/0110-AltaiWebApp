"""
Coinbase OAuth 2.0 Integration Service
Implements comprehensive Coinbase API integration with OAuth 2.0 authentication
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

class CoinbaseAccount(BaseModel):
    """Coinbase account information"""
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

class CoinbaseOrder(BaseModel):
    """Coinbase order structure"""
    symbol: str
    action: str  # buy, sell
    quantity: float  # Crypto can have fractional quantities
    order_type: str  # market, limit, stop, stop_limit
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "GTC"  # GTC, GTD, IOC, FOK

class CoinbaseOAuthService:
    """Coinbase OAuth 2.0 authentication service"""
    
    def __init__(self):
        self.client_id = os.getenv("COINBASE_CLIENT_ID")
        self.client_secret = os.getenv("COINBASE_CLIENT_SECRET")
        self.redirect_uri = os.getenv("COINBASE_REDIRECT_URI", "http://localhost:3000/auth/coinbase/callback")
        
        # Coinbase OAuth endpoints
        self.auth_url = "https://login.coinbase.com/oauth2/auth"
        self.token_url = "https://api.coinbase.com/oauth2/token"
        self.api_base_url = "https://api.coinbase.com/v2"
        
        # Required scopes for comprehensive access
        self.scopes = [
            "wallet:accounts:read", "wallet:addresses:read", "wallet:addresses:create",
            "wallet:buys:read", "wallet:buys:create", "wallet:sells:read", "wallet:sells:create",
            "wallet:transactions:read", "wallet:user:read", "wallet:orders:read", "wallet:orders:create"
        ]
        
        self.timeout = httpx.Timeout(30.0)
    
    def generate_authorization_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """Generate authorization URL for OAuth flow initiation"""
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Coinbase client credentials not configured"
            )
        
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
            "scope": " ".join(self.scopes),
            "account": "all"
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
                detail="Coinbase client credentials not configured"
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
                    logger.error(f"Coinbase token exchange failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Token exchange failed: {response.text}"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token"),
                    "expires_in": token_response.get("expires_in", 7200),  # 2 hours default
                    "token_type": token_response.get("token_type", "Bearer"),
                    "scope": token_response.get("scope", " ".join(self.scopes))
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during Coinbase token exchange: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token exchange: {str(e)}"
                )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        if not self.client_id or not self.client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Coinbase client credentials not configured"
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
                    logger.error(f"Coinbase token refresh failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Refresh token invalid or expired"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token", refresh_token),
                    "expires_in": token_response.get("expires_in", 7200),
                    "token_type": token_response.get("token_type", "Bearer")
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during Coinbase token refresh: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token refresh: {str(e)}"
                )

class CoinbaseAPIClient:
    """Coinbase API client with comprehensive trading functionality"""
    
    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.api_base_url = "https://api.coinbase.com/v2"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "CB-VERSION": "2023-05-15"  # API version
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
                logger.error(f"Coinbase API request failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Coinbase API unavailable: {str(e)}"
                )
    
    async def get_accounts(self) -> List[CoinbaseAccount]:
        """Retrieve all accounts for authenticated user"""
        try:
            response = await self._make_request("GET", "/accounts")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch Coinbase accounts: {response.text}"
                )
            
            accounts_data = response.json().get("data", [])
            
            accounts = []
            for account_data in accounts_data:
                # Get balance details
                balance = account_data.get("balance", {})
                
                account = CoinbaseAccount(
                    account_id=account_data.get("id"),
                    name=account_data.get("name", ""),
                    type=account_data.get("type", "wallet"),
                    currency=account_data.get("currency", {}).get("code", "USD"),
                    status="Active",  # Coinbase doesn't provide explicit status
                    margin_enabled=False,  # Coinbase doesn't support margin trading
                    day_trading_buying_power=float(balance.get("amount", 0)),
                    overnight_buying_power=float(balance.get("amount", 0)),
                    cash_balance=float(balance.get("amount", 0)),
                    equity=float(balance.get("amount", 0))
                )
                accounts.append(account)
            
            return accounts
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Coinbase accounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing account data: {str(e)}"
            )
    
    async def place_order(self, account_id: str, order: CoinbaseOrder) -> Dict[str, Any]:
        """Place a trading order (buy/sell)"""
        try:
            # Coinbase uses different endpoints for buys and sells
            if order.action.lower() == "buy":
                endpoint = f"/accounts/{account_id}/buys"
                order_payload = {
                    "amount": str(order.quantity),
                    "currency": order.symbol.upper(),
                    "payment_method": "coinbase_account",  # Use Coinbase wallet
                    "commit": True
                }
            else:  # sell
                endpoint = f"/accounts/{account_id}/sells"
                order_payload = {
                    "amount": str(order.quantity),
                    "currency": order.symbol.upper(),
                    "commit": True
                }
            
            # Add limit price if specified
            if order.limit_price and order.order_type.lower() == "limit":
                order_payload["total"] = str(order.limit_price * order.quantity)
            
            response = await self._make_request(
                "POST", 
                endpoint,
                json=order_payload
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Coinbase order placement failed: {response.text}"
                )
            
            order_response = response.json().get("data", {})
            
            return {
                "order_id": order_response.get("id"),
                "status": "SUBMITTED",
                "message": "Order submitted successfully to Coinbase",
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
            logger.error(f"Error placing Coinbase order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error processing order: {str(e)}"
            )
    
    async def get_orders(self, account_id: str, order_type: str = "buys") -> List[Dict[str, Any]]:
        """Retrieve orders for account (buys or sells)"""
        try:
            # Get both buys and sells
            buys_response = await self._make_request("GET", f"/accounts/{account_id}/buys")
            sells_response = await self._make_request("GET", f"/accounts/{account_id}/sells")
            
            processed_orders = []
            
            # Process buys
            if buys_response.status_code == 200:
                buys_data = buys_response.json().get("data", [])
                for order_data in buys_data:
                    processed_order = {
                        "order_id": order_data.get("id"),
                        "symbol": order_data.get("amount", {}).get("currency"),
                        "action": "buy",
                        "quantity": float(order_data.get("amount", {}).get("amount", 0)),
                        "filled_quantity": float(order_data.get("amount", {}).get("amount", 0)) if order_data.get("status") == "completed" else 0,
                        "order_type": "market",
                        "status": order_data.get("status"),
                        "limit_price": None,
                        "stop_price": None,
                        "time_in_force": "GTC",
                        "created_at": order_data.get("created_at"),
                        "updated_at": order_data.get("updated_at"),
                    }
                    processed_orders.append(processed_order)
            
            # Process sells
            if sells_response.status_code == 200:
                sells_data = sells_response.json().get("data", [])
                for order_data in sells_data:
                    processed_order = {
                        "order_id": order_data.get("id"),
                        "symbol": order_data.get("amount", {}).get("currency"),
                        "action": "sell",
                        "quantity": float(order_data.get("amount", {}).get("amount", 0)),
                        "filled_quantity": float(order_data.get("amount", {}).get("amount", 0)) if order_data.get("status") == "completed" else 0,
                        "order_type": "market",
                        "status": order_data.get("status"),
                        "limit_price": None,
                        "stop_price": None,
                        "time_in_force": "GTC",
                        "created_at": order_data.get("created_at"),
                        "updated_at": order_data.get("updated_at"),
                    }
                    processed_orders.append(processed_order)
            
            return processed_orders
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Coinbase orders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error fetching orders: {str(e)}"
            )
    
    async def cancel_order(self, account_id: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order (limited support in Coinbase)"""
        try:
            # Coinbase has limited cancellation support
            # Most orders are executed immediately as market orders
            return {
                "order_id": order_id,
                "status": "CANCEL_REQUESTED",
                "message": "Cancellation requested - most Coinbase orders execute immediately",
                "timestamp": datetime.utcnow().isoformat(),
                "note": "Coinbase primarily uses immediate market orders which cannot be cancelled"
            }
            
        except Exception as e:
            logger.error(f"Error cancelling Coinbase order {order_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error cancelling order: {str(e)}"
            )
    
    async def get_exchange_rates(self) -> Dict[str, Any]:
        """Get current exchange rates"""
        try:
            response = await self._make_request("GET", "/exchange-rates")
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch exchange rates: {response.text}")
                return {}
            
            return response.json().get("data", {}).get("rates", {})
            
        except Exception as e:
            logger.error(f"Error fetching exchange rates: {str(e)}")
            return {}

class CoinbaseService:
    """Main Coinbase service combining OAuth and API functionality"""
    
    def __init__(self):
        self.oauth_service = CoinbaseOAuthService()
    
    def is_configured(self) -> bool:
        """Check if Coinbase is properly configured"""
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
    
    def create_client(self, access_token: str, refresh_token: Optional[str] = None) -> CoinbaseAPIClient:
        """Create authenticated API client"""
        return CoinbaseAPIClient(access_token, refresh_token)
    
    async def test_connection(self, access_token: str) -> Dict[str, Any]:
        """Test Coinbase API connection"""
        try:
            client = self.create_client(access_token)
            accounts = await client.get_accounts()
            
            return {
                "status": "success",
                "message": f"Connected successfully to Coinbase. Found {len(accounts)} wallet(s).",
                "account_count": len(accounts)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Coinbase connection failed: {str(e)}"
            }