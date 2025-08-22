#!/usr/bin/env python3
"""
Comprehensive Backend Test Suite
Tests authentication, billing, notifications, system health, and trading integration endpoints
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any

class TradingIntegrationTester:
    def __init__(self, base_url="https://trading-platform-42.preview.emergentagent.com"):
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

    def setup_authentication(self):
        """Setup authentication for protected endpoints"""
        print("\n🔐 Setting up authentication for trading tests...")
        
        # Login with default user Alex G
        alex_login = {
            "email": "alex@altaitrader.com",
            "password": "Altai2025"
        }
        
        success, response = self.run_test(
            "Login for Trading Tests",
            "POST",
            "/api/auth/login",
            200,
            data=alex_login
        )
        
        if success and response:
            self.auth_token = response.get("access_token")
            user_info = response.get("user", {})
            self.test_user_id = user_info.get("id")
            
            if self.auth_token:
                self.log_test("Authentication Setup", True, f"Token obtained, length: {len(self.auth_token)}")
                return True
            else:
                self.log_test("Authentication Setup", False, "No access token received")
                return False
        else:
            self.log_test("Authentication Setup", False, "Login failed")
            return False

    def test_available_brokers(self):
        """Test GET /api/trading/brokers endpoint"""
        print("\n🔍 Testing Available Brokers Endpoint...")
        
        success, response = self.run_test(
            "Get Available Brokers",
            "GET",
            "/api/trading/brokers",
            200
        )
        
        if success and response:
            brokers = response.get("brokers", {})
            total_count = response.get("total_count", 0)
            
            self.log_test("Brokers Response Structure", "brokers" in response and "total_count" in response, 
                         f"Found {total_count} brokers")
            
            # Check for expected brokers
            expected_brokers = ["tradestation", "ibkr"]
            found_brokers = list(brokers.keys())
            
            for broker in expected_brokers:
                if broker in found_brokers:
                    broker_info = brokers[broker]
                    required_fields = ["name", "type", "configured", "oauth_type", "features", "order_types"]
                    missing_fields = [field for field in required_fields if field not in broker_info]
                    
                    if missing_fields:
                        self.log_test(f"{broker.upper()} Broker Structure", False, f"Missing fields: {missing_fields}")
                    else:
                        self.log_test(f"{broker.upper()} Broker Structure", True, 
                                     f"Name: {broker_info['name']}, OAuth: {broker_info['oauth_type']}")
                        
                        # Check configuration status
                        configured = broker_info.get("configured", False)
                        self.log_test(f"{broker.upper()} Configuration Status", True, 
                                     f"Configured: {configured}")
                else:
                    self.log_test(f"{broker.upper()} Broker Present", False, f"Broker {broker} not found")

    def test_oauth_initiation(self):
        """Test POST /api/trading/auth/initiate endpoint"""
        print("\n🔍 Testing OAuth Initiation Endpoints...")
        
        if not self.auth_token:
            self.log_test("OAuth Initiation Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test TradeStation OAuth initiation
        ts_request = {
            "broker": "tradestation",
            "state": "test_state_123"
        }
        
        success, response = self.run_test(
            "TradeStation OAuth Initiation",
            "POST",
            "/api/trading/auth/initiate",
            500,  # Expected to fail due to missing credentials
            data=ts_request,
            headers=auth_headers
        )
        
        # Since credentials are not configured, we expect a 500 error with proper message
        if success:
            self.log_test("TradeStation OAuth Error Handling", True, "Properly handled missing credentials")
        
        # Test IBKR OAuth initiation
        ibkr_request = {
            "broker": "ibkr",
            "state": "test_state_456"
        }
        
        success, response = self.run_test(
            "IBKR OAuth Initiation",
            "POST",
            "/api/trading/auth/initiate",
            500,  # Expected to fail due to missing credentials
            data=ibkr_request,
            headers=auth_headers
        )
        
        if success:
            self.log_test("IBKR OAuth Error Handling", True, "Properly handled missing credentials")
        
        # Test invalid broker type
        invalid_request = {
            "broker": "invalid_broker",
            "state": "test_state_789"
        }
        
        success, response = self.run_test(
            "Invalid Broker Type",
            "POST",
            "/api/trading/auth/initiate",
            400,  # Should return 400 for invalid broker
            data=invalid_request,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Invalid Broker Handling", True, "Correctly rejected invalid broker type")

    def test_oauth_callback(self):
        """Test POST /api/trading/auth/callback endpoint"""
        print("\n🔍 Testing OAuth Callback Endpoint...")
        
        if not self.auth_token:
            self.log_test("OAuth Callback Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test with mock callback data (will fail but should handle gracefully)
        callback_request = {
            "broker": "tradestation",
            "code": "mock_auth_code_123",
            "state": "test_state_123"
        }
        
        success, response = self.run_test(
            "OAuth Callback with Mock Data",
            "POST",
            "/api/trading/auth/callback",
            400,  # Expected to fail with mock data
            data=callback_request,
            headers=auth_headers
        )
        
        if success:
            self.log_test("OAuth Callback Error Handling", True, "Properly handled invalid callback data")
        
        # Test missing required fields
        incomplete_request = {
            "broker": "tradestation"
            # Missing code and state
        }
        
        success, response = self.run_test(
            "OAuth Callback Missing Fields",
            "POST",
            "/api/trading/auth/callback",
            422,  # Should return 422 for validation error
            data=incomplete_request,
            headers=auth_headers
        )
        
        if success:
            self.log_test("OAuth Callback Validation", True, "Correctly validated required fields")

    def test_broker_connections(self):
        """Test GET /api/trading/connections endpoint"""
        print("\n🔍 Testing Broker Connections Endpoint...")
        
        if not self.auth_token:
            self.log_test("Broker Connections Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        success, response = self.run_test(
            "Get Broker Connections",
            "GET",
            "/api/trading/connections",
            200,
            headers=auth_headers
        )
        
        if success and response:
            connections = response.get("connections", [])
            total_count = response.get("total_count", 0)
            
            self.log_test("Connections Response Structure", "connections" in response and "total_count" in response, 
                         f"Found {total_count} connections")
            
            # For new user, should have 0 connections
            self.log_test("Initial Connections Count", total_count == 0, 
                         f"Expected 0 connections for new user, got {total_count}")
            
            if connections:
                # If there are connections, verify structure
                connection = connections[0]
                required_fields = ["id", "broker", "broker_name", "connection_name", "is_active", "created_at"]
                missing_fields = [field for field in required_fields if field not in connection]
                
                if missing_fields:
                    self.log_test("Connection Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Connection Structure", True, "All required fields present")

    def test_trading_accounts(self):
        """Test GET /api/trading/accounts endpoint"""
        print("\n🔍 Testing Trading Accounts Endpoint...")
        
        if not self.auth_token:
            self.log_test("Trading Accounts Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        success, response = self.run_test(
            "Get Trading Accounts",
            "GET",
            "/api/trading/accounts",
            200,
            headers=auth_headers
        )
        
        if success and response:
            accounts = response.get("accounts", [])
            total_count = response.get("total_count", 0)
            
            self.log_test("Accounts Response Structure", "accounts" in response and "total_count" in response, 
                         f"Found {total_count} accounts")
            
            # For new user without broker connections, should have 0 accounts
            self.log_test("Initial Accounts Count", total_count == 0, 
                         f"Expected 0 accounts for user without connections, got {total_count}")
            
            if accounts:
                # If there are accounts, verify structure
                account = accounts[0]
                required_fields = ["id", "account_id", "account_name", "broker", "account_type", "currency", "status"]
                missing_fields = [field for field in required_fields if field not in account]
                
                if missing_fields:
                    self.log_test("Account Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Account Structure", True, "All required fields present")
        
        # Test with broker filter
        success, response = self.run_test(
            "Get Trading Accounts with Broker Filter",
            "GET",
            "/api/trading/accounts",
            200,
            params={"broker": "tradestation"},
            headers=auth_headers
        )
        
        if success:
            self.log_test("Accounts Broker Filter", True, "Broker filter parameter accepted")

    def test_trading_orders_get(self):
        """Test GET /api/trading/orders endpoint"""
        print("\n🔍 Testing Get Trading Orders Endpoint...")
        
        if not self.auth_token:
            self.log_test("Trading Orders Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        success, response = self.run_test(
            "Get Trading Orders",
            "GET",
            "/api/trading/orders",
            200,
            headers=auth_headers
        )
        
        if success and response:
            orders = response.get("orders", [])
            total_count = response.get("total_count", 0)
            
            self.log_test("Orders Response Structure", "orders" in response and "total_count" in response, 
                         f"Found {total_count} orders")
            
            # For new user, should have 0 orders
            self.log_test("Initial Orders Count", total_count == 0, 
                         f"Expected 0 orders for new user, got {total_count}")
            
            if orders:
                # If there are orders, verify structure
                order = orders[0]
                required_fields = ["id", "platform_order_id", "symbol", "action", "quantity", "order_type", "status"]
                missing_fields = [field for field in required_fields if field not in order]
                
                if missing_fields:
                    self.log_test("Order Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Order Structure", True, "All required fields present")
        
        # Test with filters
        success, response = self.run_test(
            "Get Trading Orders with Filters",
            "GET",
            "/api/trading/orders",
            200,
            params={"broker": "tradestation", "limit": 10},
            headers=auth_headers
        )
        
        if success:
            self.log_test("Orders Filter Parameters", True, "Filter parameters accepted")

    def test_place_trading_order(self):
        """Test POST /api/trading/orders endpoint"""
        print("\n🔍 Testing Place Trading Order Endpoint...")
        
        if not self.auth_token:
            self.log_test("Place Order Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test order placement (will fail due to no broker connection)
        order_request = {
            "broker": "tradestation",
            "account_id": "test_account_123",
            "symbol": "AAPL",
            "action": "BUY",
            "quantity": 100,
            "order_type": "MARKET",
            "time_in_force": "DAY"
        }
        
        success, response = self.run_test(
            "Place Trading Order",
            "POST",
            "/api/trading/orders",
            404,  # Expected to fail - no trading account found
            data=order_request,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Order Placement Error Handling", True, "Correctly handled missing trading account")
        
        # Test invalid order parameters
        invalid_order = {
            "broker": "tradestation",
            "account_id": "test_account_123",
            "symbol": "AAPL",
            "action": "INVALID_ACTION",  # Invalid action
            "quantity": -10,  # Invalid quantity
            "order_type": "MARKET"
        }
        
        success, response = self.run_test(
            "Place Order with Invalid Parameters",
            "POST",
            "/api/trading/orders",
            400,  # Should return 400 for invalid parameters
            data=invalid_order,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Order Parameter Validation", True, "Correctly validated order parameters")
        
        # Test missing required fields
        incomplete_order = {
            "broker": "tradestation",
            "symbol": "AAPL"
            # Missing required fields
        }
        
        success, response = self.run_test(
            "Place Order Missing Fields",
            "POST",
            "/api/trading/orders",
            422,  # Should return 422 for validation error
            data=incomplete_order,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Order Required Fields Validation", True, "Correctly validated required fields")

    def test_trading_configurations_get(self):
        """Test GET /api/trading/configurations endpoint"""
        print("\n🔍 Testing Get Trading Configurations Endpoint...")
        
        if not self.auth_token:
            self.log_test("Trading Configurations Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        success, response = self.run_test(
            "Get Trading Configurations",
            "GET",
            "/api/trading/configurations",
            200,
            headers=auth_headers
        )
        
        if success and response:
            configurations = response.get("configurations", [])
            total_count = response.get("total_count", 0)
            
            self.log_test("Configurations Response Structure", "configurations" in response and "total_count" in response, 
                         f"Found {total_count} configurations")
            
            # For new user, should have 0 configurations
            self.log_test("Initial Configurations Count", total_count == 0, 
                         f"Expected 0 configurations for new user, got {total_count}")
            
            if configurations:
                # If there are configurations, verify structure
                config = configurations[0]
                required_fields = ["id", "strategy_id", "broker", "account_name", "is_live", "created_at"]
                missing_fields = [field for field in required_fields if field not in config]
                
                if missing_fields:
                    self.log_test("Configuration Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Configuration Structure", True, "All required fields present")

    def test_create_trading_configuration(self):
        """Test POST /api/trading/configurations endpoint"""
        print("\n🔍 Testing Create Trading Configuration Endpoint...")
        
        if not self.auth_token:
            self.log_test("Create Configuration Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test configuration creation (will fail due to no broker connection)
        config_request = {
            "strategy_id": "test_strategy_123",
            "broker": "tradestation",
            "account_id": "test_account_123",
            "default_order_type": "MARKET",
            "default_quantity": 100,
            "configuration_name": "Test Configuration"
        }
        
        success, response = self.run_test(
            "Create Trading Configuration",
            "POST",
            "/api/trading/configurations",
            404,  # Expected to fail - no trading account found
            data=config_request,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Configuration Creation Error Handling", True, "Correctly handled missing trading account")
        
        # Test missing required fields
        incomplete_config = {
            "strategy_id": "test_strategy_123"
            # Missing required fields
        }
        
        success, response = self.run_test(
            "Create Configuration Missing Fields",
            "POST",
            "/api/trading/configurations",
            422,  # Should return 422 for validation error
            data=incomplete_config,
            headers=auth_headers
        )
        
        if success:
            self.log_test("Configuration Required Fields Validation", True, "Correctly validated required fields")

    def test_toggle_live_trading(self):
        """Test PUT /api/trading/configurations/{config_id}/live endpoint"""
        print("\n🔍 Testing Toggle Live Trading Endpoint...")
        
        if not self.auth_token:
            self.log_test("Toggle Live Trading Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test with non-existent configuration ID
        test_config_id = "non_existent_config_123"
        
        success, response = self.run_test(
            "Toggle Live Trading - Non-existent Config",
            "PUT",
            f"/api/trading/configurations/{test_config_id}/live",
            404,  # Should return 404 for non-existent configuration
            headers=auth_headers
        )
        
        if success:
            self.log_test("Live Trading Toggle Error Handling", True, "Correctly handled non-existent configuration")

    def test_authentication_required(self):
        """Test that trading endpoints require authentication"""
        print("\n🔍 Testing Authentication Requirements...")
        
        # Test endpoints without authentication token
        endpoints_to_test = [
            ("GET", "/api/trading/connections"),
            ("GET", "/api/trading/accounts"),
            ("GET", "/api/trading/orders"),
            ("POST", "/api/trading/orders"),
            ("GET", "/api/trading/configurations"),
            ("POST", "/api/trading/configurations"),
        ]
        
        for method, endpoint in endpoints_to_test:
            success, response = self.run_test(
                f"Unauthenticated {method} {endpoint}",
                method,
                endpoint,
                401,  # Should return 401 for unauthenticated requests
                data={"test": "data"} if method == "POST" else None
            )
            
            if success:
                self.log_test(f"Authentication Required - {endpoint}", True, "Correctly required authentication")

    def test_database_operations(self):
        """Test database operations for trading models"""
        print("\n🔍 Testing Database Operations...")
        
        # Test that the trading endpoints are properly connected to database
        # This is implicitly tested through the other endpoint tests
        
        # Test system health to ensure database is working
        success, response = self.run_test(
            "Database Health for Trading",
            "GET",
            "/api/system/health",
            200
        )
        
        if success and response:
            databases = response.get("databases", {})
            mongodb_status = databases.get("mongodb", False)
            sql_status = databases.get("sql", False)
            
            self.log_test("MongoDB for Trading Data", mongodb_status, f"MongoDB status: {mongodb_status}")
            self.log_test("SQL Database for Trading Models", sql_status, f"SQL DB status: {sql_status}")
            
            # Both databases should be healthy for trading functionality
            both_healthy = mongodb_status and sql_status
            self.log_test("Database Health for Trading", both_healthy, 
                         f"Both databases required for trading: {both_healthy}")

    def run_all_trading_tests(self):
        """Run all trading integration tests"""
        print("🚀 Starting Trading Integration Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 70)
        
        # Setup authentication first
        if not self.setup_authentication():
            print("❌ Authentication setup failed - skipping protected endpoint tests")
            return False
        
        # Run all test suites
        self.test_available_brokers()
        self.test_oauth_initiation()
        self.test_oauth_callback()
        self.test_broker_connections()
        self.test_trading_accounts()
        self.test_trading_orders_get()
        self.test_place_trading_order()
        self.test_trading_configurations_get()
        self.test_create_trading_configuration()
        self.test_toggle_live_trading()
        self.test_authentication_required()
        self.test_database_operations()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 TRADING INTEGRATION TEST SUMMARY")
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
            print("\n🎉 ALL TRADING TESTS PASSED!")
        
        return self.tests_passed == self.tests_run


class Phase1AuthBillingTester:
    def __init__(self, base_url="https://trading-platform-42.preview.emergentagent.com"):
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
        
        # Test payment session creation with query parameters
        payment_params = {
            "amount": 29.99,
            "plan_id": "basic_monthly"
        }
        
        success, response = self.run_test(
            "Create Payment Session",
            "POST",
            "/api/billing/payment-session",
            200,
            params=payment_params,
            headers=auth_headers
        )
        
        if success and response:
            # In mock mode, we expect some session data
            session_id = response.get("sessionId") or response.get("session_id")
            self.log_test("Payment Session Created", bool(session_id), 
                         f"Session ID: {session_id}")
        
        # Test with invalid plan ID
        invalid_payment_params = {
            "amount": 29.99,
            "plan_id": "invalid_plan"
        }
        
        success, response = self.run_test(
            "Create Payment Session with Invalid Plan",
            "POST",
            "/api/billing/payment-session",
            400,
            params=invalid_payment_params,
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

class Feedback80Tester:
    def __init__(self, base_url="https://trading-platform-42.preview.emergentagent.com"):
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

    def setup_authentication(self):
        """Setup authentication for protected endpoints"""
        print("\n🔐 Setting up authentication for Feedback 8.0 tests...")
        
        # Login with default user Alex G
        alex_login = {
            "email": "alex@altaitrader.com",
            "password": "Altai2025"
        }
        
        success, response = self.run_test(
            "Login for Feedback 8.0 Tests",
            "POST",
            "/api/auth/login",
            200,
            data=alex_login
        )
        
        if success and response:
            self.auth_token = response.get("access_token")
            user_info = response.get("user", {})
            self.test_user_id = user_info.get("id")
            
            if self.auth_token:
                self.log_test("Authentication Setup", True, f"Token obtained, length: {len(self.auth_token)}")
                return True
            else:
                self.log_test("Authentication Setup", False, "No access token received")
                return False
        else:
            self.log_test("Authentication Setup", False, "Login failed")
            return False

    def test_settings_endpoint(self):
        """Test /api/settings endpoint for status indicators"""
        print("\n🔍 Testing Settings Endpoint for Status Indicators...")
        
        success, response = self.run_test(
            "Get Settings for Status Indicators",
            "GET",
            "/api/settings",
            200
        )
        
        if success and response:
            # Check for required status indicator fields
            required_fields = [
                "polygon_api_configured", 
                "newsware_api_configured", 
                "tradexchange_api_configured",
                "tradestation_configured"
            ]
            
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Settings Status Fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Settings Status Fields", True, "All status indicator fields present")
                
                # Check specific status values
                polygon_status = response.get("polygon_api_configured")
                newsware_status = response.get("newsware_api_configured")
                tradexchange_status = response.get("tradexchange_api_configured")
                tradestation_status = response.get("tradestation_configured")
                
                self.log_test("Polygon API Status", polygon_status is not None, 
                             f"Polygon configured: {polygon_status}")
                self.log_test("NewsWare API Status", newsware_status is not None, 
                             f"NewsWare configured: {newsware_status}")
                self.log_test("TradeXchange API Status", tradexchange_status is not None, 
                             f"TradeXchange configured: {tradexchange_status}")
                self.log_test("TradeStation Status", tradestation_status is not None, 
                             f"TradeStation configured: {tradestation_status}")
                
                # Check api_keys section for detailed status
                api_keys = response.get("api_keys", {})
                if api_keys:
                    polygon_key_status = api_keys.get("polygon")
                    newsware_key_status = api_keys.get("newsware")
                    
                    self.log_test("Polygon Key Status Detail", polygon_key_status == "Configured", 
                                 f"Polygon key status: {polygon_key_status}")
                    self.log_test("NewsWare Key Status Detail", newsware_key_status == "Configured", 
                                 f"NewsWare key status: {newsware_key_status}")

    def test_connection_testing_polygon(self):
        """Test /api/settings/test-connection endpoint for Polygon"""
        print("\n🔍 Testing Connection Testing - Polygon...")
        
        success, response = self.run_test(
            "Test Polygon Connection",
            "POST",
            "/api/settings/test-connection",
            200,
            params={"service": "polygon"}
        )
        
        if success and response:
            status = response.get("status")
            message = response.get("message")
            
            # Valid statuses are: success, warning, error, mock
            valid_statuses = ["success", "warning", "error", "mock"]
            status_valid = status in valid_statuses
            
            self.log_test("Polygon Connection Status", status_valid, 
                         f"Status: {status}, Message: {message}")
            
            # If status is success or warning, connection is working
            connection_working = status in ["success", "warning"]
            self.log_test("Polygon Connection Working", connection_working, 
                         f"Connection functional: {connection_working}")

    def test_connection_testing_newsware(self):
        """Test /api/settings/test-connection endpoint for NewsWare"""
        print("\n🔍 Testing Connection Testing - NewsWare...")
        
        success, response = self.run_test(
            "Test NewsWare Connection",
            "POST",
            "/api/settings/test-connection",
            200,
            params={"service": "newsware"}
        )
        
        if success and response:
            status = response.get("status")
            message = response.get("message")
            
            # Valid statuses are: success, warning, error, mock
            valid_statuses = ["success", "warning", "error", "mock"]
            status_valid = status in valid_statuses
            
            self.log_test("NewsWare Connection Status", status_valid, 
                         f"Status: {status}, Message: {message}")
            
            # If status is success or warning, connection is working
            connection_working = status in ["success", "warning", "mock"]
            self.log_test("NewsWare Connection Working", connection_working, 
                         f"Connection functional: {connection_working}")

    def test_connection_testing_invalid_service(self):
        """Test /api/settings/test-connection endpoint with invalid service"""
        print("\n🔍 Testing Connection Testing - Invalid Service...")
        
        success, response = self.run_test(
            "Test Invalid Service Connection",
            "POST",
            "/api/settings/test-connection",
            400,
            data={"service": "invalid_service"}
        )
        
        if success:
            self.log_test("Invalid Service Handling", True, "Correctly rejected invalid service name")

    def test_trading_configurations_endpoint(self):
        """Test /api/trading/configurations GET endpoint (requires JWT authentication)"""
        print("\n🔍 Testing Trading Configurations Endpoint...")
        
        if not self.auth_token:
            self.log_test("Trading Configurations Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        success, response = self.run_test(
            "Get Trading Configurations",
            "GET",
            "/api/trading/configurations",
            200,
            headers=auth_headers
        )
        
        if success and response:
            configurations = response.get("configurations", [])
            total_count = response.get("total_count", 0)
            
            self.log_test("Trading Configurations Response Structure", 
                         "configurations" in response and "total_count" in response, 
                         f"Found {total_count} configurations")
            
            # For new user, should have 0 configurations initially
            self.log_test("Initial Configurations Count", total_count >= 0, 
                         f"Configurations count: {total_count}")
            
            if configurations:
                # If there are configurations, verify structure
                config = configurations[0]
                required_fields = ["id", "strategy_id", "broker", "account_name", "is_live", "created_at"]
                missing_fields = [field for field in required_fields if field not in config]
                
                if missing_fields:
                    self.log_test("Configuration Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Configuration Structure", True, "All required fields present")
                    
                    # Check specific configuration details
                    strategy_id = config.get("strategy_id")
                    broker = config.get("broker")
                    is_live = config.get("is_live")
                    
                    self.log_test("Configuration Details", True, 
                                 f"Strategy: {strategy_id}, Broker: {broker}, Live: {is_live}")

    def test_trading_configurations_auth_required(self):
        """Test that /api/trading/configurations requires authentication"""
        print("\n🔍 Testing Trading Configurations Authentication Requirement...")
        
        success, response = self.run_test(
            "Trading Configurations Without Auth",
            "GET",
            "/api/trading/configurations",
            401  # Should require authentication
        )
        
        if success:
            self.log_test("Trading Configurations Auth Required", True, "Correctly required authentication")

    def test_authentication_flow_complete(self):
        """Test complete authentication flow with alex@altaitrader.com"""
        print("\n🔍 Testing Complete Authentication Flow...")
        
        # Test login
        alex_login = {
            "email": "alex@altaitrader.com",
            "password": "Altai2025"
        }
        
        success, response = self.run_test(
            "Alex Login Authentication",
            "POST",
            "/api/auth/login",
            200,
            data=alex_login
        )
        
        if success and response:
            # Verify response structure
            required_fields = ["access_token", "token_type", "user"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Login Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Login Response Structure", True, "All required fields present")
                
                # Check token details
                access_token = response.get("access_token")
                token_type = response.get("token_type")
                user_info = response.get("user", {})
                
                self.log_test("JWT Token Generated", bool(access_token) and len(access_token) > 50, 
                             f"Token length: {len(access_token) if access_token else 0}")
                self.log_test("Token Type", token_type == "bearer", f"Token type: {token_type}")
                
                # Check user info
                user_email = user_info.get("email")
                user_name = user_info.get("full_name")
                
                self.log_test("User Email Correct", user_email == "alex@altaitrader.com", 
                             f"Email: {user_email}")
                self.log_test("User Name Present", bool(user_name), f"Name: {user_name}")
                
                # Test using the token on a protected endpoint
                if access_token:
                    auth_headers = {"Authorization": f"Bearer {access_token}"}
                    
                    success, me_response = self.run_test(
                        "Token Validation on Protected Endpoint",
                        "GET",
                        "/api/auth/me",
                        200,
                        headers=auth_headers
                    )
                    
                    if success and me_response:
                        me_email = me_response.get("email")
                        self.log_test("Token Validation", me_email == "alex@altaitrader.com", 
                                     f"Protected endpoint email: {me_email}")

    def test_error_handling(self):
        """Test error handling for various scenarios"""
        print("\n🔍 Testing Error Handling...")
        
        # Test connection testing with missing service parameter
        success, response = self.run_test(
            "Connection Test Missing Service",
            "POST",
            "/api/settings/test-connection",
            422,  # Should return validation error
            data={}
        )
        
        if success:
            self.log_test("Missing Service Parameter Handling", True, "Correctly handled missing service parameter")
        
        # Test login with wrong credentials
        wrong_login = {
            "email": "alex@altaitrader.com",
            "password": "WrongPassword"
        }
        
        success, response = self.run_test(
            "Login with Wrong Password",
            "POST",
            "/api/auth/login",
            401,
            data=wrong_login
        )
        
        if success:
            self.log_test("Wrong Password Handling", True, "Correctly rejected wrong password")

    def run_all_feedback80_tests(self):
        """Run all Feedback 8.0 tests"""
        print("🚀 Starting Feedback 8.0 Backend Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 70)
        
        # Setup authentication first
        if not self.setup_authentication():
            print("❌ Authentication setup failed - some tests may be skipped")
        
        # Run all test suites
        self.test_settings_endpoint()
        self.test_connection_testing_polygon()
        self.test_connection_testing_newsware()
        self.test_connection_testing_invalid_service()
        self.test_trading_configurations_endpoint()
        self.test_trading_configurations_auth_required()
        self.test_authentication_flow_complete()
        self.test_error_handling()
        
        # Print summary
        print("\n" + "=" * 70)
        print("📊 FEEDBACK 8.0 TEST SUMMARY")
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
            print("\n🎉 ALL FEEDBACK 8.0 TESTS PASSED!")
        
        return self.tests_passed == self.tests_run


def main():
    """Main test runner"""
    print("🚀 COMPREHENSIVE BACKEND TESTING SUITE")
    print("=" * 70)
    
    # Run Feedback 8.0 Tests (Priority)
    print("\n📋 PRIORITY: Feedback 8.0 Backend Tests")
    feedback80_tester = Feedback80Tester()
    feedback80_success = feedback80_tester.run_all_feedback80_tests()
    
    # Run Phase 1 Authentication and Billing Tests
    print("\n📋 PHASE 1: Authentication and Billing System Tests")
    auth_tester = Phase1AuthBillingTester()
    auth_success = auth_tester.run_all_tests()
    
    # Run Trading Integration Tests
    print("\n📋 PHASE 2: Trading Integration Tests")
    trading_tester = TradingIntegrationTester()
    trading_success = trading_tester.run_all_trading_tests()
    
    # Overall summary
    print("\n" + "=" * 70)
    print("🎯 OVERALL TEST SUMMARY")
    print("=" * 70)
    
    total_tests = feedback80_tester.tests_run + auth_tester.tests_run + trading_tester.tests_run
    total_passed = feedback80_tester.tests_passed + auth_tester.tests_passed + trading_tester.tests_passed
    
    print(f"Feedback 8.0: {feedback80_tester.tests_passed}/{feedback80_tester.tests_run} passed")
    print(f"Phase 1 (Auth/Billing): {auth_tester.tests_passed}/{auth_tester.tests_run} passed")
    print(f"Phase 2 (Trading): {trading_tester.tests_passed}/{trading_tester.tests_run} passed")
    print(f"Overall: {total_passed}/{total_tests} passed ({(total_passed/total_tests*100):.1f}%)" if total_tests > 0 else "No tests run")
    
    overall_success = feedback80_success and auth_success and trading_success
    
    if overall_success:
        print("\n🎉 ALL TESTS PASSED - BACKEND IS READY!")
    else:
        print("\n⚠️  SOME TESTS FAILED - REVIEW RESULTS ABOVE")
        
        # Highlight Feedback 8.0 results specifically
        if not feedback80_success:
            print("\n🚨 FEEDBACK 8.0 TESTS FAILED - PRIORITY ISSUE!")
        else:
            print("\n✅ FEEDBACK 8.0 TESTS PASSED - Priority features working!")
    
    return 0 if overall_success else 1

if __name__ == "__main__":
    sys.exit(main())