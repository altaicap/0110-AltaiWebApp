"""
Adyen payment processing service for Altai Trader billing
"""

import os
import logging
import hmac
import hashlib
import base64
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

try:
    import Adyen
    ADYEN_AVAILABLE = True
except ImportError:
    ADYEN_AVAILABLE = False
    logging.warning("Adyen SDK not available, using mock mode")

from models import User, Subscription, PaymentMethod, Transaction, Notification

logger = logging.getLogger(__name__)

class AdyenService:
    """Adyen payment processing service"""
    
    def __init__(self):
        self.api_key = os.getenv("ADYEN_API_KEY")
        self.merchant_account = os.getenv("ADYEN_MERCHANT_ACCOUNT")
        self.hmac_key = os.getenv("ADYEN_HMAC_KEY")
        self.client_key = os.getenv("ADYEN_CLIENT_KEY")
        self.environment = os.getenv("ADYEN_ENVIRONMENT", "test")
        
        # Initialize Adyen client if available
        if ADYEN_AVAILABLE and self.api_key:
            self.adyen = Adyen.Adyen()
            self.adyen.payment.client.xapikey = self.api_key
            if self.environment == "live":
                self.adyen.payment.client.live_endpoint_prefix = os.getenv("ADYEN_LIVE_PREFIX")
        else:
            self.adyen = None
            logger.warning("Adyen client not initialized - using mock mode")
    
    async def create_payment_session(
        self, 
        user: User,
        amount: float,
        currency: str = "USD",
        return_url: str = None,
        store_payment_method: bool = True
    ) -> Dict[str, Any]:
        """Create Adyen payment session for checkout"""
        try:
            if not self.adyen:
                return self._mock_payment_session(user.id, amount, currency)
            
            # Convert amount to minor units (cents)
            amount_minor_units = int(amount * 100)
            
            request = {
                "amount": {
                    "currency": currency,
                    "value": amount_minor_units
                },
                "countryCode": "US",
                "merchantAccount": self.merchant_account,
                "reference": f"altai_trader_{user.id}_{datetime.utcnow().timestamp()}",
                "returnUrl": return_url or "https://altai-trader/payment-result",
                "shopperReference": user.id
            }
            
            # Add tokenization for subscription payments
            if store_payment_method:
                request["storePaymentMethod"] = True
                request["recurringProcessingModel"] = "Subscription"
            
            result = self.adyen.checkout.sessions(request)
            
            return {
                "session_id": result.message.get("id"),
                "session_data": result.message.get("sessionData"),
                "client_key": self.client_key,
                "amount": amount,
                "currency": currency
            }
            
        except Exception as e:
            logger.error(f"Error creating payment session: {str(e)}")
            # Fallback to mock for development
            return self._mock_payment_session(user.id, amount, currency)
    
    async def process_subscription_payment(
        self,
        db: Session,
        user: User,
        subscription: Subscription,
        payment_method: PaymentMethod
    ) -> Dict[str, Any]:
        """Process recurring subscription payment"""
        try:
            if not self.adyen or not payment_method.adyen_token:
                return self._mock_subscription_payment(db, user, subscription)
            
            amount_minor_units = int(subscription.amount * 100)
            
            request = {
                "amount": {
                    "currency": subscription.currency,
                    "value": amount_minor_units
                },
                "reference": f"subscription_{subscription.id}_{datetime.utcnow().timestamp()}",
                "merchantAccount": self.merchant_account,
                "paymentMethod": {
                    "storedPaymentMethodId": payment_method.adyen_token
                },
                "shopperReference": user.id,
                "recurringProcessingModel": "Subscription",
                "shopperInteraction": "ContAuth"
            }
            
            result = self.adyen.checkout.payments(request)
            response = result.message
            
            # Create transaction record
            transaction = Transaction(
                user_id=user.id,
                subscription_id=subscription.id,
                amount=subscription.amount,
                currency=subscription.currency,
                description=f"Subscription payment - {subscription.plan_name}",
                transaction_type="payment",
                status="pending",
                adyen_psp_reference=response.get("pspReference"),
                adyen_merchant_reference=request["reference"],
                payment_method_id=payment_method.id,
                processed_at=datetime.utcnow()
            )
            
            db.add(transaction)
            
            # Update transaction status based on result
            if response.get("resultCode") == "Authorised":
                transaction.status = "authorized"
                subscription.status = "active"
                
                # Create success notification
                notification = Notification(
                    user_id=user.id,
                    title="Payment Successful",
                    message=f"Your subscription payment of ${subscription.amount} has been processed successfully.",
                    notification_type="billing",
                    priority="normal"
                )
                db.add(notification)
                
            elif response.get("resultCode") in ["Pending", "Received"]:
                transaction.status = "pending"
            else:
                transaction.status = "failed"
                subscription.status = "past_due"
                
                # Create failure notification
                notification = Notification(
                    user_id=user.id,
                    title="Payment Failed",
                    message=f"We couldn't process your subscription payment of ${subscription.amount}. Please update your payment method.",
                    notification_type="billing",
                    priority="high",
                    action_type="link",
                    action_data={"url": "/billing/payment-methods"}
                )
                db.add(notification)
            
            db.commit()
            
            return {
                "success": transaction.status == "authorized",
                "transaction_id": transaction.id,
                "status": transaction.status,
                "psp_reference": response.get("pspReference")
            }
            
        except Exception as e:
            logger.error(f"Error processing subscription payment: {str(e)}")
            return self._mock_subscription_payment(db, user, subscription)
    
    async def get_stored_payment_methods(self, user: User) -> Dict[str, Any]:
        """Retrieve stored payment methods for a user"""
        try:
            if not self.adyen:
                return self._mock_payment_methods(user.id)
            
            request = {
                "merchantAccount": self.merchant_account,
                "shopperReference": user.id
            }
            
            result = self.adyen.checkout.payment_methods(request)
            return result.message
            
        except Exception as e:
            logger.error(f"Error retrieving payment methods: {str(e)}")
            return self._mock_payment_methods(user.id)
    
    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify Adyen webhook HMAC signature"""
        if not self.hmac_key:
            logger.warning("HMAC key not configured, skipping signature verification")
            return True  # Allow in development mode
        
        try:
            binary_hmac_key = base64.b64decode(self.hmac_key)
            calculated_signature = hmac.new(
                binary_hmac_key,
                payload.encode('utf-8'),
                hashlib.sha256
            ).digest()
            
            expected_signature = base64.b64encode(calculated_signature).decode('utf-8')
            
            return hmac.compare_digest(signature, expected_signature)
            
        except Exception as e:
            logger.error(f"Error verifying webhook signature: {str(e)}")
            return False
    
    async def process_webhook_notification(
        self,
        db: Session,
        notification: Dict[str, Any]
    ) -> None:
        """Process Adyen webhook notification"""
        try:
            event_code = notification.get("eventCode")
            psp_reference = notification.get("pspReference")
            merchant_reference = notification.get("merchantReference")
            success = notification.get("success", "false") == "true"
            
            logger.info(f"Processing webhook: {event_code} - {psp_reference}")
            
            # Find related transaction
            transaction = db.query(Transaction).filter(
                Transaction.adyen_psp_reference == psp_reference
            ).first()
            
            if not transaction:
                logger.warning(f"Transaction not found for PSP reference: {psp_reference}")
                return
            
            # Handle different event types
            if event_code == "AUTHORISATION":
                await self._handle_authorization_webhook(db, transaction, success, notification)
            elif event_code == "CAPTURE":
                await self._handle_capture_webhook(db, transaction, success, notification)
            elif event_code == "REFUND":
                await self._handle_refund_webhook(db, transaction, success, notification)
            elif event_code == "CHARGEBACK":
                await self._handle_chargeback_webhook(db, transaction, notification)
            
            db.commit()
            
        except Exception as e:
            logger.error(f"Error processing webhook notification: {str(e)}")
            db.rollback()
    
    async def cancel_subscription(
        self,
        db: Session,
        subscription: Subscription
    ) -> bool:
        """Cancel a subscription"""
        try:
            subscription.status = "canceled"
            subscription.canceled_at = datetime.utcnow()
            
            # Create cancellation notification
            notification = Notification(
                user_id=subscription.user_id,
                title="Subscription Canceled",
                message=f"Your {subscription.plan_name} subscription has been canceled. Access will continue until {subscription.current_period_end.strftime('%B %d, %Y')}.",
                notification_type="billing",
                priority="normal"
            )
            db.add(notification)
            db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error canceling subscription: {str(e)}")
            return False
    
    # Mock methods for development
    def _mock_payment_session(self, user_id: str, amount: float, currency: str) -> Dict[str, Any]:
        """Mock payment session for development"""
        return {
            "session_id": f"mock_session_{user_id}_{datetime.utcnow().timestamp()}",
            "session_data": "mock_session_data",
            "client_key": "pub_mock_client_key",
            "amount": amount,
            "currency": currency,
            "mock": True
        }
    
    def _mock_subscription_payment(self, db: Session, user: User, subscription: Subscription) -> Dict[str, Any]:
        """Mock subscription payment for development"""
        transaction = Transaction(
            user_id=user.id,
            subscription_id=subscription.id,
            amount=subscription.amount,
            currency=subscription.currency,
            description=f"Mock subscription payment - {subscription.plan_name}",
            transaction_type="payment",
            status="authorized",
            adyen_psp_reference=f"mock_psp_{datetime.utcnow().timestamp()}",
            processed_at=datetime.utcnow()
        )
        
        db.add(transaction)
        subscription.status = "active"
        
        notification = Notification(
            user_id=user.id,
            title="Mock Payment Successful",
            message=f"Mock subscription payment of ${subscription.amount} processed successfully.",
            notification_type="billing",
            priority="normal"
        )
        db.add(notification)
        db.commit()
        
        return {
            "success": True,
            "transaction_id": transaction.id,
            "status": "authorized",
            "mock": True
        }
    
    def _mock_payment_methods(self, user_id: str) -> Dict[str, Any]:
        """Mock payment methods for development"""
        return {
            "storedPaymentMethods": [
                {
                    "id": f"mock_pm_{user_id}",
                    "name": "•••• 4242",
                    "brand": "visa",
                    "type": "scheme"
                }
            ],
            "mock": True
        }
    
    # Webhook handlers
    async def _handle_authorization_webhook(
        self,
        db: Session,
        transaction: Transaction,
        success: bool,
        notification: Dict[str, Any]
    ):
        """Handle authorization webhook"""
        if success:
            transaction.status = "authorized"
            if transaction.subscription:
                transaction.subscription.status = "active"
        else:
            transaction.status = "failed"
            if transaction.subscription:
                transaction.subscription.status = "past_due"
        
        transaction.updated_at = datetime.utcnow()
    
    async def _handle_capture_webhook(
        self,
        db: Session,
        transaction: Transaction,
        success: bool,
        notification: Dict[str, Any]
    ):
        """Handle capture webhook"""
        if success:
            transaction.status = "settled"
            transaction.settled_at = datetime.utcnow()
    
    async def _handle_refund_webhook(
        self,
        db: Session,
        transaction: Transaction,
        success: bool,
        notification: Dict[str, Any]
    ):
        """Handle refund webhook"""
        if success:
            # Create refund transaction
            refund_transaction = Transaction(
                user_id=transaction.user_id,
                subscription_id=transaction.subscription_id,
                amount=-transaction.amount,  # Negative amount for refund
                currency=transaction.currency,
                description=f"Refund for transaction {transaction.id}",
                transaction_type="refund",
                status="settled",
                adyen_psp_reference=notification.get("pspReference"),
                processed_at=datetime.utcnow(),
                settled_at=datetime.utcnow()
            )
            db.add(refund_transaction)
    
    async def _handle_chargeback_webhook(
        self,
        db: Session,
        transaction: Transaction,
        notification: Dict[str, Any]
    ):
        """Handle chargeback webhook"""
        # Create chargeback notification for user
        chargeback_notification = Notification(
            user_id=transaction.user_id,
            title="Chargeback Notice",
            message=f"A chargeback has been initiated for your payment of ${transaction.amount}. Please contact support if you have any questions.",
            notification_type="billing",
            priority="high",
            action_type="link",
            action_data={"url": "/support"}
        )
        db.add(chargeback_notification)