"""
Trading-related database models
Models for broker connections, trading configurations, and order history
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from models import Base

class BrokerConnection(Base):
    """User's broker connection and OAuth tokens"""
    __tablename__ = "broker_connections"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    broker_type = Column(String, nullable=False)  # 'tradestation', 'ibkr'
    
    # OAuth tokens (encrypted in production)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)
    
    # Connection metadata
    is_active = Column(Boolean, default=True)
    connection_name = Column(String, nullable=True)  # User-friendly name
    last_used = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="broker_connections")
    trading_accounts = relationship("TradingAccount", back_populates="broker_connection", cascade="all, delete-orphan")
    trading_configs = relationship("TradingConfiguration", back_populates="broker_connection", cascade="all, delete-orphan")

class TradingAccount(Base):
    """Individual trading accounts from brokers"""
    __tablename__ = "trading_accounts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    broker_connection_id = Column(String, ForeignKey("broker_connections.id"), nullable=False, index=True)
    
    # Account details from broker
    account_id = Column(String, nullable=False)  # Broker's account ID
    account_name = Column(String, nullable=False)
    account_type = Column(String, nullable=False)  # 'CASH', 'MARGIN', 'IRA', etc.
    currency = Column(String, default="USD")
    status = Column(String, default="ACTIVE")
    
    # Account capabilities
    margin_enabled = Column(Boolean, default=False)
    day_trading_enabled = Column(Boolean, default=False)
    options_enabled = Column(Boolean, default=False)
    
    # Last known balances (cached for display)
    cash_balance = Column(Float, default=0.0)
    equity = Column(Float, default=0.0)
    buying_power = Column(Float, default=0.0)
    
    # User preferences
    is_preferred = Column(Boolean, default=False)
    nickname = Column(String, nullable=True)  # User-defined nickname
    
    # Metadata
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    broker_connection = relationship("BrokerConnection", back_populates="trading_accounts")
    trading_configs = relationship("TradingConfiguration", back_populates="trading_account", cascade="all, delete-orphan")
    order_history = relationship("OrderHistory", back_populates="trading_account", cascade="all, delete-orphan")

class TradingConfiguration(Base):
    """Trading configurations linking strategies to broker accounts"""
    __tablename__ = "trading_configurations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    strategy_id = Column(String, nullable=False, index=True)  # Reference to strategies collection
    
    # Broker and account selection
    broker_connection_id = Column(String, ForeignKey("broker_connections.id"), nullable=False)
    trading_account_id = Column(String, ForeignKey("trading_accounts.id"), nullable=False)
    
    # Trading preferences
    default_order_type = Column(String, default="MARKET")  # 'MARKET', 'LIMIT'
    default_quantity = Column(Integer, default=100)
    
    # Risk management
    max_position_size = Column(Float, nullable=True)  # Maximum $ per position
    daily_loss_limit = Column(Float, nullable=True)   # Daily loss limit in $
    
    # Live trading status
    is_live = Column(Boolean, default=False)
    auto_execute = Column(Boolean, default=False)  # Auto-execute signals
    
    # Configuration metadata
    configuration_name = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_executed = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="trading_configurations")
    broker_connection = relationship("BrokerConnection", back_populates="trading_configs")
    trading_account = relationship("TradingAccount", back_populates="trading_configs")

class OrderHistory(Base):
    """Historical record of all orders placed through the platform"""
    __tablename__ = "order_history"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    trading_account_id = Column(String, ForeignKey("trading_accounts.id"), nullable=False)
    strategy_id = Column(String, nullable=True, index=True)  # Strategy that triggered the order
    
    # Order identification
    broker_order_id = Column(String, nullable=True)  # Broker's order ID
    platform_order_id = Column(String, nullable=False, unique=True)  # Our internal order ID
    
    # Order details
    symbol = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # 'BUY', 'SELL', 'BTC', 'SS'
    quantity = Column(Integer, nullable=False)
    order_type = Column(String, nullable=False)  # 'MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'
    
    # Pricing
    limit_price = Column(Float, nullable=True)
    stop_price = Column(Float, nullable=True)
    average_fill_price = Column(Float, nullable=True)
    
    # Order status and execution
    status = Column(String, nullable=False, index=True)  # 'SUBMITTED', 'FILLED', 'CANCELLED', 'REJECTED'
    filled_quantity = Column(Integer, default=0)
    remaining_quantity = Column(Integer, default=0)
    
    # Financial details
    commission = Column(Float, default=0.0)
    fees = Column(Float, default=0.0)
    realized_pnl = Column(Float, nullable=True)
    
    # Metadata
    time_in_force = Column(String, default="DAY")
    execution_venue = Column(String, nullable=True)
    
    # Signal context (if order was triggered by strategy)
    signal_data = Column(JSON, nullable=True)  # Strategy signal that triggered this order
    
    # Timestamps
    submitted_at = Column(DateTime, default=datetime.utcnow, index=True)
    filled_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="order_history")
    trading_account = relationship("TradingAccount", back_populates="order_history")

class TradingSignal(Base):
    """Trading signals generated by strategies"""
    __tablename__ = "trading_signals"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    strategy_id = Column(String, nullable=False, index=True)
    
    # Signal details
    symbol = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # 'BUY', 'SELL', 'HOLD'
    signal_strength = Column(Float, nullable=True)  # Confidence level (0-1)
    
    # Signal context
    price_at_signal = Column(Float, nullable=True)
    market_conditions = Column(JSON, nullable=True)  # Market data at signal time
    strategy_parameters = Column(JSON, nullable=True)  # Strategy params when signal generated
    
    # Execution details
    is_executed = Column(Boolean, default=False)
    order_id = Column(String, nullable=True)  # Reference to OrderHistory if executed
    execution_delay_seconds = Column(Integer, nullable=True)
    
    # Signal metadata
    signal_type = Column(String, nullable=True)  # 'ENTRY', 'EXIT', 'SCALE_IN', 'SCALE_OUT'
    notes = Column(Text, nullable=True)
    
    # Timestamps
    generated_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=True)  # Signal expiration
    executed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="trading_signals")

# Update User model to include trading relationships
def add_trading_relationships_to_user():
    """Add trading relationships to User model"""
    from models import User
    
    if not hasattr(User, 'broker_connections'):
        User.broker_connections = relationship("BrokerConnection", back_populates="user", cascade="all, delete-orphan")
        User.trading_configurations = relationship("TradingConfiguration", back_populates="user", cascade="all, delete-orphan")
        User.order_history = relationship("OrderHistory", back_populates="user", cascade="all, delete-orphan")
        User.trading_signals = relationship("TradingSignal", back_populates="user", cascade="all, delete-orphan")