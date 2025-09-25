"""
Unified Broker Service
Provides a unified interface for multiple brokers (TradeStation, IBKR)
Handles OAuth flows, account management, and order placement
"""

import logging
from typing import Dict, List, Optional, Any, Union
from fastapi import HTTPException, status
from enum import Enum

from services.tradestation_service import TradeStationService, TradeStationOrder
from services.ibkr_service import IBKRService, IBKROrder
from services.robinhood_service import RobinhoodService, RobinhoodOrder
from services.coinbase_service import CoinbaseService, CoinbaseOrder
from services.kraken_service import KrakenService, KrakenOrder

logger = logging.getLogger(__name__)

class BrokerType(Enum):
    """Supported broker types"""
    TRADESTATION = "tradestation"
    IBKR = "ibkr"
    ROBINHOOD = "robinhood"
    COINBASE = "coinbase"
    KRAKEN = "kraken"

class OrderType(Enum):
    """Unified order types"""
    MARKET = "MARKET"
    LIMIT = "LIMIT"
    STOP = "STOP"
    STOP_LIMIT = "STOP_LIMIT"

class OrderAction(Enum):
    """Unified order actions"""
    BUY = "BUY"
    SELL = "SELL"
    BUY_TO_COVER = "BTC"
    SELL_SHORT = "SS"

class UnifiedOrder:
    """Unified order structure that can be converted to broker-specific formats"""
    
    def __init__(
        self,
        symbol: str,
        action: str,
        quantity: int,
        order_type: str,
        limit_price: Optional[float] = None,
        stop_price: Optional[float] = None,
        time_in_force: str = "DAY"
    ):
        self.symbol = symbol.upper()
        self.action = action.upper()
        self.quantity = quantity
        self.order_type = order_type.upper()
        self.limit_price = limit_price
        self.stop_price = stop_price
        self.time_in_force = time_in_force.upper()
        
        # Validate inputs
        self._validate()
    
    def _validate(self):
        """Validate order parameters"""
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        
        if self.action not in [e.value for e in OrderAction]:
            raise ValueError(f"Invalid action: {self.action}")
        
        if self.order_type not in [e.value for e in OrderType]:
            raise ValueError(f"Invalid order type: {self.order_type}")
        
        if self.order_type in ["LIMIT", "STOP_LIMIT"] and self.limit_price is None:
            raise ValueError(f"Limit price required for {self.order_type} orders")
        
        if self.order_type in ["STOP", "STOP_LIMIT"] and self.stop_price is None:
            raise ValueError(f"Stop price required for {self.order_type} orders")
    
    def to_tradestation_order(self) -> TradeStationOrder:
        """Convert to TradeStation order format"""
        return TradeStationOrder(
            symbol=self.symbol,
            action=self.action,
            quantity=self.quantity,
            order_type=self.order_type,
            limit_price=self.limit_price,
            stop_price=self.stop_price,
            time_in_force=self.time_in_force
        )
    
    def to_ibkr_order(self) -> IBKROrder:
        """Convert to IBKR order format"""
        # Map unified action to IBKR format (IBKR doesn't use BTC/SS)
        ibkr_action = "BUY" if self.action in ["BUY", "BTC"] else "SELL"
        
        return IBKROrder(
            symbol=self.symbol,
            action=ibkr_action,
            quantity=self.quantity,
            order_type=self.order_type,
            limit_price=self.limit_price,
            stop_price=self.stop_price,
            time_in_force=self.time_in_force
        )

class BrokerService:
    """Unified broker service managing multiple broker integrations"""
    
    def __init__(self):
        self.tradestation = TradeStationService()
        self.ibkr = IBKRService()
        self.robinhood = RobinhoodService()
        self.coinbase = CoinbaseService()
        self.kraken = KrakenService()
        
        self.brokers = {
            BrokerType.TRADESTATION: self.tradestation,
            BrokerType.IBKR: self.ibkr,
            BrokerType.ROBINHOOD: self.robinhood,
            BrokerType.COINBASE: self.coinbase,
            BrokerType.KRAKEN: self.kraken
        }
    
    def get_broker_service(self, broker_type: Union[str, BrokerType]):
        """Get specific broker service"""
        if isinstance(broker_type, str):
            broker_type = BrokerType(broker_type.lower())
        
        if broker_type not in self.brokers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported broker: {broker_type.value}"
            )
        
        return self.brokers[broker_type]
    
    def get_available_brokers(self) -> Dict[str, Dict[str, Any]]:
        """Get list of available brokers and their configuration status"""
        return {
            "tradestation": {
                "name": "TradeStation",
                "type": "tradestation",
                "configured": self.tradestation.is_configured(),
                "oauth_type": "authorization_code",
                "features": ["stocks", "options", "futures", "forex"],
                "order_types": ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"],
                "description": "TradeStation with OAuth 2.0 authorization code flow"
            },
            "ibkr": {
                "name": "Interactive Brokers",
                "type": "ibkr",
                "configured": self.ibkr.is_configured(),
                "oauth_type": "private_key_jwt",
                "features": ["stocks", "options", "futures", "forex", "bonds"],
                "order_types": ["MARKET", "LIMIT", "STOP", "STOP_LIMIT"],
                "description": "Interactive Brokers with OAuth 2.0 private key JWT"
            }
        }
    
    def generate_auth_url(self, broker_type: str, state: Optional[str] = None) -> Dict[str, Any]:
        """Generate OAuth authorization URL for specified broker"""
        broker_service = self.get_broker_service(broker_type)
        
        if not broker_service.is_configured():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{broker_type.upper()} is not properly configured"
            )
        
        auth_data = broker_service.generate_auth_url(state)
        auth_data["broker"] = broker_type.lower()
        
        # Add IBKR-specific data
        if broker_type.lower() == "ibkr":
            auth_data["public_key"] = self.ibkr.get_public_key()
            auth_data["registration_required"] = True
            auth_data["instructions"] = (
                "1. Register this public key with your IBKR developer account\n"
                "2. Set up your application with the redirect URI\n"
                "3. Complete the OAuth flow using the authorization URL"
            )
        
        return auth_data
    
    async def handle_oauth_callback(
        self, 
        broker_type: str, 
        code: str, 
        state: str
    ) -> Dict[str, Any]:
        """Handle OAuth callback for specified broker"""
        broker_service = self.get_broker_service(broker_type)
        
        try:
            tokens = await broker_service.handle_oauth_callback(code, state)
            tokens["broker"] = broker_type.lower()
            return tokens
        except Exception as e:
            logger.error(f"OAuth callback failed for {broker_type}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"OAuth callback failed: {str(e)}"
            )
    
    async def refresh_token(self, broker_type: str, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token for specified broker"""
        broker_service = self.get_broker_service(broker_type)
        
        try:
            tokens = await broker_service.refresh_token(refresh_token)
            tokens["broker"] = broker_type.lower()
            return tokens
        except Exception as e:
            logger.error(f"Token refresh failed for {broker_type}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Token refresh failed: {str(e)}"
            )
    
    async def get_accounts(self, broker_type: str, access_token: str) -> List[Dict[str, Any]]:
        """Get accounts for specified broker"""
        broker_service = self.get_broker_service(broker_type)
        
        try:
            if broker_type.lower() == "tradestation":
                client = self.tradestation.create_client(access_token)
                accounts = await client.get_accounts()
                return [
                    {
                        "account_id": acc.account_id,
                        "name": acc.name,
                        "type": acc.type,
                        "status": acc.status,
                        "currency": acc.currency,
                        "broker": "tradestation",
                        "margin_enabled": acc.margin_enabled,
                        "cash_balance": acc.cash_balance,
                        "equity": acc.equity,
                        "buying_power": acc.day_trading_buying_power
                    }
                    for acc in accounts
                ]
            elif broker_type.lower() == "ibkr":
                client = self.ibkr.create_client(access_token)
                accounts = await client.get_accounts()
                return [
                    {
                        "account_id": acc.account_id,
                        "name": acc.name,
                        "type": acc.type,
                        "status": acc.status,
                        "currency": acc.currency,
                        "broker": "ibkr",
                        "margin_enabled": acc.margin_enabled,
                        "cash_balance": acc.cash_balance,
                        "equity": acc.equity,
                        "buying_power": acc.day_trading_buying_power
                    }
                    for acc in accounts
                ]
        except Exception as e:
            logger.error(f"Error fetching accounts for {broker_type}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching accounts: {str(e)}"
            )
    
    async def place_order(
        self,
        broker_type: str,
        access_token: str,
        account_id: str,
        order: UnifiedOrder
    ) -> Dict[str, Any]:
        """Place order through specified broker"""
        broker_service = self.get_broker_service(broker_type)
        
        try:
            if broker_type.lower() == "tradestation":
                client = self.tradestation.create_client(access_token)
                ts_order = order.to_tradestation_order()
                result = await client.place_order(account_id, ts_order)
            elif broker_type.lower() == "ibkr":
                client = self.ibkr.create_client(access_token)
                ibkr_order = order.to_ibkr_order()
                result = await client.place_order(account_id, ibkr_order)
            
            result["broker"] = broker_type.lower()
            return result
            
        except Exception as e:
            logger.error(f"Error placing order through {broker_type}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error placing order: {str(e)}"
            )
    
    async def get_orders(
        self, 
        broker_type: str, 
        access_token: str, 
        account_id: str
    ) -> List[Dict[str, Any]]:
        """Get orders for specified broker and account"""
        broker_service = self.get_broker_service(broker_type)
        
        try:
            if broker_type.lower() == "tradestation":
                client = self.tradestation.create_client(access_token)
                orders = await client.get_orders(account_id)
            elif broker_type.lower() == "ibkr":
                client = self.ibkr.create_client(access_token)
                orders = await client.get_orders(account_id)
            
            # Add broker information to each order
            for order in orders:
                order["broker"] = broker_type.lower()
            
            return orders
            
        except Exception as e:
            logger.error(f"Error fetching orders for {broker_type}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching orders: {str(e)}"
            )
    
    async def cancel_order(
        self,
        broker_type: str,
        access_token: str,
        account_id: str,
        order_id: str
    ) -> Dict[str, Any]:
        """Cancel order through specified broker"""
        broker_service = self.get_broker_service(broker_type)
        
        try:
            if broker_type.lower() == "tradestation":
                client = self.tradestation.create_client(access_token)
                result = await client.cancel_order(account_id, order_id)
            elif broker_type.lower() == "ibkr":
                client = self.ibkr.create_client(access_token)
                result = await client.cancel_order(account_id, order_id)
            
            result["broker"] = broker_type.lower()
            return result
            
        except Exception as e:
            logger.error(f"Error cancelling order through {broker_type}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error cancelling order: {str(e)}"
            )
    
    async def test_connection(self, broker_type: str, access_token: str) -> Dict[str, Any]:
        """Test connection to specified broker"""
        broker_service = self.get_broker_service(broker_type)
        
        try:
            result = await broker_service.test_connection(access_token)
            result["broker"] = broker_type.lower()
            return result
        except Exception as e:
            logger.error(f"Connection test failed for {broker_type}: {str(e)}")
            return {
                "broker": broker_type.lower(),
                "status": "error",
                "message": f"Connection test failed: {str(e)}"
            }

# Global broker service instance
broker_service = BrokerService()