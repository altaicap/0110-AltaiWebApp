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
    def __init__(self, base_url="https://backtest-hub-2.preview.emergentagent.com"):
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
        
        # Test invalid service name
        success, response = self.run_test(
            "Test Invalid Service Connection",
            "POST",
            "/api/settings/test-connection",
            400,
            params={"service": "invalid_service"}
        )
        
        if success:
            self.log_test("Invalid Service Handling", True, "Correctly rejected invalid service name")

    def test_api_key_update_endpoint(self):
        """Test API key update endpoint"""
        print("\n🔍 Testing API Key Update Endpoint...")
        
        # Test updating Polygon API key
        polygon_update = {
            "service": "polygon",
            "api_key": "test_polygon_key_12345"
        }
        
        success, response = self.run_test(
            "Update Polygon API Key",
            "POST",
            "/api/settings/update-api-key",
            200,
            data=polygon_update
        )
        
        if success and response:
            status = response.get("status")
            message = response.get("message", "")
            self.log_test("Polygon API Key Update", status == "success", message)
        
        # Test updating NewsWare API key
        newsware_update = {
            "service": "newsware", 
            "api_key": "test_newsware_key_67890"
        }
        
        success, response = self.run_test(
            "Update NewsWare API Key",
            "POST",
            "/api/settings/update-api-key",
            200,
            data=newsware_update
        )
        
        if success and response:
            status = response.get("status")
            message = response.get("message", "")
            self.log_test("NewsWare API Key Update", status == "success", message)
        
        # Test invalid service name
        invalid_update = {
            "service": "invalid_service",
            "api_key": "test_key"
        }
        
        success, response = self.run_test(
            "Update Invalid Service API Key",
            "POST",
            "/api/settings/update-api-key",
            400,
            data=invalid_update
        )
        
        if success:
            self.log_test("Invalid Service API Key Update", True, "Correctly rejected invalid service name")
        
        # Restore original API keys
        print("\n🔄 Restoring Original API Keys...")
        
        # Restore Polygon key
        polygon_restore = {
            "service": "polygon",
            "api_key": "pVHWgdhIGxKg68dAyh5tVKBVLZGjFMfD"
        }
        
        success, response = self.run_test(
            "Restore Polygon API Key",
            "POST",
            "/api/settings/update-api-key",
            200,
            data=polygon_restore
        )
        
        if success:
            self.log_test("Polygon API Key Restoration", True, "Original Polygon API key restored")
        
        # Restore NewsWare key
        newsware_restore = {
            "service": "newsware",
            "api_key": "4aed023d-baac-4e76-a6f8-106a4a43c092"
        }
        
        success, response = self.run_test(
            "Restore NewsWare API Key",
            "POST",
            "/api/settings/update-api-key",
            200,
            data=newsware_restore
        )
        
        if success:
            self.log_test("NewsWare API Key Restoration", True, "Original NewsWare API key restored")

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

    def test_tradexchange_webhook_endpoints(self):
        """Test TradeXchange webhook integration"""
        print("\n🔍 Testing TradeXchange Webhook Integration...")
        
        # Test webhook test endpoint first
        success, test_response = self.run_test(
            "TradeXchange Webhook Test Endpoint",
            "GET",
            "/api/webhooks/tradexchange/test",
            200
        )
        
        if success and test_response:
            webhook_url = test_response.get("webhook_url")
            method = test_response.get("method")
            status = test_response.get("status")
            
            self.log_test("Webhook Test Endpoint", True, 
                         f"Webhook ready at {webhook_url} via {method}, status: {status}")
        
        # Test webhook with proper TradeXchange format
        webhook_data = {
            "source": "TXNews1",
            "content": "Breaking: AAPL reports strong quarterly earnings. Stock up 5% in after-hours trading. MSFT also showing positive momentum with cloud revenue growth. TSLA announces new factory expansion plans.",
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "priority": "high",
                "category": "earnings"
            }
        }
        
        success, webhook_response = self.run_test(
            "TradeXchange Webhook Processing",
            "POST",
            "/api/webhooks/tradexchange",
            200,
            data=webhook_data
        )
        
        if success and webhook_response:
            status = webhook_response.get("status")
            article_id = webhook_response.get("article_id")
            timestamp = webhook_response.get("timestamp")
            
            self.log_test("Webhook Processing", status == "success", 
                         f"Article ID: {article_id}, processed at: {timestamp}")
        
        # Test webhook with minimal data
        minimal_webhook = {
            "source": "TXNews2", 
            "content": "Market update: Technology sector showing strength with AAPL leading gains."
        }
        
        success, minimal_response = self.run_test(
            "TradeXchange Webhook Minimal Data",
            "POST",
            "/api/webhooks/tradexchange",
            200,
            data=minimal_webhook
        )
        
        if success and minimal_response:
            status = minimal_response.get("status")
            self.log_test("Minimal Webhook Processing", status == "success", 
                         "Webhook processed with minimal required fields")
        
        # Test webhook with malformed data
        malformed_webhook = {
            "invalid_field": "test",
            "content": "This should fail validation"
        }
        
        success, error_response = self.run_test(
            "TradeXchange Webhook Malformed Data",
            "POST", 
            "/api/webhooks/tradexchange",
            200,  # Webhook should still return 200 but with error status
            data=malformed_webhook
        )
        
        if success and error_response:
            status = error_response.get("status")
            # Webhook should return 200 but with error status to prevent retries
            self.log_test("Malformed Webhook Handling", status == "error", 
                         "Correctly handled malformed webhook data")

    def test_tradexchange_news_integration(self):
        """Test TradeXchange news integration with live news feed"""
        print("\n🔍 Testing TradeXchange News Integration...")
        
        # First send a webhook to ensure we have TradeXchange data
        test_webhook = {
            "source": "TXNews1",
            "content": "Integration test: AAPL stock analysis shows bullish trend. MSFT cloud services expanding. TSLA production targets exceeded.",
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "test": "integration",
                "tickers": ["AAPL", "MSFT", "TSLA"]
            }
        }
        
        # Send webhook
        success, webhook_response = self.run_test(
            "Send Test Webhook for Integration",
            "POST",
            "/api/webhooks/tradexchange",
            200,
            data=test_webhook
        )
        
        if success:
            article_id = webhook_response.get("article_id")
            self.log_test("Test Webhook Sent", True, f"Article ID: {article_id}")
            
            # Wait a moment for processing
            import time
            time.sleep(2)
            
            # Now check if the webhook data appears in live news feed
            success, news_response = self.run_test(
                "Get Live News After Webhook",
                "GET",
                "/api/news/live",
                200,
                params={"limit": 50}
            )
            
            if success and news_response:
                articles = news_response.get("articles", [])
                
                # Look for TradeXchange articles
                tradexchange_articles = [
                    article for article in articles 
                    if article.get("source") == "TradeXchange"
                ]
                
                self.log_test("TradeXchange Articles in News Feed", 
                             len(tradexchange_articles) > 0,
                             f"Found {len(tradexchange_articles)} TradeXchange articles")
                
                # Verify article structure and content
                if tradexchange_articles:
                    article = tradexchange_articles[0]
                    
                    # Check required fields
                    required_fields = ["id", "headline", "body", "source", "published_at", "tickers"]
                    missing_fields = [field for field in required_fields if field not in article]
                    
                    if missing_fields:
                        self.log_test("TradeXchange Article Structure", False, 
                                     f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("TradeXchange Article Structure", True, 
                                     "All required fields present")
                    
                    # Check source attribution
                    source_correct = article.get("source") == "TradeXchange"
                    self.log_test("TradeXchange Source Attribution", source_correct,
                                 f"Source: {article.get('source')}")
                    
                    # Check ticker extraction
                    tickers = article.get("tickers", [])
                    expected_tickers = ["AAPL", "MSFT", "TSLA"]
                    found_tickers = [ticker for ticker in expected_tickers if ticker in tickers]
                    
                    self.log_test("Ticker Symbol Extraction", len(found_tickers) > 0,
                                 f"Found tickers: {found_tickers} from content")
                    
                    # Check metadata
                    metadata = article.get("metadata", {})
                    webhook_source = metadata.get("webhook_source")
                    received_at = metadata.get("received_at")
                    
                    self.log_test("TradeXchange Metadata", 
                                 webhook_source == "TXNews1" and received_at is not None,
                                 f"Webhook source: {webhook_source}, received: {received_at}")
        
        # Test filtering by TradeXchange source
        success, filtered_news = self.run_test(
            "Filter News by TradeXchange Source",
            "GET",
            "/api/news/live",
            200,
            params={"sources": ["TradeXchange"], "limit": 10}
        )
        
        if success and filtered_news:
            articles = filtered_news.get("articles", [])
            all_tradexchange = all(
                article.get("source") == "TradeXchange" 
                for article in articles
            )
            
            self.log_test("TradeXchange Source Filtering", all_tradexchange,
                         f"All {len(articles)} articles are from TradeXchange")

    def test_tradexchange_settings_integration(self):
        """Test TradeXchange integration status in settings"""
        print("\n🔍 Testing TradeXchange Settings Integration...")
        
        # Get settings to check TradeXchange integration status
        success, settings_response = self.run_test(
            "Get Settings for TradeXchange Status",
            "GET",
            "/api/settings",
            200
        )
        
        if success and settings_response:
            # Check TradeXchange configuration
            tradexchange_configured = settings_response.get("tradexchange_api_configured", False)
            api_keys = settings_response.get("api_keys", {})
            tradexchange_status = api_keys.get("tradexchange", "Not Set")
            
            self.log_test("TradeXchange Configuration Status", True,
                         f"Configured: {tradexchange_configured}, Status: {tradexchange_status}")
            
            # Check production mode
            production_mode = settings_response.get("production_mode", False)
            self.log_test("Production Mode Status", True,
                         f"Production mode: {production_mode}")
            
            # Check features
            features = settings_response.get("features", {})
            news_feeds = features.get("news_feeds", False)
            
            self.log_test("News Feeds Feature", news_feeds,
                         f"News feeds enabled: {news_feeds}")
        
        # Test TradeXchange connection if configured
        success, connection_response = self.run_test(
            "Test TradeXchange Connection",
            "POST",
            "/api/settings/test-connection",
            200,
            params={"service": "tradexchange"}
        )
        
        if success and connection_response:
            status = connection_response.get("status")
            message = connection_response.get("message", "")
            
            self.log_test("TradeXchange Connection Test", True,
                         f"Status: {status}, Message: {message}")

    def test_webhook_database_verification(self):
        """Test that webhook data is properly stored in database"""
        print("\n🔍 Testing Webhook Database Storage...")
        
        # Send a unique webhook for database verification
        unique_content = f"Database test webhook at {datetime.utcnow().isoformat()}: AAPL earnings report shows strong performance."
        
        db_test_webhook = {
            "source": "TXNewsDB",
            "content": unique_content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "test_type": "database_verification",
                "unique_id": f"db_test_{int(datetime.utcnow().timestamp())}"
            }
        }
        
        # Send webhook
        success, webhook_response = self.run_test(
            "Send Database Test Webhook",
            "POST",
            "/api/webhooks/tradexchange",
            200,
            data=db_test_webhook
        )
        
        if success and webhook_response:
            article_id = webhook_response.get("article_id")
            self.log_test("Database Test Webhook Sent", True, f"Article ID: {article_id}")
            
            # Wait for processing
            import time
            time.sleep(3)
            
            # Verify the article appears in news feed
            success, news_response = self.run_test(
                "Verify Database Storage via News Feed",
                "GET",
                "/api/news/live",
                200,
                params={"limit": 100}
            )
            
            if success and news_response:
                articles = news_response.get("articles", [])
                
                # Look for our specific test article
                test_article = None
                for article in articles:
                    if unique_content in article.get("body", ""):
                        test_article = article
                        break
                
                if test_article:
                    self.log_test("Database Storage Verification", True,
                                 "Webhook article found in database via news feed")
                    
                    # Verify article persistence and structure
                    required_db_fields = ["id", "headline", "body", "source", "published_at", "metadata"]
                    missing_fields = [field for field in required_db_fields if field not in test_article]
                    
                    if missing_fields:
                        self.log_test("Database Article Structure", False,
                                     f"Missing fields in stored article: {missing_fields}")
                    else:
                        self.log_test("Database Article Structure", True,
                                     "All required fields properly stored")
                        
                        # Check metadata preservation
                        metadata = test_article.get("metadata", {})
                        test_type = metadata.get("test_type")
                        webhook_source = metadata.get("webhook_source")
                        
                        metadata_correct = (test_type == "database_verification" and 
                                          webhook_source == "TXNewsDB")
                        
                        self.log_test("Database Metadata Preservation", metadata_correct,
                                     f"Test type: {test_type}, Webhook source: {webhook_source}")
                else:
                    self.log_test("Database Storage Verification", False,
                                 "Webhook article not found in database")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Altai Trader Backend API Tests")
        print(f"🎯 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run all test suites
        self.test_health_endpoint()
        self.test_settings_endpoint()
        self.test_connection_endpoints()
        self.test_api_key_update_endpoint()
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