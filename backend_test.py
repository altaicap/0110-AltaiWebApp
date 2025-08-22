#!/usr/bin/env python3
"""
Phase 1 Authentication and Billing System Test Suite
Tests authentication, billing, notifications, and system health endpoints
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any

class Phase1AuthBillingTester:
    def __init__(self, base_url="https://backtest-hub-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.auth_token = None
        self.test_user_id = None

    def log_test(self, name: str, success: bool, message: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED - {message}")
        else:
            print(f"❌ {name}: FAILED - {message}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "message": message,
            "response_data": response_data
        })

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict = None, params: Dict = None, headers: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, params=params, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            try:
                response_json = response.json()
            except:
                response_json = {"raw_response": response.text}

            if success:
                self.log_test(name, True, f"Status: {response.status_code}", response_json)
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}")

            return success, response_json

        except requests.exceptions.Timeout:
            self.log_test(name, False, "Request timeout (30s)")
            return False, {}
        except requests.exceptions.ConnectionError:
            self.log_test(name, False, "Connection error - backend may be down")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_system_health(self):
        """Test system health endpoint"""
        print("\n🔍 Testing System Health Endpoint...")
        
        success, response = self.run_test(
            "System Health Check",
            "GET",
            "/api/system/health",
            200
        )
        
        if success and response:
            # Verify response structure
            required_fields = ["status", "databases", "version", "timestamp"]
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Health Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Health Response Structure", True, "All required fields present")
                
                # Check database health
                databases = response.get("databases", {})
                mongodb_healthy = databases.get("mongodb", False)
                sql_healthy = databases.get("sql", False)
                
                self.log_test("MongoDB Health", mongodb_healthy, f"MongoDB status: {mongodb_healthy}")
                self.log_test("SQL Database Health", sql_healthy, f"SQL DB status: {sql_healthy}")
                
                # Check overall status
                overall_status = response.get("status")
                self.log_test("Overall System Status", overall_status in ["healthy", "degraded"], 
                             f"System status: {overall_status}")

    def test_user_registration(self):
        """Test user registration endpoint"""
        print("\n🔍 Testing User Registration...")
        
        # Test with new user
        timestamp = int(datetime.utcnow().timestamp())
        test_user_data = {
            "email": f"testuser{timestamp}@altaitrader.com",
            "full_name": "Test User",
            "password": "TestPassword123"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "/api/auth/register",
            200,
            data=test_user_data
        )
        
        if success and response:
            # Verify response structure
            required_fields = ["access_token", "token_type", "user"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Registration Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Registration Response Structure", True, "All required fields present")
                
                # Store token for later tests
                self.auth_token = response.get("access_token")
                user_info = response.get("user", {})
                self.test_user_id = user_info.get("id")
                
                self.log_test("Access Token Generated", bool(self.auth_token), 
                             f"Token length: {len(self.auth_token) if self.auth_token else 0}")
                self.log_test("User ID Generated", bool(self.test_user_id), 
                             f"User ID: {self.test_user_id}")
        
        # Test duplicate email registration - try the same email again
        success, response = self.run_test(
            "Duplicate Email Registration",
            "POST",
            "/api/auth/register",
            400,
            data=test_user_data
        )
        
        # If it returns 200, it means duplicate validation isn't working properly
        if not success and response.get("access_token"):
            self.log_test("Duplicate Email Handling", False, "Duplicate email was allowed - validation issue")
        elif success:
            self.log_test("Duplicate Email Handling", True, "Correctly rejected duplicate email")

    def test_default_user_login(self):
        """Test login with default users"""
        print("\n🔍 Testing Default User Login...")
        
        # Test Alex G login
        alex_login = {
            "email": "alex@altaitrader.com",
            "password": "Altai2025"
        }
        
        success, response = self.run_test(
            "Alex G Login",
            "POST",
            "/api/auth/login",
            200,
            data=alex_login
        )
        
        if success and response:
            required_fields = ["access_token", "token_type", "user"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Alex Login Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Alex Login Response Structure", True, "All required fields present")
                
                user_info = response.get("user", {})
                email = user_info.get("email")
                full_name = user_info.get("full_name")
                
                self.log_test("Alex User Info", email == "alex@altaitrader.com", 
                             f"Email: {email}, Name: {full_name}")
        
        # Test Charles H login
        charles_login = {
            "email": "charles@altaitrader.com",
            "password": "Altai2025"
        }
        
        success, response = self.run_test(
            "Charles H Login",
            "POST",
            "/api/auth/login",
            200,
            data=charles_login
        )
        
        if success and response:
            user_info = response.get("user", {})
            email = user_info.get("email")
            full_name = user_info.get("full_name")
            
            self.log_test("Charles User Info", email == "charles@altaitrader.com", 
                         f"Email: {email}, Name: {full_name}")
        
        # Test invalid login
        invalid_login = {
            "email": "invalid@altaitrader.com",
            "password": "wrongpassword"
        }
        
        success, response = self.run_test(
            "Invalid Login",
            "POST",
            "/api/auth/login",
            401,
            data=invalid_login
        )
        
        if success:
            self.log_test("Invalid Login Handling", True, "Correctly rejected invalid credentials")

    def test_jwt_authentication(self):
        """Test JWT token authentication on protected endpoints"""
        print("\n🔍 Testing JWT Authentication...")
        
        if not self.auth_token:
            self.log_test("JWT Authentication Setup", False, "No auth token available for testing")
            return
        
        # Test accessing protected endpoint with valid token
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        success, response = self.run_test(
            "Protected Endpoint with Valid Token",
            "GET",
            "/api/auth/me",
            200,
            headers=auth_headers
        )
        
        if success and response:
            required_fields = ["id", "email", "full_name", "is_active", "created_at"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("User Profile Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("User Profile Response Structure", True, "All required fields present")
                
                is_active = response.get("is_active")
                self.log_test("User Active Status", is_active, f"User active: {is_active}")
        
        # Test accessing protected endpoint without token
        success, response = self.run_test(
            "Protected Endpoint without Token",
            "GET",
            "/api/auth/me",
            401
        )
        
        if success:
            self.log_test("Unauthorized Access Handling", True, "Correctly rejected request without token")
        
        # Test with invalid token
        invalid_headers = {"Authorization": "Bearer invalid_token_12345"}
        
        success, response = self.run_test(
            "Protected Endpoint with Invalid Token",
            "GET",
            "/api/auth/me",
            401,
            headers=invalid_headers
        )
        
        if success:
            self.log_test("Invalid Token Handling", True, "Correctly rejected invalid token")

    def test_user_profile_management(self):
        """Test user profile GET and PUT endpoints"""
        print("\n🔍 Testing User Profile Management...")
        
        if not self.auth_token:
            self.log_test("Profile Management Setup", False, "No auth token available for testing")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test profile update
        profile_update = {
            "full_name": "Updated Test User",
            "email": f"updated{int(datetime.utcnow().timestamp())}@altaitrader.com"
        }
        
        success, response = self.run_test(
            "Update User Profile",
            "PUT",
            "/api/auth/me",
            200,
            data=profile_update,
            headers=auth_headers
        )
        
        if success and response:
            updated_name = response.get("full_name")
            updated_email = response.get("email")
            
            self.log_test("Profile Name Update", updated_name == profile_update["full_name"], 
                         f"Updated name: {updated_name}")
            self.log_test("Profile Email Update", updated_email == profile_update["email"], 
                         f"Updated email: {updated_email}")

    def test_password_update(self):
        """Test password update endpoint"""
        print("\n🔍 Testing Password Update...")
        
        if not self.auth_token:
            self.log_test("Password Update Setup", False, "No auth token available for testing")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test password update
        password_update = {
            "current_password": "TestPassword123",
            "new_password": "NewTestPassword456"
        }
        
        success, response = self.run_test(
            "Update Password",
            "PUT",
            "/api/auth/password",
            200,
            data=password_update,
            headers=auth_headers
        )
        
        if success and response:
            message = response.get("message", "")
            self.log_test("Password Update Success", "successfully" in message.lower(), 
                         f"Response: {message}")
        
        # Test with wrong current password
        wrong_password_update = {
            "current_password": "WrongPassword123",
            "new_password": "NewTestPassword789"
        }
        
        success, response = self.run_test(
            "Update Password with Wrong Current",
            "PUT",
            "/api/auth/password",
            400,
            data=wrong_password_update,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Wrong Current Password Handling", True, "Correctly rejected wrong current password")

    def test_subscription_plans(self):
        """Test subscription plans endpoint"""
        print("\n🔍 Testing Subscription Plans...")
        
        success, response = self.run_test(
            "Get Subscription Plans",
            "GET",
            "/api/billing/plans",
            200
        )
        
        if success and response:
            plans = response.get("plans", [])
            self.log_test("Subscription Plans Available", len(plans) > 0, 
                         f"Found {len(plans)} subscription plans")
            
            if plans:
                # Verify plan structure
                plan = plans[0]
                required_fields = ["id", "name", "amount", "currency", "billing_cycle"]
                missing_fields = [field for field in required_fields if field not in plan]
                
                if missing_fields:
                    self.log_test("Plan Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Plan Structure", True, "All required fields present")
                    
                    # Log plan details
                    plan_name = plan.get("name")
                    plan_amount = plan.get("amount")
                    plan_currency = plan.get("currency")
                    
                    self.log_test("Plan Details", True, 
                                 f"Sample plan: {plan_name} - {plan_amount} {plan_currency}")

    def test_payment_session_creation(self):
        """Test payment session creation (Adyen integration)"""
        print("\n🔍 Testing Payment Session Creation...")
        
        if not self.auth_token:
            self.log_test("Payment Session Setup", False, "No auth token available for testing")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test payment session creation
        payment_data = {
            "amount": 29.99,
            "plan_id": "basic_monthly"
        }
        
        success, response = self.run_test(
            "Create Payment Session",
            "POST",
            "/api/billing/payment-session",
            200,
            data=payment_data,
            headers=auth_headers
        )
        
        if success and response:
            # In mock mode, we expect some session data
            session_id = response.get("sessionId") or response.get("session_id")
            self.log_test("Payment Session Created", bool(session_id), 
                         f"Session ID: {session_id}")
        
        # Test with invalid plan ID
        invalid_payment_data = {
            "amount": 29.99,
            "plan_id": "invalid_plan"
        }
        
        success, response = self.run_test(
            "Create Payment Session with Invalid Plan",
            "POST",
            "/api/billing/payment-session",
            400,
            data=invalid_payment_data,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Invalid Plan Handling", True, "Correctly rejected invalid plan ID")

    def test_user_subscriptions(self):
        """Test user subscriptions management"""
        print("\n🔍 Testing User Subscriptions...")
        
        if not self.auth_token:
            self.log_test("Subscriptions Setup", False, "No auth token available for testing")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test getting user subscriptions
        success, response = self.run_test(
            "Get User Subscriptions",
            "GET",
            "/api/billing/subscriptions",
            200,
            headers=auth_headers
        )
        
        if success and response:
            subscriptions = response.get("subscriptions", [])
            self.log_test("User Subscriptions Retrieved", True, 
                         f"Found {len(subscriptions)} subscriptions")
            
            if subscriptions:
                # Verify subscription structure
                subscription = subscriptions[0]
                required_fields = ["id", "plan_id", "plan_name", "status", "amount", "currency"]
                missing_fields = [field for field in required_fields if field not in subscription]
                
                if missing_fields:
                    self.log_test("Subscription Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Subscription Structure", True, "All required fields present")
        
        # Test creating a subscription
        subscription_data = {
            "plan_id": "basic_monthly"
        }
        
        success, response = self.run_test(
            "Create Subscription",
            "POST",
            "/api/billing/subscriptions",
            200,
            data=subscription_data,
            headers=auth_headers
        )
        
        if success and response:
            subscription_id = response.get("subscription_id")
            status = response.get("status")
            
            self.log_test("Subscription Created", bool(subscription_id), 
                         f"Subscription ID: {subscription_id}, Status: {status}")

    def test_notifications_system(self):
        """Test notifications endpoints"""
        print("\n🔍 Testing Notifications System...")
        
        if not self.auth_token:
            self.log_test("Notifications Setup", False, "No auth token available for testing")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test getting user notifications
        success, response = self.run_test(
            "Get User Notifications",
            "GET",
            "/api/notifications",
            200,
            headers=auth_headers
        )
        
        if success and response:
            notifications = response.get("notifications", [])
            self.log_test("User Notifications Retrieved", True, 
                         f"Found {len(notifications)} notifications")
            
            if notifications:
                # Verify notification structure
                notification = notifications[0]
                required_fields = ["id", "title", "message", "notification_type", "priority", "is_read", "created_at"]
                missing_fields = [field for field in required_fields if field not in notification]
                
                if missing_fields:
                    self.log_test("Notification Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Notification Structure", True, "All required fields present")
                    
                    # Test marking notification as read
                    notification_id = notification.get("id")
                    if notification_id:
                        success, read_response = self.run_test(
                            "Mark Notification as Read",
                            "PUT",
                            f"/api/notifications/{notification_id}/read",
                            200,
                            headers=auth_headers
                        )
                        
                        if success and read_response:
                            message = read_response.get("message", "")
                            self.log_test("Notification Mark Read", "read" in message.lower(), 
                                         f"Response: {message}")
        
        # Test with query parameters
        success, response = self.run_test(
            "Get Unread Notifications Only",
            "GET",
            "/api/notifications",
            200,
            params={"unread_only": True, "limit": 10},
            headers=auth_headers
        )
        
        if success and response:
            notifications = response.get("notifications", [])
            self.log_test("Unread Notifications Filter", True, 
                         f"Found {len(notifications)} unread notifications")

    def test_adyen_webhook_endpoint(self):
        """Test Adyen webhook endpoint (mock data)"""
        print("\n🔍 Testing Adyen Webhook Endpoint...")
        
        # Test webhook with mock Adyen notification
        mock_webhook_data = {
            "notificationItems": [
                {
                    "NotificationRequestItem": {
                        "eventCode": "AUTHORISATION",
                        "success": "true",
                        "paymentMethod": "visa",
                        "amount": {
                            "value": 2999,
                            "currency": "USD"
                        },
                        "merchantReference": f"test_payment_{int(datetime.utcnow().timestamp())}",
                        "pspReference": f"test_psp_{int(datetime.utcnow().timestamp())}",
                        "eventDate": datetime.utcnow().isoformat()
                    }
                }
            ]
        }
        
        success, response = self.run_test(
            "Adyen Webhook Processing",
            "POST",
            "/api/webhooks/adyen",
            200,
            data=mock_webhook_data
        )
        
        if success and response:
            notification_response = response.get("notificationResponse")
            self.log_test("Adyen Webhook Response", notification_response == "[accepted]", 
                         f"Response: {notification_response}")
        
        # Test webhook with malformed data
        malformed_webhook = {
            "invalid_field": "test"
        }
        
        success, response = self.run_test(
            "Adyen Webhook Malformed Data",
            "POST",
            "/api/webhooks/adyen",
            500,  # Should handle gracefully but may return error
            data=malformed_webhook
        )
        
        # Accept either 500 or 200 as both are valid responses for malformed data
        if response and response.get("notificationResponse") == "[accepted]":
            self.log_test("Malformed Webhook Handling", True, "Webhook handled gracefully")

    def test_database_initialization(self):
        """Test database initialization and health"""
        print("\n🔍 Testing Database Initialization...")
        
        # Test system health to verify both databases
        success, response = self.run_test(
            "Database Health Check",
            "GET",
            "/api/system/health",
            200
        )
        
        if success and response:
            databases = response.get("databases", {})
            mongodb_status = databases.get("mongodb")
            sql_status = databases.get("sql")
            
            self.log_test("MongoDB Initialization", mongodb_status, 
                         f"MongoDB status: {mongodb_status}")
            self.log_test("SQLite Initialization", sql_status, 
                         f"SQL DB status: {sql_status}")
            
            # Check if both databases are healthy
            both_healthy = mongodb_status and sql_status
            self.log_test("Dual Database Setup", both_healthy, 
                         f"Both databases healthy: {both_healthy}")

    def run_all_tests(self):
        """Run all Phase 1 authentication and billing tests"""
        print("🚀 Starting Phase 1 Authentication and Billing System Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 70)
        
        # Run all test suites in logical order
        self.test_system_health()
        self.test_database_initialization()
        self.test_user_registration()
        self.test_default_user_login()
        self.test_jwt_authentication()
        self.test_user_profile_management()
        self.test_password_update()
        self.test_subscription_plans()
        self.test_payment_session_creation()
        self.test_user_subscriptions()
        self.test_notifications_system()
        self.test_adyen_webhook_endpoint()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 PHASE 1 TEST SUMMARY")
        print("=" * 70)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # List failed tests
        failed_tests = [test for test in self.test_results if not test["success"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['message']}")
        else:
            print("\n🎉 ALL TESTS PASSED!")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = Phase1AuthBillingTester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())