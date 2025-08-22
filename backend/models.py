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