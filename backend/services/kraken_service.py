"""
Kraken OAuth 2.0 Integration Service
Implements comprehensive Kraken API integration with OAuth 2.0 authentication
"""

import os
import asyncio
import logging
import httpx
import secrets
import hmac
import hashlib
import base64
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class KrakenAccount(BaseModel):
    """Kraken account information"""
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

class KrakenOrder(BaseModel):
    """Kraken order structure"""
    symbol: str  # Trading pair, e.g., XBTUSD, ETHUSD
    action: str  # buy, sell
    quantity: float
    order_type: str  # market, limit, stop-loss, take-profit, stop-loss-limit, take-profit-limit
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "GTC"  # GTC, IOC, FOK
    leverage: Optional[int] = None  # For margin trading

class KrakenOAuthService:
    """Kraken OAuth 2.0 authentication service"""
    
    def __init__(self):
        self.client_id = os.getenv("KRAKEN_CLIENT_ID")
        self.client_secret = os.getenv("KRAKEN_CLIENT_SECRET")
        self.redirect_uri = os.getenv("KRAKEN_REDIRECT_URI", "http://localhost:3000/auth/kraken/callback")
        
        # Kraken OAuth endpoints
        self.auth_url = "https://www.kraken.com/oauth/authorize"
        self.token_url = "https://api.kraken.com/0/oauth/token"
        self.api_base_url = "https://api.kraken.com/0"
        
        # Required scopes for comprehensive access
        self.scopes = ["read", "trade", "funds"]
        
        self.timeout = httpx.Timeout(30.0)
    
    def generate_authorization_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """Generate authorization URL for OAuth flow initiation"""
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Kraken client credentials not configured"
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
                detail="Kraken client credentials not configured"
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
                    logger.error(f"Kraken token exchange failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Token exchange failed: {response.text}"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token"),
                    "expires_in": token_response.get("expires_in", 900),  # 15 minutes default
                    "token_type": token_response.get("token_type", "Bearer"),
                    "scope": token_response.get("scope", " ".join(self.scopes))
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during Kraken token exchange: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token exchange: {str(e)}"
                )
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        if not self.client_id or not self.client_secret:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Kraken client credentials not configured"
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
                    logger.error(f"Kraken token refresh failed: {response.text}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Refresh token invalid or expired"
                    )
                
                token_response = response.json()
                
                return {
                    "access_token": token_response["access_token"],
                    "refresh_token": token_response.get("refresh_token", refresh_token),
                    "expires_in": token_response.get("expires_in", 900),
                    "token_type": token_response.get("token_type", "Bearer")
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during Kraken token refresh: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token refresh: {str(e)}"
                )

class KrakenAPIClient:
    """Kraken API client with comprehensive trading functionality"""
    
    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.api_base_url = "https://api.kraken.com/0"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Altai-Trader/1.0"
        }
        self.timeout = httpx.Timeout(30.0)
    
    def _generate_kraken_signature(self, urlpath: str, data: str, secret: str) -> str:
        """Generate Kraken API signature for private endpoints"""
        postdata = data
        encoded = (str(data).encode())
        message = urlpath.encode() + hashlib.sha256(encoded).digest()
        
        mac = hmac.new(base64.b64decode(secret), message, hashlib.sha512)
        sigdigest = base64.b64encode(mac.digest())
        return sigdigest.decode()
    
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
                logger.error(f"Kraken API request failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Kraken API unavailable: {str(e)}"
                )
    
    async def get_accounts(self) -> List[KrakenAccount]:
        """Retrieve account balance information"""
        try:
            response = await self._make_request("POST", "/private/Balance", data={})
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch Kraken account balance: {response.text}"
                )
            
            balance_data = response.json()
            
            if balance_data.get("error") and len(balance_data["error"]) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Kraken API error: {balance_data['error']}"
                )
            
            balances = balance_data.get("result", {})
            
            # Create account entries for each currency balance
            accounts = []
            for currency, balance in balances.items():
                if float(balance) > 0:  # Only include currencies with positive balance
                    account = KrakenAccount(
                        account_id=f"kraken_{currency.lower()}",
                        name=f"Kraken {currency} Account",
                        type="spot",
                        status="Active",
                        currency=currency,
                        margin_enabled=currency in ["USD", "EUR", "GBP"],  # Major fiat currencies support margin
                        day_trading_buying_power=float(balance),
                        overnight_buying_power=float(balance),
                        cash_balance=float(balance),
                        equity=float(balance)
                    )
                    accounts.append(account)
            
            return accounts
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Kraken accounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing account data: {str(e)}"
            )
    
    async def place_order(self, account_id: str, order: KrakenOrder) -> Dict[str, Any]:
        """Place a trading order"""
        try:
            # Build order payload for Kraken API
            order_data = {
                "pair": order.symbol.upper(),
                "type": order.action.lower(),
                "ordertype": self._map_order_type(order.order_type),
                "volume": str(order.quantity),
                "validate": "false"  # Set to true for validation only
            }
            
            # Add prices if applicable
            if order.limit_price and order.order_type.lower() in ["limit", "stop-loss-limit", "take-profit-limit"]:
                order_data["price"] = str(order.limit_price)
            
            if order.stop_price and order.order_type.lower() in ["stop-loss", "stop-loss-limit"]:
                order_data["price2"] = str(order.stop_price)
            
            # Add leverage if specified
            if order.leverage:
                order_data["leverage"] = str(order.leverage)
            
            response = await self._make_request(
                "POST", 
                "/private/AddOrder",
                data=order_data
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Kraken order placement failed: {response.text}"
                )
            
            order_response = response.json()
            
            if order_response.get("error") and len(order_response["error"]) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Kraken order error: {order_response['error']}"
                )
            
            result = order_response.get("result", {})
            
            return {
                "order_id": result.get("txid", [None])[0],
                "status": "SUBMITTED",
                "message": "Order submitted successfully to Kraken",
                "account_id": account_id,
                "symbol": order.symbol,
                "action": order.action,
                "quantity": order.quantity,
                "order_type": order.order_type,
                "timestamp": datetime.utcnow().isoformat(),
                "response_data": result
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error placing Kraken order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error processing order: {str(e)}"
            )
    
    async def get_orders(self, account_id: str, open_only: bool = True) -> List[Dict[str, Any]]:
        """Retrieve orders for account"""
        try:
            endpoint = "/private/OpenOrders" if open_only else "/private/ClosedOrders"
            response = await self._make_request("POST", endpoint, data={})
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch Kraken orders: {response.text}"
                )
            
            order_response = response.json()
            
            if order_response.get("error") and len(order_response["error"]) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Kraken API error: {order_response['error']}"
                )
            
            orders_data = order_response.get("result", {}).get("open" if open_only else "closed", {})
            
            processed_orders = []
            for order_id, order_data in orders_data.items():
                descr = order_data.get("descr", {})
                processed_order = {
                    "order_id": order_id,
                    "symbol": descr.get("pair"),
                    "action": descr.get("type"),
                    "quantity": float(order_data.get("vol", 0)),
                    "filled_quantity": float(order_data.get("vol_exec", 0)),
                    "order_type": descr.get("ordertype"),
                    "status": order_data.get("status"),
                    "limit_price": float(descr.get("price", 0)) if descr.get("price") else None,
                    "stop_price": float(descr.get("price2", 0)) if descr.get("price2") else None,
                    "time_in_force": "GTC",  # Kraken default
                    "created_at": datetime.fromtimestamp(float(order_data.get("opentm", 0))).isoformat(),
                    "updated_at": datetime.fromtimestamp(float(order_data.get("lastupdated", 0))).isoformat(),
                }
                processed_orders.append(processed_order)
            
            return processed_orders
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching Kraken orders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error fetching orders: {str(e)}"
            )
    
    async def cancel_order(self, account_id: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order"""
        try:
            cancel_data = {
                "txid": order_id
            }
            
            response = await self._make_request(
                "POST", 
                "/private/CancelOrder",
                data=cancel_data
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Kraken order cancellation failed: {response.text}"
                )
            
            cancel_response = response.json()
            
            if cancel_response.get("error") and len(cancel_response["error"]) > 0:
                if "Unknown order" in str(cancel_response["error"]):
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Kraken order {order_id} not found"
                    )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Kraken cancellation error: {cancel_response['error']}"
                )
            
            return {
                "order_id": order_id,
                "status": "CANCELLED",
                "message": "Order cancelled successfully",
                "timestamp": datetime.utcnow().isoformat(),
                "pending": cancel_response.get("result", {}).get("pending")
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling Kraken order {order_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error cancelling order: {str(e)}"
            )
    
    def _map_order_type(self, order_type: str) -> str:
        """Map order type to Kraken format"""
        mapping = {
            "market": "market",
            "limit": "limit",
            "stop_loss": "stop-loss",
            "take_profit": "take-profit",
            "stop_limit": "stop-loss-limit",
            "take_profit_limit": "take-profit-limit"
        }
        return mapping.get(order_type.lower(), "market")
    
    async def get_trading_pairs(self) -> Dict[str, Any]:
        """Get available trading pairs"""
        try:
            response = await self._make_request("GET", "/public/AssetPairs")
            
            if response.status_code != 200:
                logger.warning(f"Failed to fetch trading pairs: {response.text}")
                return {}
            
            pairs_data = response.json()
            return pairs_data.get("result", {})
            
        except Exception as e:
            logger.error(f"Error fetching trading pairs: {str(e)}")
            return {}

class KrakenService:
    """Main Kraken service combining OAuth and API functionality"""
    
    def __init__(self):
        self.oauth_service = KrakenOAuthService()
    
    def is_configured(self) -> bool:
        """Check if Kraken is properly configured"""
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
    
    def create_client(self, access_token: str, refresh_token: Optional[str] = None) -> KrakenAPIClient:
        """Create authenticated API client"""
        return KrakenAPIClient(access_token, refresh_token)
    
    async def test_connection(self, access_token: str) -> Dict[str, Any]:
        """Test Kraken API connection"""
        try:
            client = self.create_client(access_token)
            accounts = await client.get_accounts()
            
            return {
                "status": "success",
                "message": f"Connected successfully to Kraken. Found {len(accounts)} balance(s).",
                "account_count": len(accounts)
            }
        except Exception as e:
            return {
                "status": "error",
                "message": f"Kraken connection failed: {str(e)}"
            }