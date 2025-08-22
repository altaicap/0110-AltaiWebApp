"""
Interactive Brokers (IBKR) Client Portal Web API Integration Service
Implements OAuth 2.0 with private_key_jwt authentication method
"""

import os
import asyncio
import logging
import httpx
import secrets
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import HTTPException, status
from pydantic import BaseModel
from jose import jwt, JWTError
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import json

logger = logging.getLogger(__name__)

class IBKRAccount(BaseModel):
    """IBKR account information"""
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

class IBKROrder(BaseModel):
    """IBKR order structure"""
    symbol: str
    conid: Optional[int] = None  # Contract ID required by IBKR
    action: str  # BUY, SELL
    quantity: int
    order_type: str  # MKT, LMT, STP, STP_LMT
    limit_price: Optional[float] = None
    stop_price: Optional[float] = None
    time_in_force: str = "DAY"  # DAY, GTC, IOC, FOK
    outside_rth: bool = False  # Outside regular trading hours

class IBKRKeyManager:
    """Manages RSA key pair for private_key_jwt authentication"""
    
    def __init__(self):
        self.private_key_path = os.getenv("IBKR_PRIVATE_KEY_PATH", "/app/keys/ibkr_private_key.pem")
        self.public_key_path = os.getenv("IBKR_PUBLIC_KEY_PATH", "/app/keys/ibkr_public_key.pem")
        self._private_key = None
        self._public_key = None
    
    def generate_key_pair(self, key_size: int = 2048) -> tuple:
        """Generate RSA key pair for IBKR authentication"""
        # Generate private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size
        )
        
        # Get public key
        public_key = private_key.public_key()
        
        # Serialize private key
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Serialize public key
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        # Save keys to files
        os.makedirs(os.path.dirname(self.private_key_path), exist_ok=True)
        
        with open(self.private_key_path, "wb") as f:
            f.write(private_pem)
        
        with open(self.public_key_path, "wb") as f:
            f.write(public_pem)
        
        # Set proper permissions (read-only for owner)
        os.chmod(self.private_key_path, 0o600)
        os.chmod(self.public_key_path, 0o644)
        
        self._private_key = private_key
        self._public_key = public_key
        
        return private_pem, public_pem
    
    def load_private_key(self):
        """Load private key from file"""
        if self._private_key is None:
            try:
                if not os.path.exists(self.private_key_path):
                    logger.warning("IBKR private key not found, generating new key pair")
                    self.generate_key_pair()
                
                with open(self.private_key_path, "rb") as f:
                    private_key_data = f.read()
                
                self._private_key = serialization.load_pem_private_key(
                    private_key_data,
                    password=None
                )
            except Exception as e:
                logger.error(f"Failed to load IBKR private key: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="IBKR private key configuration error"
                )
        
        return self._private_key
    
    def get_public_key_pem(self) -> str:
        """Get public key in PEM format for IBKR registration"""
        try:
            if not os.path.exists(self.public_key_path):
                self.generate_key_pair()
            
            with open(self.public_key_path, "r") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to get public key: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="IBKR public key retrieval error"
            )

class IBKROAuthService:
    """IBKR OAuth 2.0 service with private_key_jwt authentication"""
    
    def __init__(self):
        self.client_id = os.getenv("IBKR_CLIENT_ID")
        self.key_manager = IBKRKeyManager()
        
        # IBKR OAuth endpoints
        self.auth_url = "https://gdc-api.ibkr.com/oauth2/authorize"
        self.token_url = "https://gdc-api.ibkr.com/oauth2/token"
        self.api_base_url = "https://gdc-api.ibkr.com"
        
        # Required scopes
        self.scopes = ["read", "trade"]
        
        self.timeout = httpx.Timeout(30.0)
    
    def generate_authorization_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """Generate authorization URL for OAuth flow"""
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="IBKR client ID not configured"
            )
        
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "state": state,
            "scope": " ".join(self.scopes)
        }
        
        auth_url = f"{self.auth_url}?" + "&".join([f"{k}={v}" for k, v in params.items()])
        
        return {
            "authorization_url": auth_url,
            "state": state,
            "public_key": self.key_manager.get_public_key_pem()
        }
    
    def _create_jwt_assertion(self) -> str:
        """Create JWT assertion for private_key_jwt authentication"""
        if not self.client_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="IBKR client ID not configured"
            )
        
        private_key = self.key_manager.load_private_key()
        
        # JWT claims for client assertion
        now = datetime.utcnow()
        claims = {
            "iss": self.client_id,  # Issuer (client_id)
            "sub": self.client_id,  # Subject (client_id)
            "aud": self.token_url,  # Audience (token endpoint)
            "jti": secrets.token_urlsafe(16),  # JWT ID (unique identifier)
            "exp": int((now + timedelta(minutes=5)).timestamp()),  # Expiration
            "iat": int(now.timestamp()),  # Issued at
            "nbf": int(now.timestamp())   # Not before
        }
        
        # Create JWT with RS256 algorithm
        token = jwt.encode(
            claims,
            private_key,
            algorithm="RS256"
        )
        
        return token
    
    async def exchange_code_for_tokens(self, authorization_code: str, state: str) -> Dict[str, Any]:
        """Exchange authorization code for access tokens using private_key_jwt"""
        jwt_assertion = self._create_jwt_assertion()
        
        token_data = {
            "grant_type": "authorization_code",
            "code": authorization_code,
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": jwt_assertion
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
                    "expires_in": token_response.get("expires_in", 900),  # 15 minutes default
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
        """Refresh access token using refresh token and private_key_jwt"""
        jwt_assertion = self._create_jwt_assertion()
        
        token_data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            "client_assertion": jwt_assertion
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
                    "expires_in": token_response.get("expires_in", 900),
                    "token_type": token_response.get("token_type", "Bearer")
                }
                
            except httpx.RequestError as e:
                logger.error(f"Network error during token refresh: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Network error during token refresh: {str(e)}"
                )

class IBKRAPIClient:
    """IBKR Client Portal Web API client"""
    
    def __init__(self, access_token: str, refresh_token: Optional[str] = None):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.api_base_url = "https://gdc-api.ibkr.com/v1/api"
        self.headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        self.timeout = httpx.Timeout(30.0)
    
    async def _make_request(self, method: str, endpoint: str, **kwargs) -> httpx.Response:
        """Make authenticated API request"""
        url = f"{self.api_base_url}{endpoint}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.request(
                    method, url, headers=self.headers, **kwargs
                )
                return response
            except httpx.RequestError as e:
                logger.error(f"IBKR API request failed: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"IBKR API unavailable: {str(e)}"
                )
    
    async def get_accounts(self) -> List[IBKRAccount]:
        """Retrieve all accounts for authenticated user"""
        try:
            response = await self._make_request("GET", "/portfolio/accounts")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch accounts: {response.text}"
                )
            
            accounts_data = response.json()
            
            accounts = []
            for account_data in accounts_data:
                account = IBKRAccount(
                    account_id=account_data.get("id", ""),
                    name=account_data.get("desc", ""),
                    type=account_data.get("type", ""),
                    status="Active",  # IBKR doesn't provide explicit status
                    currency=account_data.get("currency", "USD"),
                    margin_enabled=account_data.get("margin", False),
                    day_trading_buying_power=float(account_data.get("availableFunds", 0)),
                    overnight_buying_power=float(account_data.get("buyingPower", 0)),
                    cash_balance=float(account_data.get("cushion", 0)),
                    equity=float(account_data.get("netLiquidation", 0))
                )
                accounts.append(account)
            
            return accounts
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching IBKR accounts: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing account data: {str(e)}"
            )
    
    async def search_contract(self, symbol: str) -> Optional[int]:
        """Search for contract ID (conid) by symbol"""
        try:
            response = await self._make_request(
                "GET", 
                f"/trsrv/stocks",
                params={"symbols": symbol}
            )
            
            if response.status_code != 200:
                logger.warning(f"Contract search failed for {symbol}: {response.text}")
                return None
            
            search_results = response.json()
            
            if search_results and len(search_results) > 0:
                # Return the first contract ID found
                return search_results[0].get("conid")
            
            return None
            
        except Exception as e:
            logger.error(f"Error searching contract for {symbol}: {str(e)}")
            return None
    
    async def place_order(self, account_id: str, order: IBKROrder) -> Dict[str, Any]:
        """Place a trading order"""
        try:
            # Get contract ID if not provided
            if not order.conid:
                order.conid = await self.search_contract(order.symbol)
                if not order.conid:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Could not find contract for symbol {order.symbol}"
                    )
            
            # Build order payload for IBKR API
            order_payload = {
                "orders": [{
                    "conid": order.conid,
                    "orderType": self._map_order_type(order.order_type),
                    "side": self._map_action(order.action),
                    "quantity": order.quantity,
                    "tif": self._map_time_in_force(order.time_in_force),
                    "outsideRTH": order.outside_rth
                }]
            }
            
            # Add prices if applicable
            if order.limit_price and order.order_type.upper() in ["LMT", "STP_LMT"]:
                order_payload["orders"][0]["price"] = order.limit_price
            
            if order.stop_price and order.order_type.upper() in ["STP", "STP_LMT"]:
                order_payload["orders"][0]["auxPrice"] = order.stop_price
            
            response = await self._make_request(
                "POST", 
                f"/iserver/account/{account_id}/orders",
                json=order_payload
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Order placement failed: {response.text}"
                )
            
            order_response = response.json()
            
            return {
                "order_id": order_response[0].get("order_id") if order_response else None,
                "status": "SUBMITTED",
                "message": "Order submitted successfully",
                "account_id": account_id,
                "symbol": order.symbol,
                "conid": order.conid,
                "action": order.action,
                "quantity": order.quantity,
                "order_type": order.order_type,
                "timestamp": datetime.utcnow().isoformat(),
                "response_data": order_response
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error placing IBKR order: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error processing order: {str(e)}"
            )
    
    async def get_orders(self, account_id: str) -> List[Dict[str, Any]]:
        """Retrieve orders for account"""
        try:
            response = await self._make_request("GET", f"/iserver/account/{account_id}/orders")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to fetch orders: {response.text}"
                )
            
            orders_data = response.json().get("orders", [])
            
            processed_orders = []
            for order_data in orders_data:
                processed_order = {
                    "order_id": order_data.get("orderId"),
                    "symbol": order_data.get("ticker"),
                    "conid": order_data.get("conid"),
                    "action": order_data.get("side"),
                    "quantity": float(order_data.get("totalSize", 0)),
                    "filled_quantity": float(order_data.get("filledQuantity", 0)),
                    "order_type": order_data.get("orderType"),
                    "status": order_data.get("status"),
                    "limit_price": float(order_data.get("price", 0)) if order_data.get("price") else None,
                    "stop_price": float(order_data.get("stopPrice", 0)) if order_data.get("stopPrice") else None,
                    "time_in_force": order_data.get("tif"),
                    "created_at": order_data.get("orderTime"),
                    "updated_at": order_data.get("lastExecutionTime"),
                }
                processed_orders.append(processed_order)
            
            return processed_orders
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching IBKR orders: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error fetching orders: {str(e)}"
            )
    
    async def cancel_order(self, account_id: str, order_id: str) -> Dict[str, Any]:
        """Cancel an existing order"""
        try:
            response = await self._make_request(
                "DELETE", 
                f"/iserver/account/{account_id}/order/{order_id}"
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
                "message": "Order cancellation submitted",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling IBKR order {order_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error cancelling order: {str(e)}"
            )
    
    def _map_order_type(self, order_type: str) -> str:
        """Map order type to IBKR format"""
        mapping = {
            "MARKET": "MKT",
            "LIMIT": "LMT",
            "STOP": "STP",
            "STOP_LIMIT": "STP_LMT"
        }
        return mapping.get(order_type.upper(), "MKT")
    
    def _map_time_in_force(self, tif: str) -> str:
        """Map time in force to IBKR format"""
        mapping = {
            "DAY": "DAY",
            "GTC": "GTC",
            "IOC": "IOC",
            "FOK": "FOK"
        }
        return mapping.get(tif.upper(), "DAY")
    
    def _map_action(self, action: str) -> str:
        """Map action to IBKR format"""
        mapping = {
            "BUY": "BUY",
            "SELL": "SELL"
        }
        return mapping.get(action.upper(), "BUY")

class IBKRService:
    """Main IBKR service combining OAuth and API functionality"""
    
    def __init__(self):
        self.oauth_service = IBKROAuthService()
        self.key_manager = IBKRKeyManager()
    
    def is_configured(self) -> bool:
        """Check if IBKR is properly configured"""
        return bool(self.oauth_service.client_id)
    
    def generate_auth_url(self, state: Optional[str] = None) -> Dict[str, str]:
        """Generate OAuth authorization URL"""
        return self.oauth_service.generate_authorization_url(state)
    
    async def handle_oauth_callback(self, code: str, state: str) -> Dict[str, Any]:
        """Handle OAuth callback and return tokens"""
        return await self.oauth_service.exchange_code_for_tokens(code, state)
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        return await self.oauth_service.refresh_access_token(refresh_token)
    
    def create_client(self, access_token: str, refresh_token: Optional[str] = None) -> IBKRAPIClient:
        """Create authenticated API client"""
        return IBKRAPIClient(access_token, refresh_token)
    
    async def test_connection(self, access_token: str) -> Dict[str, Any]:
        """Test IBKR API connection"""
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
    
    def get_public_key(self) -> str:
        """Get public key for IBKR registration"""
        return self.key_manager.get_public_key_pem()
    
    def generate_keys(self) -> Dict[str, str]:
        """Generate new RSA key pair"""
        private_pem, public_pem = self.key_manager.generate_key_pair()
        
        return {
            "private_key": private_pem.decode("utf-8"),
            "public_key": public_pem.decode("utf-8"),
            "message": "New RSA key pair generated successfully"
        }