#!/usr/bin/env python3
"""
Altai Trader Backend API Test Suite
Tests all backend endpoints for the trading platform
"""

import requests
import sys
import json
from datetime import datetime, timedelta
from typing import Dict, Any

class AltaiTraderAPITester:
    def __init__(self, base_url="https://trade-station.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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
                 data: Dict = None, params: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
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

    def test_health_endpoint(self):
        """Test health check endpoint"""
        print("\n🔍 Testing Health Endpoint...")
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/api/health",
            200
        )
        
        if success and response:
            # Verify response structure
            required_fields = ["status", "database", "timestamp", "version"]
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Health Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Health Response Structure", True, "All required fields present")
                
                # Check database status
                db_healthy = response.get("database") == "healthy"
                self.log_test("Database Connection", db_healthy, f"Database status: {response.get('database')}")

    def test_settings_endpoint(self):
        """Test settings endpoint"""
        print("\n🔍 Testing Settings Endpoint...")
        success, response = self.run_test(
            "Get Settings",
            "GET",
            "/api/settings",
            200
        )
        
        if success and response:
            # Verify API key configurations
            polygon_configured = response.get("polygon_api_configured", False)
            newsware_configured = response.get("newsware_api_configured", False)
            db_connected = response.get("database_connected", False)
            
            self.log_test("Polygon API Configuration", polygon_configured, 
                         f"Polygon API: {'Configured' if polygon_configured else 'Not Configured'}")
            self.log_test("NewsWare API Configuration", newsware_configured,
                         f"NewsWare API: {'Configured' if newsware_configured else 'Not Configured'}")
            self.log_test("Database Connection Status", db_connected,
                         f"Database: {'Connected' if db_connected else 'Disconnected'}")

    def test_connection_endpoints(self):
        """Test API connection test endpoints"""
        print("\n🔍 Testing Connection Test Endpoints...")
        
        # Test Polygon connection
        success, response = self.run_test(
            "Test Polygon Connection",
            "POST",
            "/api/settings/test-connection",
            200,
            params={"service": "polygon"}
        )
        
        if success and response:
            status = response.get("status")
            message = response.get("message", "")
            self.log_test("Polygon Connection Test Result", status == "success", message)
        
        # Test NewsWare connection
        success, response = self.run_test(
            "Test NewsWare Connection",
            "POST",
            "/api/settings/test-connection",
            200,
            params={"service": "newsware"}
        )
        
        if success and response:
            status = response.get("status")
            message = response.get("message", "")
            self.log_test("NewsWare Connection Test Result", status == "success", message)

    def test_strategies_endpoints(self):
        """Test strategies CRUD endpoints"""
        print("\n🔍 Testing Strategies Endpoints...")
        
        # Get existing strategies
        success, strategies = self.run_test(
            "Get Strategies",
            "GET",
            "/api/strategies",
            200
        )
        
        if success:
            self.log_test("Strategies List", True, f"Found {len(strategies)} strategies")
            
            # Create a test strategy
            test_strategy = {
                "name": f"Test Strategy {datetime.now().strftime('%H%M%S')}",
                "description": "Automated test strategy",
                "code": """
class TestStrategy:
    def __init__(self, config):
        self.config = config
        
    def generate_signals(self, df):
        df['signal'] = 0
        return df
""",
                "parameters": {"test_param": 42}
            }
            
            success, created_strategy = self.run_test(
                "Create Strategy",
                "POST",
                "/api/strategies",
                200,
                data=test_strategy
            )
            
            if success and created_strategy:
                strategy_id = created_strategy.get("id")
                self.log_test("Strategy Creation", True, f"Created strategy with ID: {strategy_id}")
                
                # Test getting the specific strategy
                if strategy_id:
                    success, retrieved = self.run_test(
                        "Get Specific Strategy",
                        "GET",
                        f"/api/strategies/{strategy_id}",
                        200
                    )
                    
                    if success:
                        self.log_test("Strategy Retrieval", True, f"Retrieved strategy: {retrieved.get('name')}")
                        
                        # Test updating the strategy
                        updated_strategy = test_strategy.copy()
                        updated_strategy["description"] = "Updated test strategy"
                        
                        success, updated = self.run_test(
                            "Update Strategy",
                            "PUT",
                            f"/api/strategies/{strategy_id}",
                            200,
                            data=updated_strategy
                        )
                        
                        if success:
                            self.log_test("Strategy Update", True, "Strategy updated successfully")
                        
                        # Test deleting the strategy
                        success, _ = self.run_test(
                            "Delete Strategy",
                            "DELETE",
                            f"/api/strategies/{strategy_id}",
                            200
                        )
                        
                        if success:
                            self.log_test("Strategy Deletion", True, "Strategy deleted successfully")

    def test_backtest_endpoints(self):
        """Test backtesting endpoints"""
        print("\n🔍 Testing Backtest Endpoints...")
        
        # Get existing backtest results
        success, results = self.run_test(
            "Get Backtest Results",
            "GET",
            "/api/backtest/results",
            200
        )
        
        if success:
            self.log_test("Backtest Results List", True, f"Found {len(results)} backtest results")
            
            # Run a test backtest
            backtest_request = {
                "strategy_name": "Test Strategy",
                "symbol": "AAPL",
                "start_date": (datetime.now() - timedelta(days=30)).isoformat(),
                "end_date": (datetime.now() - timedelta(days=1)).isoformat(),
                "timeframe": "1D",
                "parameters": {}
            }
            
            success, backtest_result = self.run_test(
                "Run Backtest",
                "POST",
                "/api/backtest",
                200,
                data=backtest_request
            )
            
            if success and backtest_result:
                required_fields = ["id", "strategy_name", "symbol", "total_return", "max_drawdown", "win_rate", "total_trades"]
                missing_fields = [field for field in required_fields if field not in backtest_result]
                
                if missing_fields:
                    self.log_test("Backtest Result Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("Backtest Result Structure", True, 
                                f"Total Return: {backtest_result.get('total_return', 0):.2f}%")

    def test_news_endpoints(self):
        """Test news endpoints"""
        print("\n🔍 Testing News Endpoints...")
        
        # Get live news
        success, news_response = self.run_test(
            "Get Live News",
            "GET",
            "/api/news/live",
            200,
            params={"limit": 10}
        )
        
        if success and news_response:
            articles = news_response.get("articles", [])
            total_count = news_response.get("total_count", 0)
            
            self.log_test("News Feed", True, f"Retrieved {len(articles)} articles (total: {total_count})")
            
            # Verify article structure
            if articles:
                article = articles[0]
                required_fields = ["id", "headline", "body", "source", "published_at"]
                missing_fields = [field for field in required_fields if field not in article]
                
                if missing_fields:
                    self.log_test("News Article Structure", False, f"Missing fields: {missing_fields}")
                else:
                    self.log_test("News Article Structure", True, f"Sample headline: {article.get('headline', '')[:50]}...")
        
        # Test news categories
        success, categories = self.run_test(
            "Get News Categories",
            "GET",
            "/api/news/categories",
            200
        )
        
        if success and categories:
            available_categories = categories.get("categories", [])
            self.log_test("News Categories", True, f"Available categories: {', '.join(available_categories)}")
        
        # Test news search
        search_request = {
            "query": "technology",
            "filters": {
                "limit": 5
            }
        }
        
        success, search_results = self.run_test(
            "Search News",
            "POST",
            "/api/news/search",
            200,
            data=search_request
        )
        
        if success and search_results:
            articles = search_results.get("articles", [])
            self.log_test("News Search", True, f"Search returned {len(articles)} articles")

    def test_market_data_endpoints(self):
        """Test market data endpoints"""
        print("\n🔍 Testing Market Data Endpoints...")
        
        # Test market data aggregates
        params = {
            "timespan": "day",
            "multiplier": 1,
            "start_date": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        }
        
        success, market_data = self.run_test(
            "Get Market Data",
            "GET",
            "/api/market/AAPL/aggregates",
            200,
            params=params
        )
        
        if success and market_data:
            results = market_data.get("results", [])
            self.log_test("Market Data Retrieval", True, f"Retrieved {len(results)} data points for AAPL")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Altai Trader Backend API Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run all test suites
        self.test_health_endpoint()
        self.test_settings_endpoint()
        self.test_connection_endpoints()
        self.test_strategies_endpoints()
        self.test_backtest_endpoints()
        self.test_news_endpoints()
        self.test_market_data_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
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
        
        return self.tests_passed == self.tests_run

def main():
    """Main test runner"""
    tester = AltaiTraderAPITester()
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())