"""
Database models for Altai Trader user management and billing system
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    """User model with authentication and profile information"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Profile settings
    preferences = Column(JSON, default={})
    avatar_url = Column(String)
    
    # Relationships
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    payment_methods = relationship("PaymentMethod", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Subscription(Base):
    """Subscription model for billing management"""
    __tablename__ = "subscriptions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    plan_id = Column(String, nullable=False)
    plan_name = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, active, canceled, expired, past_due
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    billing_cycle = Column(String, default="monthly")  # monthly, yearly
    billing_interval = Column(Integer, default=1)
    
    # Dates
    start_date = Column(DateTime, default=datetime.utcnow)
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    next_billing_date = Column(DateTime)
    canceled_at = Column(DateTime)
    trial_end = Column(DateTime)
    
    # Adyen integration
    adyen_subscription_id = Column(String)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    transactions = relationship("Transaction", back_populates="subscription", cascade="all, delete-orphan")

class PaymentMethod(Base):
    """Stored payment methods for users"""
    __tablename__ = "payment_methods"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Adyen tokenization
    adyen_shopper_reference = Column(String)
    adyen_token = Column(String, unique=True)
    
    # Payment method details
    payment_type = Column(String)  # card, paypal, bank_transfer, etc.
    brand = Column(String)  # visa, mastercard, etc.
    last_four = Column(String)
    expiry_month = Column(String)
    expiry_year = Column(String)
    holder_name = Column(String)
    
    # Status
    is_default = Column(Boolean, default=False)
    is_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="payment_methods")

class Transaction(Base):
    """Transaction records for payments and billing"""
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(String, ForeignKey("subscriptions.id"))
    
    # Transaction details
    amount = Column(Float, nullable=False)
    currency = Column(String, default="USD")
    description = Column(String)
    transaction_type = Column(String)  # payment, refund, adjustment
    status = Column(String)  # pending, authorized, settled, failed, refunded
    
    # Adyen integration
    adyen_psp_reference = Column(String, unique=True)
    adyen_merchant_reference = Column(String)
    adyen_event_code = Column(String)
    
    # Payment method used
    payment_method_id = Column(String, ForeignKey("payment_methods.id"))
    
    # Timestamps
    processed_at = Column(DateTime)
    settled_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Additional data
    transaction_metadata = Column(JSON, default={})
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    subscription = relationship("Subscription", back_populates="transactions")

class Notification(Base):
    """User notifications for billing, trading, and system events"""
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Notification details
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String, nullable=False)  # billing, trade, system, alert
    priority = Column(String, default="normal")  # low, normal, high, urgent
    
    # Status
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    
    # Action data
    action_type = Column(String)  # link, button, none
    action_data = Column(JSON)  # URL, API endpoint, etc.
    
    # Timestamps
    scheduled_for = Column(DateTime)  # For scheduled notifications
    sent_at = Column(DateTime)
    read_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notifications")

class BillingEvent(Base):
    """Audit trail for billing events"""
    __tablename__ = "billing_events"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"))
    subscription_id = Column(String, ForeignKey("subscriptions.id"))
    transaction_id = Column(String, ForeignKey("transactions.id"))
    
    # Event details
    event_type = Column(String, nullable=False)  # subscription_created, payment_failed, etc.
    event_data = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Subscription plans configuration (could be moved to database later)
SUBSCRIPTION_PLANS = {
    "basic_monthly": {
        "id": "basic_monthly",
        "name": "Basic Plan",
        "description": "Essential trading features",
        "amount": 29.99,
        "currency": "USD",
        "billing_cycle": "monthly",
        "features": [
            "Up to 2 live strategies",
            "Basic backtesting",
            "Real-time news feed",
            "Email support"
        ]
    },
    "pro_monthly": {
        "id": "pro_monthly", 
        "name": "Pro Plan",
        "description": "Advanced trading capabilities",
        "amount": 79.99,
        "currency": "USD",
        "billing_cycle": "monthly",
        "features": [
            "Unlimited live strategies",
            "Advanced backtesting",
            "Real-time news feed",
            "IBKR & TradeStation integration",
            "Priority support"
        ]
    },
    "enterprise_monthly": {
        "id": "enterprise_monthly",
        "name": "Enterprise Plan", 
        "description": "Full-featured trading platform",
        "amount": 199.99,
        "currency": "USD",
        "billing_cycle": "monthly",
        "features": [
            "Everything in Pro",
            "Custom strategies",
            "API access",
            "White-label options",
            "Dedicated support"
        ]
    }
}

# Trading and Performance Models (stored in MongoDB via Pydantic)

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class TradeSource(str, Enum):
    """Source of trade data"""
    BACKTEST = "backtest"
    LIVE = "live"
    PAPER = "paper"

class TradeModel(BaseModel):
    """Individual trade record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    strategy_id: Optional[str] = None
    backtest_id: Optional[str] = None
    
    # Trade details
    symbol: str
    side: str  # "long" or "short"
    quantity: float
    entry_price: float
    exit_price: Optional[float] = None
    
    # Timestamps
    entry_time: datetime
    exit_time: Optional[datetime] = None
    
    # P&L and performance
    pnl: Optional[float] = None
    pnl_percent: Optional[float] = None
    mae: Optional[float] = None  # Maximum Adverse Excursion
    mfe: Optional[float] = None  # Maximum Favorable Excursion
    
    # Fees and slippage
    commission: float = 0.0
    slippage: float = 0.0
    
    # Trade metadata
    source: TradeSource = TradeSource.LIVE
    broker: Optional[str] = None
    account_id: Optional[str] = None
    order_ids: List[str] = []
    
    # Additional data
    metadata: Dict[str, Any] = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DailyPerformanceModel(BaseModel):
    """Daily aggregated performance metrics"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: date
    
    # Daily metrics
    trades_count: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    
    # P&L
    gross_pnl: float = 0.0
    net_pnl: float = 0.0
    commission_total: float = 0.0
    
    # Returns
    return_percent: float = 0.0
    return_r: float = 0.0  # R-multiple return
    
    # Account values
    starting_equity: Optional[float] = None
    ending_equity: Optional[float] = None
    
    # Source breakdown
    source: TradeSource = TradeSource.LIVE
    strategy_breakdown: Dict[str, float] = {}  # strategy_id -> pnl
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class StrategyModel(BaseModel):
    """Trading strategy definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Strategy details
    name: str
    description: Optional[str] = None
    code: Optional[str] = None  # Strategy code/script
    parameters: Dict[str, Any] = {}
    
    # Status
    is_active: bool = True
    is_live: bool = False
    
    # Performance tracking
    total_trades: int = 0
    win_rate: Optional[float] = None
    profit_factor: Optional[float] = None
    total_pnl: float = 0.0
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BacktestModel(BaseModel):
    """Backtest configuration and results"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    strategy_id: str
    
    # Configuration
    name: str
    symbols: List[str]
    start_date: date
    end_date: date
    initial_capital: float = 100000.0
    
    # Parameters
    commission: float = 0.0
    slippage: float = 0.0
    timeframe: str = "1D"
    parameters: Dict[str, Any] = {}
    
    # Status
    status: str = "pending"  # pending, running, completed, error, cancelled
    progress: float = 0.0
    
    # Results (populated when completed)
    total_trades: Optional[int] = None
    win_rate: Optional[float] = None
    profit_factor: Optional[float] = None
    total_return: Optional[float] = None
    max_drawdown: Optional[float] = None
    sharpe_ratio: Optional[float] = None
    
    # Error handling
    error_message: Optional[str] = None
    
    # Timestamps
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WatchlistModel(BaseModel):
    """Watchlist configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    name: str
    description: Optional[str] = None
    
    # Column configuration
    columns: List[Dict[str, Any]] = []  # Column definitions
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class WatchlistItemModel(BaseModel):
    """Individual watchlist entry"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    watchlist_id: str
    user_id: str
    
    # Core data
    ticker: str
    data: Dict[str, Any] = {}  # Dynamic data based on watchlist columns
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BrokerConnectionModel(BaseModel):
    """Broker OAuth connection"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    
    # Connection details
    broker: str  # tradestation, ibkr, robinhood, coinbase, kraken
    account_name: Optional[str] = None
    
    # OAuth tokens (encrypted in storage)
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    # Status
    status: str = "disconnected"  # connected, disconnected, expired, error
    last_sync: Optional[datetime] = None
    last_error: Optional[str] = None
    
    # Metadata
    connection_metadata: Dict[str, Any] = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Response Models for API

class DashboardMetricsResponse(BaseModel):
    """Dashboard metrics API response"""
    
    # Performance cards
    total_trades: int
    win_rate_trades: float  # Win rate by number of trades
    win_rate_days: Optional[float] = None  # Win rate by profitable days
    profit_factor: Optional[float] = None
    avg_win: Optional[float] = None
    avg_loss: Optional[float] = None
    total_pnl: float
    total_return: float
    
    # Time series data
    daily_pnl: List[Dict[str, Any]] = []  # [{date, pnl, trades, equity}]
    equity_curve: List[Dict[str, Any]] = []  # [{date, equity, drawdown}]
    
    # Period info
    start_date: date
    end_date: date
    total_days: int
    trading_days: int
    
    # Data source
    source_filter: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat()
        }

class BacktestResultsResponse(BaseModel):
    """Backtest results API response"""
    
    # Basic info
    backtest_id: str
    name: str
    status: str
    
    # Configuration
    symbols: List[str]
    start_date: date
    end_date: date
    initial_capital: float
    
    # Performance metrics
    total_trades: int
    win_rate: float
    profit_factor: float
    total_return: float
    cagr: float
    max_drawdown: float
    sharpe_ratio: Optional[float] = None
    
    # Detailed results
    equity_curve: List[Dict[str, Any]] = []
    trades: List[Dict[str, Any]] = []
    
    # Summary stats
    avg_win: float
    avg_loss: float
    largest_win: float
    largest_loss: float
    
    completed_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat(),
            date: lambda d: d.isoformat()
        }