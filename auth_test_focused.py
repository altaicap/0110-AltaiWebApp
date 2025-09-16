#!/usr/bin/env python3
"""
Focused Authentication Testing for Review Request
Tests authentication endpoints specifically mentioned in the review request
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any

class AuthenticationFocusedTester:
    """Focused authentication testing for the review request"""
    
    def __init__(self, base_url="https://nightwatch-trader.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.auth_token = None

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

    def test_backend_health_check(self):
        """Test backend health and accessibility"""
        print("\n🔍 1. Backend Health Check...")
        
        # Test root endpoint
        success, response = self.run_test(
            "Backend Root Endpoint",
            "GET",
            "/",
            200
        )
        
        if success and response:
            message = response.get("message", "")
            version = response.get("version", "")
            production_mode = response.get("production_mode", False)
            
            self.log_test("Backend Message", "Altai Trader" in message, f"Message: {message}")
            self.log_test("Backend Version", bool(version), f"Version: {version}")
            self.log_test("Production Mode", production_mode is not None, f"Production mode: {production_mode}")
        
        # Test health endpoint
        success, response = self.run_test(
            "Backend Health Endpoint",
            "GET",
            "/api/health",
            200
        )
        
        if success and response:
            status = response.get("status")
            database = response.get("database")
            
            self.log_test("Health Status", status == "healthy", f"Status: {status}")
            self.log_test("Database Health", database == "healthy", f"Database: {database}")

    def test_alex_login_credentials(self):
        """Test /api/auth/login POST endpoint with alex@altaitrader.com / Altai2025"""
        print("\n🔍 2. Testing Alex Login (alex@altaitrader.com / Altai2025)...")
        
        alex_credentials = {
            "email": "alex@altaitrader.com",
            "password": "Altai2025"
        }
        
        success, response = self.run_test(
            "Alex Login Authentication",
            "POST",
            "/api/auth/login",
            200,
            data=alex_credentials
        )
        
        if success and response:
            # Verify response structure
            required_fields = ["access_token", "token_type", "user"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Login Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Login Response Structure", True, "All required fields present")
                
                # Store token for further tests
                self.auth_token = response.get("access_token")
                token_type = response.get("token_type")
                user_info = response.get("user", {})
                
                self.log_test("Access Token Generated", bool(self.auth_token), 
                             f"Token length: {len(self.auth_token) if self.auth_token else 0}")
                self.log_test("Token Type", token_type == "bearer", f"Token type: {token_type}")
                
                # Verify user information
                user_email = user_info.get("email")
                user_name = user_info.get("full_name")
                user_id = user_info.get("id")
                
                self.log_test("User Email Correct", user_email == "alex@altaitrader.com", 
                             f"Email: {user_email}")
                self.log_test("User Name Present", bool(user_name), f"Name: {user_name}")
                self.log_test("User ID Generated", bool(user_id), f"ID: {user_id}")

    def test_user_registration_endpoint(self):
        """Test /api/auth/register POST endpoint with new user data"""
        print("\n🔍 3. Testing User Registration Endpoint...")
        
        # Generate unique email for testing
        timestamp = int(datetime.utcnow().timestamp())
        new_user_data = {
            "email": f"testuser{timestamp}@altaitrader.com",
            "full_name": "Test User Registration",
            "password": "TestPassword123"
        }
        
        success, response = self.run_test(
            "New User Registration",
            "POST",
            "/api/auth/register",
            200,
            data=new_user_data
        )
        
        if success and response:
            # Verify response structure
            required_fields = ["access_token", "token_type", "user"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Registration Response Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Registration Response Structure", True, "All required fields present")
                
                access_token = response.get("access_token")
                user_info = response.get("user", {})
                
                self.log_test("Registration Token Generated", bool(access_token), 
                             f"Token length: {len(access_token) if access_token else 0}")
                
                # Verify user information
                registered_email = user_info.get("email")
                registered_name = user_info.get("full_name")
                
                self.log_test("Registered Email Correct", registered_email == new_user_data["email"], 
                             f"Email: {registered_email}")
                self.log_test("Registered Name Correct", registered_name == new_user_data["full_name"], 
                             f"Name: {registered_name}")

    def test_cors_and_headers(self):
        """Test CORS and headers configuration"""
        print("\n🔍 4. Testing CORS and Headers Configuration...")
        
        # Test preflight request
        try:
            response = requests.options(
                f"{self.base_url}/api/auth/login",
                headers={
                    'Origin': 'https://nightwatch-trader.preview.emergentagent.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                },
                timeout=30
            )
            
            self.log_test("CORS Preflight Response", response.status_code in [200, 204], 
                         f"Status: {response.status_code}")
            
            # Check specific CORS headers
            allow_origin = response.headers.get('Access-Control-Allow-Origin')
            allow_methods = response.headers.get('Access-Control-Allow-Methods')
            allow_headers = response.headers.get('Access-Control-Allow-Headers')
            
            self.log_test("CORS Allow Origin", allow_origin is not None, f"Origin: {allow_origin}")
            self.log_test("CORS Allow Methods", allow_methods is not None, f"Methods: {allow_methods}")
            self.log_test("CORS Allow Headers", allow_headers is not None, f"Headers: {allow_headers}")
            
        except Exception as e:
            self.log_test("CORS Headers Test", False, f"Error testing CORS: {str(e)}")
        
        # Test Content-Type header acceptance
        if self.auth_token:
            auth_headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            success, response = self.run_test(
                "Content-Type Header Acceptance",
                "GET",
                "/api/auth/me",
                200,
                headers=auth_headers
            )
            
            if success:
                self.log_test("Content-Type Headers", True, "JSON Content-Type accepted")

    def test_jwt_token_generation_validation(self):
        """Test JWT token generation and validation"""
        print("\n🔍 5. Testing JWT Token Generation and Validation...")
        
        if not self.auth_token:
            self.log_test("JWT Token Validation Setup", False, "No auth token available")
            return
        
        # Test accessing protected endpoint with valid token
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        success, response = self.run_test(
            "Protected Endpoint Access",
            "GET",
            "/api/auth/me",
            200,
            headers=auth_headers
        )
        
        if success and response:
            # Verify user profile structure
            required_fields = ["id", "email", "full_name", "is_active", "created_at"]
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("User Profile Structure", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("User Profile Structure", True, "All required fields present")
                
                is_active = response.get("is_active")
                email = response.get("email")
                
                self.log_test("User Active Status", is_active, f"Active: {is_active}")
                self.log_test("Profile Email Match", email == "alex@altaitrader.com", f"Email: {email}")
        
        # Test with invalid token
        invalid_headers = {"Authorization": "Bearer invalid_token_123"}
        
        success, response = self.run_test(
            "Invalid Token Rejection",
            "GET",
            "/api/auth/me",
            401,
            headers=invalid_headers
        )
        
        if success:
            self.log_test("Invalid Token Handling", True, "Correctly rejected invalid token")
        
        # Test without token (should return 401 or 403)
        success, response = self.run_test(
            "No Token Rejection",
            "GET",
            "/api/auth/me",
            403  # Backend returns 403 instead of 401, but both are valid
        )
        
        if success:
            self.log_test("Missing Token Handling", True, "Correctly rejected missing token")

    def test_authentication_service_configuration(self):
        """Test authentication service configuration"""
        print("\n🔍 6. Testing Authentication Service Configuration...")
        
        # Test system health for authentication components
        success, response = self.run_test(
            "System Health for Auth",
            "GET",
            "/api/system/health",
            200
        )
        
        if success and response:
            databases = response.get("databases", {})
            mongodb_status = databases.get("mongodb", False)
            sql_status = databases.get("sql", False)
            
            self.log_test("MongoDB for Auth", mongodb_status, f"MongoDB: {mongodb_status}")
            self.log_test("SQL Database for Auth", sql_status, f"SQL DB: {sql_status}")
            
            # Authentication works with MongoDB (primary) even if SQL has issues
            auth_functional = mongodb_status
            self.log_test("Authentication Database Functional", auth_functional, 
                         f"Auth can function with MongoDB: {auth_functional}")
        
        # Test settings endpoint for auth configuration
        success, response = self.run_test(
            "Settings for Auth Config",
            "GET",
            "/api/settings",
            200
        )
        
        if success and response:
            database_connected = response.get("database_connected", False)
            production_mode = response.get("production_mode", False)
            
            self.log_test("Database Connection Status", database_connected, 
                         f"DB connected: {database_connected}")
            self.log_test("Production Mode Status", production_mode is not None, 
                         f"Production: {production_mode}")

    def test_user_management_functionality(self):
        """Test user management functionality"""
        print("\n🔍 7. Testing User Management Functionality...")
        
        if not self.auth_token:
            self.log_test("User Management Setup", False, "No auth token available")
            return
        
        auth_headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test that alex@altaitrader.com user exists and is accessible
        success, response = self.run_test(
            "Alex User Profile Access",
            "GET",
            "/api/auth/me",
            200,
            headers=auth_headers
        )
        
        if success and response:
            email = response.get("email")
            full_name = response.get("full_name")
            is_active = response.get("is_active")
            
            self.log_test("Alex User Exists", email == "alex@altaitrader.com", 
                         f"User email: {email}")
            self.log_test("Alex User Active", is_active, f"User active: {is_active}")
            self.log_test("Alex User Name", bool(full_name), f"User name: {full_name}")
        
        # Test profile update functionality
        profile_update = {
            "full_name": "Alex G - Updated"
        }
        
        success, response = self.run_test(
            "User Profile Update",
            "PUT",
            "/api/auth/me",
            200,
            data=profile_update,
            headers=auth_headers
        )
        
        if success and response:
            updated_name = response.get("full_name")
            self.log_test("Profile Update Success", updated_name == profile_update["full_name"], 
                         f"Updated name: {updated_name}")

    def test_database_connectivity_for_auth(self):
        """Test database connectivity for user authentication"""
        print("\n🔍 8. Testing Database Connectivity for Authentication...")
        
        # Test that authentication operations work (create, login, access)
        # This is implicitly tested through registration and login tests
        
        # Test system health endpoint for database status
        success, response = self.run_test(
            "Database Health Check",
            "GET",
            "/api/system/health",
            200
        )
        
        if success and response:
            databases = response.get("databases", {})
            
            # Check individual database health
            for db_name, status in databases.items():
                self.log_test(f"{db_name.upper()} Database Health", status, 
                             f"{db_name}: {status}")
            
            # Overall database connectivity for auth
            mongodb_healthy = databases.get("mongodb", False)
            self.log_test("Auth Database Connectivity", mongodb_healthy, 
                         f"MongoDB (primary auth DB) healthy: {mongodb_healthy}")

    def run_authentication_tests(self):
        """Run all authentication-focused tests"""
        print("🔐 AUTHENTICATION ENDPOINT TESTING")
        print("📋 Review Request Focus: Test authentication endpoints for login functionality")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 80)
        print("Testing Areas:")
        print("1. Backend Health Check - Verify backend is running and accessible")
        print("2. Alex Login Test - Test /api/auth/login with alex@altaitrader.com / Altai2025")
        print("3. User Registration - Test /api/auth/register with new user data")
        print("4. CORS and Headers - Verify CORS headers and Content-Type acceptance")
        print("5. JWT Token Validation - Test JWT token generation and validation")
        print("6. Authentication Service - Check authentication service configuration")
        print("7. User Management - Verify user exists and management works")
        print("8. Database Connectivity - Test database connectivity for authentication")
        print("=" * 80)
        
        # Run authentication-specific tests
        self.test_backend_health_check()
        self.test_alex_login_credentials()
        self.test_user_registration_endpoint()
        self.test_cors_and_headers()
        self.test_jwt_token_generation_validation()
        self.test_authentication_service_configuration()
        self.test_user_management_functionality()
        self.test_database_connectivity_for_auth()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 AUTHENTICATION TEST SUMMARY")
        print("=" * 80)
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
            print("\n🎉 ALL AUTHENTICATION TESTS PASSED!")
        
        # Specific findings for the review request
        print("\n" + "=" * 80)
        print("🎯 REVIEW REQUEST FINDINGS")
        print("=" * 80)
        
        # Check if login is working
        login_tests = [t for t in self.test_results if "Login" in t["name"]]
        login_working = all(t["success"] for t in login_tests)
        
        # Check if registration is working
        registration_tests = [t for t in self.test_results if "Registration" in t["name"]]
        registration_working = all(t["success"] for t in registration_tests)
        
        # Check if JWT tokens are working
        jwt_tests = [t for t in self.test_results if "Token" in t["name"] or "JWT" in t["name"]]
        jwt_working = all(t["success"] for t in jwt_tests)
        
        # Check if CORS is working
        cors_tests = [t for t in self.test_results if "CORS" in t["name"]]
        cors_working = all(t["success"] for t in cors_tests)
        
        print(f"✅ Login Functionality: {'WORKING' if login_working else 'ISSUES DETECTED'}")
        print(f"✅ User Registration: {'WORKING' if registration_working else 'ISSUES DETECTED'}")
        print(f"✅ JWT Token System: {'WORKING' if jwt_working else 'ISSUES DETECTED'}")
        print(f"✅ CORS Configuration: {'WORKING' if cors_working else 'ISSUES DETECTED'}")
        
        # Overall assessment
        critical_systems_working = login_working and registration_working and jwt_working
        
        if critical_systems_working:
            print("\n🎉 AUTHENTICATION SYSTEM IS FULLY OPERATIONAL!")
            print("✅ Users can successfully authenticate")
            print("✅ Landing page authentication modals should work")
            print("✅ Backend authentication service is properly configured")
        else:
            print("\n⚠️ AUTHENTICATION ISSUES DETECTED")
            print("❌ Some authentication functionality may not work properly")
            print("🔧 Check failed tests above for specific issues")
        
        return self.tests_passed == self.tests_run


if __name__ == "__main__":
    # Run focused authentication tests for the review request
    auth_tester = AuthenticationFocusedTester()
    auth_passed = auth_tester.run_authentication_tests()
    
    if auth_passed:
        sys.exit(0)
    else:
        sys.exit(1)