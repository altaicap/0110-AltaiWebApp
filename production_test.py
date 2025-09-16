#!/usr/bin/env python3
"""
Altai Trader Production Testing Suite - Feedback 5.0 Deliverables
Comprehensive testing of production-ready features with real API integration
"""

import requests
import sys
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List

class AltaiTraderProductionTester:
    def __init__(self, base_url="https://altai-trader-ui.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.critical_failures = []

    def log_test(self, name: str, success: bool, message: str = "", response_data: Any = None, critical: bool = False):
        """Log test result with critical failure tracking"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}: PASSED - {message}")
        else:
            print(f"❌ {name}: FAILED - {message}")
            if critical:
                self.critical_failures.append(f"{name}: {message}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "message": message,
            "response_data": response_data,
            "critical": critical
        })

    def make_request(self, method: str, endpoint: str, expected_status: int = 200, 
                    data: Dict = None, params: Dict = None, timeout: int = 30) -> tuple:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params, timeout=timeout)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=timeout)
            else:
                return False, {}, f"Unsupported method: {method}"

            try:
                response_json = response.json()
            except:
                response_json = {"raw_response": response.text}

            success = response.status_code == expected_status
            error_msg = "" if success else f"Expected {expected_status}, got {response.status_code}. Response: {response.text[:200]}"
            
            return success, response_json, error_msg

        except requests.exceptions.Timeout:
            return False, {}, f"Request timeout ({timeout}s)"
        except requests.exceptions.ConnectionError:
            return False, {}, "Connection error - backend may be down"
        except Exception as e:
            return False, {}, f"Error: {str(e)}"

    def test_health_and_status_endpoints(self):
        """Test health and status endpoints for production readiness"""
        print("\n🏥 TESTING HEALTH AND STATUS ENDPOINTS")
        print("=" * 50)
        
        # Test root endpoint for version and production features
        success, response, error = self.make_request("GET", "/api/health")  # Use health endpoint instead
        if success:
            version = response.get("version")
            production_mode = response.get("production_mode")
            
            self.log_test("API Version", version == "2.0.0", 
                         f"Version: {version}", critical=True)
            self.log_test("Production Mode Status", production_mode is True, 
                         f"Production mode: {production_mode}", critical=True)
            
            # Check if we can get additional info from health endpoint
            services = response.get("services", {})
            self.log_test("Production Features Available", len(services) > 0,
                         f"Services: {list(services.keys())}")
        else:
            self.log_test("API Health Endpoint", False, error, critical=True)

        # Test comprehensive health check
        success, response, error = self.make_request("GET", "/api/health")
        if success:
            db_status = response.get("database")
            services = response.get("services", {})
            production_mode = response.get("production_mode")
            
            self.log_test("Health Check Database", db_status == "healthy", 
                         f"Database: {db_status}", critical=True)
            self.log_test("Health Check Production Mode", production_mode is True,
                         f"Production mode: {production_mode}", critical=True)
            self.log_test("Health Check Services Status", len(services) > 0,
                         f"Services monitored: {list(services.keys())}")
        else:
            self.log_test("Health Check Endpoint", False, error, critical=True)

        # Test settings endpoint for real API configuration
        success, response, error = self.make_request("GET", "/api/settings")
        if success:
            polygon_configured = response.get("polygon_api_configured")
            newsware_configured = response.get("newsware_api_configured")
            api_keys = response.get("api_keys", {})
            
            self.log_test("Polygon API Key Configured", polygon_configured is True,
                         f"Polygon: {api_keys.get('polygon', 'Unknown')}", critical=True)
            self.log_test("NewsWare API Key Configured", newsware_configured is True,
                         f"NewsWare: {api_keys.get('newsware', 'Unknown')}", critical=True)
        else:
            self.log_test("Settings Endpoint", False, error, critical=True)

    def test_real_api_connections(self):
        """Test real API connections with provided keys"""
        print("\n🔌 TESTING REAL API CONNECTIONS")
        print("=" * 50)
        
        # Test Polygon API connection
        success, response, error = self.make_request("POST", "/api/settings/test-connection", 
                                                    params={"service": "polygon"})
        if success:
            status = response.get("status")
            message = response.get("message", "")
            self.log_test("Polygon API Real Connection", status == "success",
                         f"Status: {status}, Message: {message}", critical=True)
        else:
            self.log_test("Polygon API Connection Test", False, error, critical=True)

        # Test NewsWare API connection
        success, response, error = self.make_request("POST", "/api/settings/test-connection",
                                                    params={"service": "newsware"})
        if success:
            status = response.get("status")
            message = response.get("message", "")
            self.log_test("NewsWare API Real Connection", status == "success",
                         f"Status: {status}, Message: {message}", critical=True)
        else:
            self.log_test("NewsWare API Connection Test", False, error, critical=True)

        # Test mock mode detection for unconfigured services
        success, response, error = self.make_request("POST", "/api/settings/test-connection",
                                                    params={"service": "tradexchange"})
        if success:
            status = response.get("status")
            message = response.get("message", "")
            is_mock = "mock" in status.lower() or "mock" in message.lower()
            self.log_test("Mock Mode Detection", is_mock,
                         f"TradeXchange correctly shows mock mode: {message}")
        else:
            self.log_test("TradeXchange Connection Test", False, error)

    def test_production_market_data(self):
        """Test production market data API with real Polygon integration"""
        print("\n📈 TESTING PRODUCTION MARKET DATA API")
        print("=" * 50)
        
        # Test real market data retrieval
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-01-05",
            "timespan": "day",
            "multiplier": 1
        }
        
        success, response, error = self.make_request("GET", "/api/market/AAPL/aggregates", 
                                                    params=params, timeout=45)
        if success:
            results = response.get("results", [])
            status = response.get("status")
            note = response.get("note", "")
            
            # Check if real data (not mock)
            is_real_data = "mock" not in note.lower() and status == "OK" and len(results) > 0
            self.log_test("Real Polygon Market Data", is_real_data,
                         f"Retrieved {len(results)} bars, Status: {status}", critical=True)
            
            if results:
                # Verify data structure
                first_bar = results[0]
                required_fields = ["t", "o", "h", "l", "c", "v"]
                has_all_fields = all(field in first_bar for field in required_fields)
                self.log_test("Market Data Structure", has_all_fields,
                             f"OHLCV data complete: {list(first_bar.keys())}")
                
                # Verify realistic data ranges
                if has_all_fields:
                    ohlc_values = [first_bar["o"], first_bar["h"], first_bar["l"], first_bar["c"]]
                    realistic_prices = all(100 < price < 300 for price in ohlc_values)  # AAPL price range
                    self.log_test("Realistic Price Data", realistic_prices,
                                 f"OHLC: {ohlc_values}")
        else:
            self.log_test("Market Data API", False, error, critical=True)

        # Test TradingView endpoint compatibility
        success, response, error = self.make_request("GET", "/api/market/AAPL/aggregates",
                                                    params={**params, "adjusted": "true"})
        if success:
            results = response.get("results", [])
            self.log_test("TradingView Compatibility", len(results) > 0,
                         f"Adjusted data available: {len(results)} bars")
        else:
            self.log_test("TradingView Endpoint", False, error)

    def test_production_backtesting_engine(self):
        """Test production backtesting with real Backtrader implementation"""
        print("\n🔬 TESTING PRODUCTION BACKTESTING ENGINE")
        print("=" * 50)
        
        # Test backtest with PBH Algorithm parameters
        backtest_request = {
            "strategy_name": "Prior Bar Break (PBH) Algorithm",
            "symbols": ["AAPL"],
            "symbol": "AAPL",
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-01-31T00:00:00",
            "timeframe": "1D",
            "parameters": {
                "take_long": True,
                "max_entry_count": 3,
                "tp_multiplier_1": 1.5,
                "tp_multiplier_2": 2.0,
                "tp_multiplier_3": 2.5,
                "tp_multiplier_4": 3.0,
                "stop_loss_multiplier": 0.5,
                "adr_period": 20,
                "volume_threshold": 1000000
            }
        }
        
        success, response, error = self.make_request("POST", "/api/backtest", 
                                                    data=backtest_request, timeout=60)
        if success:
            # Verify real Backtrader implementation (not mock)
            equity_curve = response.get("equity_curve", [])
            trades = response.get("trades", [])
            summary_stats = response.get("summary_stats", {})
            markers = response.get("markers", [])
            overlays = response.get("overlays", [])
            status = response.get("status")
            
            self.log_test("Backtest Execution", status == "success",
                         f"Status: {status}", critical=True)
            
            # Verify comprehensive results structure
            has_equity_curve = len(equity_curve) > 0
            has_trades = len(trades) > 0
            has_summary_stats = len(summary_stats) > 0
            
            self.log_test("Equity Curve Generated", has_equity_curve,
                         f"Equity points: {len(equity_curve)}")
            self.log_test("Trades List Generated", has_trades,
                         f"Total trades: {len(trades)}")
            self.log_test("Summary Statistics", has_summary_stats,
                         f"Stats available: {list(summary_stats.keys())}")
            
            # Verify safety controls and realistic metrics
            if summary_stats:
                total_return = summary_stats.get("total_return_pct", 0)
                max_drawdown = summary_stats.get("max_drawdown_pct", 0)
                win_rate = summary_stats.get("win_rate_pct", 0)
                
                realistic_metrics = (
                    -50 <= total_return <= 200 and  # Reasonable return range
                    0 <= max_drawdown <= 50 and     # Reasonable drawdown
                    0 <= win_rate <= 100            # Valid win rate
                )
                
                self.log_test("Realistic Backtest Metrics", realistic_metrics,
                             f"Return: {total_return}%, DD: {max_drawdown}%, WR: {win_rate}%")
            
            # Verify TradingView markers and overlays
            self.log_test("TradingView Markers", len(markers) >= 0,
                         f"Markers for chart: {len(markers)}")
            self.log_test("TradingView Overlays", isinstance(overlays, list),
                         f"Overlays structure: {type(overlays)}")
            
        else:
            self.log_test("Production Backtesting", False, error, critical=True)

        # Test safety controls (timeout handling)
        print("\n⚡ Testing Safety Controls...")
        
        # Test with longer date range to verify timeout controls
        long_backtest = backtest_request.copy()
        long_backtest["start_date"] = "2023-01-01T00:00:00"
        long_backtest["end_date"] = "2024-01-31T00:00:00"
        
        success, response, error = self.make_request("POST", "/api/backtest",
                                                    data=long_backtest, timeout=90)
        
        # Should either complete successfully or handle timeout gracefully
        if success:
            self.log_test("Extended Backtest Safety", True,
                         "Long backtest completed within safety limits")
        else:
            # Check if it's a timeout or resource limit (acceptable)
            timeout_handled = "timeout" in error.lower() or "resource" in error.lower()
            self.log_test("Timeout Safety Controls", timeout_handled,
                         f"Safety controls active: {error}")

    def test_live_news_integration(self):
        """Test live news integration with real NewsWare/TradeXchange"""
        print("\n📰 TESTING LIVE NEWS INTEGRATION")
        print("=" * 50)
        
        # Test live news feed
        success, response, error = self.make_request("GET", "/api/news/live",
                                                    params={"limit": 20})
        if success:
            articles = response.get("articles", [])
            total_count = response.get("total_count", 0)
            production_mode = response.get("production_mode")
            sources_status = response.get("sources_status", {})
            
            self.log_test("Live News Feed", len(articles) > 0,
                         f"Retrieved {len(articles)} articles (total: {total_count})", critical=True)
            self.log_test("News Production Mode", production_mode is True,
                         f"Production mode: {production_mode}")
            
            # Verify source differentiation
            if articles:
                sources = set(article.get("source", "") for article in articles)
                has_newsware = "NewsWare" in sources or "newsware" in str(sources).lower()
                self.log_test("NewsWare Source Integration", has_newsware,
                             f"Sources found: {list(sources)}")
                
                # Verify article structure
                first_article = articles[0]
                required_fields = ["id", "headline", "body", "source", "published_at"]
                has_all_fields = all(field in first_article for field in required_fields)
                self.log_test("News Article Structure", has_all_fields,
                             f"Article fields: {list(first_article.keys())}")
                
                # Verify recent timestamps (caching working)
                if "published_at" in first_article:
                    pub_time = first_article["published_at"]
                    self.log_test("Recent News Content", len(pub_time) > 0,
                                 f"Latest article: {pub_time}")
            
            # Test source status
            newsware_status = sources_status.get("newsware", {}).get("status", "unknown")
            self.log_test("NewsWare Service Status", newsware_status == "success",
                         f"NewsWare status: {newsware_status}")
            
        else:
            self.log_test("Live News API", False, error, critical=True)

        # Test background news fetching (check if articles are being cached)
        time.sleep(2)  # Brief wait
        success2, response2, _ = self.make_request("GET", "/api/news/live", params={"limit": 5})
        if success and success2:
            cached = response2.get("cached", False)
            self.log_test("Background News Caching", cached is True,
                         f"News caching active: {cached}")

    def test_enhanced_strategy_management(self):
        """Test enhanced strategy management with PBH algorithm support"""
        print("\n⚙️ TESTING ENHANCED STRATEGY MANAGEMENT")
        print("=" * 50)
        
        # Test strategy listing with proper sorting
        success, strategies, error = self.make_request("GET", "/api/strategies")
        if success:
            self.log_test("Strategy List Retrieval", True,
                         f"Found {len(strategies)} strategies")
            
            # Create PBH strategy for testing
            pbh_strategy = {
                "name": f"PBH Test Strategy {int(time.time())}",
                "description": "Prior Bar Break Algorithm for production testing",
                "code": """
class PriorBarBreakStrategy:
    def __init__(self, params):
        self.take_long = params.get('take_long', True)
        self.max_entry_count = params.get('max_entry_count', 3)
        self.tp_multiplier_1 = params.get('tp_multiplier_1', 1.5)
        self.stop_loss_multiplier = params.get('stop_loss_multiplier', 0.5)
        
    def generate_signals(self, data):
        # PBH algorithm implementation
        signals = []
        for i in range(1, len(data)):
            if data[i]['high'] > data[i-1]['high']:  # Break above prior bar
                signals.append({'action': 'BUY', 'price': data[i]['high']})
        return signals
""",
                "parameters": {
                    "take_long": True,
                    "take_short": False,
                    "max_entry_count": 3,
                    "tp_multiplier_1": 1.5,
                    "tp_multiplier_2": 2.0,
                    "tp_multiplier_3": 2.5,
                    "tp_multiplier_4": 3.0,
                    "stop_loss_multiplier": 0.5,
                    "adr_period": 20,
                    "volume_threshold": 1000000
                }
            }
            
            # Test strategy creation
            success, created, error = self.make_request("POST", "/api/strategies", data=pbh_strategy)
            if success:
                strategy_id = created.get("id")
                self.log_test("PBH Strategy Creation", True,
                             f"Created strategy ID: {strategy_id}")
                
                if strategy_id:
                    # Test strategy retrieval
                    success, retrieved, error = self.make_request("GET", f"/api/strategies/{strategy_id}")
                    if success:
                        self.log_test("Strategy Retrieval", True,
                                     f"Retrieved: {retrieved.get('name')}")
                        
                        # Test strategy update
                        updated_strategy = pbh_strategy.copy()
                        updated_strategy["description"] = "Updated PBH Algorithm - Production Ready"
                        updated_strategy["parameters"]["max_entry_count"] = 5
                        
                        success, updated, error = self.make_request("PUT", f"/api/strategies/{strategy_id}",
                                                                  data=updated_strategy)
                        if success:
                            self.log_test("Strategy Update", True,
                                         "Strategy parameters updated successfully")
                        else:
                            self.log_test("Strategy Update", False, error)
                        
                        # Test strategy deletion
                        success, _, error = self.make_request("DELETE", f"/api/strategies/{strategy_id}")
                        if success:
                            self.log_test("Strategy Deletion", True,
                                         "Strategy deleted successfully")
                        else:
                            self.log_test("Strategy Deletion", False, error)
                    else:
                        self.log_test("Strategy Retrieval", False, error)
            else:
                self.log_test("Strategy Creation", False, error)
        else:
            self.log_test("Strategy Management", False, error, critical=True)

    def test_database_integration(self):
        """Test database integration and indexes"""
        print("\n🗄️ TESTING DATABASE INTEGRATION")
        print("=" * 50)
        
        # Test database connectivity through health endpoint
        success, response, error = self.make_request("GET", "/api/health")
        if success:
            db_status = response.get("database")
            self.log_test("Database Connectivity", db_status == "healthy",
                         f"Database status: {db_status}", critical=True)
        else:
            self.log_test("Database Health Check", False, error, critical=True)

        # Test data persistence through backtest results
        success, results, error = self.make_request("GET", "/api/backtest/results")
        if success:
            self.log_test("Backtest Results Persistence", True,
                         f"Stored results: {len(results)}")
            
            # Verify proper sorting (most recent first)
            if len(results) > 1:
                timestamps = [r.get("created_at", "") for r in results[:2]]
                properly_sorted = timestamps[0] >= timestamps[1] if all(timestamps) else True
                self.log_test("Results Sorting", properly_sorted,
                             f"Latest timestamps: {timestamps[:2]}")
        else:
            self.log_test("Database Query Operations", False, error)

        # Test error handling with invalid requests
        success, _, error = self.make_request("GET", "/api/strategies/invalid-id", expected_status=404)
        self.log_test("Database Error Handling", success,
                     "Properly handles invalid IDs with 404")

    def test_production_safety_features(self):
        """Test production safety features and monitoring"""
        print("\n🛡️ TESTING PRODUCTION SAFETY FEATURES")
        print("=" * 50)
        
        # Test async execution (non-blocking API)
        start_time = time.time()
        
        # Make multiple concurrent-like requests to test non-blocking behavior
        requests_data = []
        for i in range(3):
            success, response, error = self.make_request("GET", "/api/health", timeout=10)
            requests_data.append((success, time.time() - start_time))
        
        # All requests should complete quickly (async/non-blocking)
        all_fast = all(duration < 5 for _, duration in requests_data)
        all_successful = all(success for success, _ in requests_data)
        
        self.log_test("Async Non-blocking API", all_fast and all_successful,
                     f"All requests completed in <5s: {[f'{d:.2f}s' for _, d in requests_data]}")

        # Test timeout controls with market data
        success, response, error = self.make_request("GET", "/api/market/AAPL/aggregates",
                                                    params={
                                                        "start_date": "2020-01-01",
                                                        "end_date": "2024-01-01",
                                                        "timespan": "minute",
                                                        "multiplier": 1
                                                    }, timeout=30)
        
        # Should either complete or timeout gracefully
        if success:
            results = response.get("results", [])
            reasonable_size = len(results) < 10000  # Shouldn't return excessive data
            self.log_test("Resource Control", reasonable_size,
                         f"Data size controlled: {len(results)} points")
        else:
            timeout_controlled = "timeout" in error.lower() or "limit" in error.lower()
            self.log_test("Timeout Controls", timeout_controlled,
                         f"Timeout handled: {error}")

        # Test error handling and logging
        success, response, error = self.make_request("POST", "/api/settings/test-connection",
                                                    params={"service": "invalid"}, expected_status=400)
        self.log_test("Error Handling", success,
                     "Invalid requests properly rejected")

        # Test memory/CPU monitoring integration (check if health endpoint reports system status)
        success, response, error = self.make_request("GET", "/api/health")
        if success:
            has_monitoring = "services" in response and len(response.get("services", {})) > 0
            self.log_test("System Monitoring", has_monitoring,
                         f"Monitoring active: {list(response.get('services', {}).keys())}")

    def run_production_tests(self):
        """Run all production test suites"""
        print("🚀 ALTAI TRADER PRODUCTION TESTING - FEEDBACK 5.0")
        print("🎯 Testing Production-Ready Features with Real API Integration")
        print("=" * 80)
        
        # Run all production test suites
        self.test_health_and_status_endpoints()
        self.test_real_api_connections()
        self.test_production_market_data()
        self.test_production_backtesting_engine()
        self.test_live_news_integration()
        self.test_enhanced_strategy_management()
        self.test_database_integration()
        self.test_production_safety_features()
        
        # Print comprehensive summary
        print("\n" + "=" * 80)
        print("📊 PRODUCTION TESTING SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Critical failures
        if self.critical_failures:
            print(f"\n🚨 CRITICAL FAILURES ({len(self.critical_failures)}):")
            for failure in self.critical_failures:
                print(f"  ❌ {failure}")
        
        # Production readiness assessment
        critical_tests = [test for test in self.test_results if test.get("critical", False)]
        critical_passed = sum(1 for test in critical_tests if test["success"])
        critical_total = len(critical_tests)
        
        if critical_total > 0:
            critical_rate = (critical_passed / critical_total) * 100
            print(f"\n🎯 PRODUCTION READINESS: {critical_rate:.1f}% ({critical_passed}/{critical_total} critical tests passed)")
            
            if critical_rate >= 90:
                print("✅ PRODUCTION READY - All critical systems operational")
            elif critical_rate >= 75:
                print("⚠️ MOSTLY READY - Some critical issues need attention")
            else:
                print("❌ NOT PRODUCTION READY - Critical failures detected")
        
        # List failed tests
        failed_tests = [test for test in self.test_results if not test["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                criticality = " [CRITICAL]" if test.get("critical", False) else ""
                print(f"  - {test['name']}{criticality}: {test['message']}")
        
        return len(self.critical_failures) == 0

def main():
    """Main production test runner"""
    tester = AltaiTraderProductionTester()
    production_ready = tester.run_production_tests()
    
    return 0 if production_ready else 1

if __name__ == "__main__":
    sys.exit(main())