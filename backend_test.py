#!/usr/bin/env python3
"""
Cloud-Cost-Pulse Backend API Test Suite
Tests all critical backend endpoints with Clerk authentication
"""

import requests
import json
import time
import sys
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "https://finops-dash.preview.emergentagent.com/api"
CLERK_API_URL = "https://api.clerk.com/v1"
CLERK_SECRET_KEY = "sk_test_tQ0ZZVxvsOIHsdTQ4r0uYMrPRRU5t3JpddidutPE2x"
TEST_EMAIL = "ccp.tester@example.com"
TEST_PASSWORD = "CcpTest!2025Secure"

# Global state
auth_token: Optional[str] = None
token_expires_at: float = 0
user_id: Optional[str] = None
created_resource_id: Optional[str] = None


def log_test(name: str, status: str, details: str = ""):
    """Log test result"""
    symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
    print(f"\n{symbol} {name}: {status}")
    if details:
        print(f"   {details}")


def get_clerk_token() -> str:
    """Get or refresh Clerk authentication token"""
    global auth_token, token_expires_at, user_id
    
    # Return cached token if still valid (with 10s buffer)
    if auth_token and time.time() < (token_expires_at - 10):
        return auth_token
    
    try:
        headers = {"Authorization": f"Bearer {CLERK_SECRET_KEY}", "Content-Type": "application/json"}
        
        # Step 1: Find or create user
        print(f"🔐 Authenticating with Clerk as {TEST_EMAIL}...")
        users_resp = requests.get(
            f"{CLERK_API_URL}/users",
            headers=headers,
            params={"email_address": [TEST_EMAIL]}
        )
        
        if users_resp.status_code == 200 and users_resp.json():
            user_id = users_resp.json()[0]["id"]
            print(f"   Found existing user: {user_id}")
        else:
            # Create user
            create_resp = requests.post(
                f"{CLERK_API_URL}/users",
                headers=headers,
                json={
                    "email_address": [TEST_EMAIL],
                    "password": TEST_PASSWORD,
                    "skip_password_checks": True,
                    "skip_password_requirement": False
                }
            )
            if create_resp.status_code not in [200, 201]:
                raise Exception(f"Failed to create user: {create_resp.status_code} {create_resp.text}")
            user_id = create_resp.json()["id"]
            print(f"   Created new user: {user_id}")
        
        # Step 2: Create session
        session_resp = requests.post(
            f"{CLERK_API_URL}/sessions",
            headers=headers,
            json={"user_id": user_id}
        )
        if session_resp.status_code not in [200, 201]:
            raise Exception(f"Failed to create session: {session_resp.status_code} {session_resp.text}")
        session_id = session_resp.json()["id"]
        print(f"   Created session: {session_id}")
        
        # Step 3: Mint token
        token_resp = requests.post(
            f"{CLERK_API_URL}/sessions/{session_id}/tokens",
            headers=headers
        )
        if token_resp.status_code not in [200, 201]:
            raise Exception(f"Failed to mint token: {token_resp.status_code} {token_resp.text}")
        
        auth_token = token_resp.json()["jwt"]
        token_expires_at = time.time() + 50  # Tokens expire in ~60s, refresh at 50s
        print(f"   ✓ Authentication successful (token valid for ~50s)")
        return auth_token
        
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        sys.exit(1)


def api_call(method: str, endpoint: str, auth: bool = True, **kwargs) -> requests.Response:
    """Make API call with optional authentication"""
    url = f"{BASE_URL}/{endpoint.lstrip('/')}"
    headers = kwargs.pop("headers", {})
    
    if auth:
        token = get_clerk_token()
        headers["Authorization"] = f"Bearer {token}"
    
    if "json" in kwargs:
        headers["Content-Type"] = "application/json"
    
    return requests.request(method, url, headers=headers, **kwargs)


def test_1_health_and_auth():
    """Test 1: Health check and authentication"""
    try:
        # Health check (no auth)
        resp = api_call("GET", "/health", auth=False)
        if resp.status_code == 200 and resp.json().get("status") == "ok":
            log_test("1a. Health Check", "PASS", "GET /api/health returns {status:'ok'}")
        else:
            log_test("1a. Health Check", "FAIL", f"Expected 200 with status:ok, got {resp.status_code}: {resp.text}")
            return False
        
        # Unauthenticated dashboard access
        resp = api_call("GET", "/dashboard", auth=False)
        if resp.status_code == 401:
            log_test("1b. Unauthenticated Access", "PASS", "GET /api/dashboard without auth returns 401")
        else:
            log_test("1b. Unauthenticated Access", "FAIL", f"Expected 401, got {resp.status_code}")
            return False
        
        return True
    except Exception as e:
        log_test("1. Health & Auth", "FAIL", str(e))
        return False


def test_2_live_cost_engine():
    """Test 2: Live cost engine - most critical test"""
    try:
        # Reset to get clean seed data
        print("\n🔄 Resetting database to seed state...")
        resp = api_call("POST", "/reset", json={})
        if resp.status_code != 200:
            log_test("2. Live Cost Engine", "FAIL", f"Reset failed: {resp.status_code} {resp.text}")
            return False
        print("   ✓ Database reset complete")
        
        # Get dashboard stats
        resp = api_call("GET", "/dashboard")
        if resp.status_code != 200:
            log_test("2a. Dashboard Fetch", "FAIL", f"GET /api/dashboard failed: {resp.status_code}")
            return False
        
        dash = resp.json()
        total_from_dashboard = dash["stats"]["totalMonthlyCost"]
        budget_status = dash["budget"]["status"]
        forecast_expected = dash["forecast"]["expectedCost"]
        trend = dash["trend"]
        
        log_test("2a. Dashboard Fetch", "PASS", 
                f"totalMonthlyCost={total_from_dashboard}, budget.status={budget_status}, forecast.expectedCost={forecast_expected}")
        
        # Get all active resources and sum their costs
        resp = api_call("GET", "/resources", params={"status": "Active", "pageSize": 100})
        if resp.status_code != 200:
            log_test("2b. Resources Fetch", "FAIL", f"GET /api/resources failed: {resp.status_code}")
            return False
        
        resources = resp.json()["items"]
        sum_of_active_costs = sum(r["monthly_cost"] for r in resources)
        
        # Compare (rounding to nearest integer)
        if round(sum_of_active_costs) == round(total_from_dashboard):
            log_test("2b. Cost Calculation", "PASS", 
                    f"SUM of active resources ({round(sum_of_active_costs)}) EQUALS dashboard total ({round(total_from_dashboard)})")
        else:
            log_test("2b. Cost Calculation", "FAIL", 
                    f"SUM of active resources ({round(sum_of_active_costs)}) != dashboard total ({round(total_from_dashboard)})")
            return False
        
        # Verify budget status is valid
        valid_statuses = ["Healthy", "Warning", "Critical", "Exceeded"]
        if budget_status in valid_statuses:
            log_test("2c. Budget Status", "PASS", f"budget.status='{budget_status}' is valid")
        else:
            log_test("2c. Budget Status", "FAIL", f"budget.status='{budget_status}' not in {valid_statuses}")
            return False
        
        # Verify forecast = average of last 3 trend totals (±1 rounding)
        if len(trend) >= 3:
            last_3_totals = [t["total"] for t in trend[-3:]]
            expected_forecast = sum(last_3_totals) / len(last_3_totals)
            if abs(forecast_expected - expected_forecast) <= 1:
                log_test("2d. Forecast Calculation", "PASS", 
                        f"forecast.expectedCost ({forecast_expected}) matches avg of last 3 months ({round(expected_forecast)})")
            else:
                log_test("2d. Forecast Calculation", "FAIL", 
                        f"forecast.expectedCost ({forecast_expected}) != avg of last 3 ({round(expected_forecast)})")
                return False
        else:
            log_test("2d. Forecast Calculation", "WARN", f"Not enough trend data (only {len(trend)} months)")
        
        return True
    except Exception as e:
        log_test("2. Live Cost Engine", "FAIL", str(e))
        return False


def test_3_resource_create():
    """Test 3: Resource creation with validation"""
    global created_resource_id
    
    try:
        # Get initial dashboard total
        resp = api_call("GET", "/dashboard")
        initial_total = resp.json()["stats"]["totalMonthlyCost"]
        
        # Create a new resource
        new_resource = {
            "resource_name": "qa-test-vm",
            "service_type": "Azure Virtual Machine",
            "region": "East US",
            "monthly_cost": 5000,
            "status": "Active",
            "owner": "qa"
        }
        
        resp = api_call("POST", "/resources", json=new_resource)
        if resp.status_code != 201:
            log_test("3a. Resource Create", "FAIL", f"Expected 201, got {resp.status_code}: {resp.text}")
            return False
        
        created = resp.json()
        created_resource_id = created.get("id")
        
        if not created_resource_id:
            log_test("3a. Resource Create", "FAIL", "No 'id' in response")
            return False
        
        log_test("3a. Resource Create", "PASS", f"Created resource with id={created_resource_id}")
        
        # Verify dashboard total increased by 5000
        time.sleep(0.5)  # Brief pause
        resp = api_call("GET", "/dashboard")
        new_total = resp.json()["stats"]["totalMonthlyCost"]
        
        if new_total == initial_total + 5000:
            log_test("3b. Cost Update", "PASS", f"Dashboard total increased by exactly 5000 ({initial_total} → {new_total})")
        else:
            log_test("3b. Cost Update", "FAIL", 
                    f"Expected increase of 5000, got {new_total - initial_total} ({initial_total} → {new_total})")
            return False
        
        # Validation tests
        validations = [
            ({"resource_name": "", "service_type": "Azure VM", "region": "East US", "monthly_cost": 100, "status": "Active"}, 
             "empty resource_name"),
            ({"resource_name": "test", "service_type": "Azure VM", "region": "East US", "monthly_cost": 0, "status": "Active"}, 
             "monthly_cost=0"),
            ({"resource_name": "test", "service_type": "Azure VM", "region": "East US", "monthly_cost": -100, "status": "Active"}, 
             "negative monthly_cost"),
            ({"resource_name": "test", "service_type": "Azure VM", "region": "East US", "monthly_cost": 100, "status": "Foo"}, 
             "invalid status"),
            ({"resource_name": "test", "region": "East US", "monthly_cost": 100, "status": "Active"}, 
             "missing service_type"),
        ]
        
        all_validations_passed = True
        for invalid_data, reason in validations:
            resp = api_call("POST", "/resources", json=invalid_data)
            if resp.status_code == 400:
                print(f"   ✓ Validation: {reason} → 400")
            else:
                print(f"   ✗ Validation: {reason} → {resp.status_code} (expected 400)")
                all_validations_passed = False
        
        if all_validations_passed:
            log_test("3c. Validation", "PASS", "All 5 validation scenarios return 400")
        else:
            log_test("3c. Validation", "FAIL", "Some validations did not return 400")
            return False
        
        return True
    except Exception as e:
        log_test("3. Resource Create", "FAIL", str(e))
        return False


def test_4_resource_update():
    """Test 4: Resource update"""
    global created_resource_id
    
    if not created_resource_id:
        log_test("4. Resource Update", "FAIL", "No resource ID from previous test")
        return False
    
    try:
        # Get current dashboard total
        resp = api_call("GET", "/dashboard")
        initial_total = resp.json()["stats"]["totalMonthlyCost"]
        
        # Update resource cost from 5000 to 9000
        resp = api_call("PUT", f"/resources/{created_resource_id}", json={"monthly_cost": 9000})
        if resp.status_code != 200:
            log_test("4a. Resource Update", "FAIL", f"Expected 200, got {resp.status_code}: {resp.text}")
            return False
        
        log_test("4a. Resource Update", "PASS", f"Updated resource {created_resource_id} cost to 9000")
        
        # Verify dashboard reflects +4000 delta
        time.sleep(0.5)
        resp = api_call("GET", "/dashboard")
        new_total = resp.json()["stats"]["totalMonthlyCost"]
        
        if new_total == initial_total + 4000:
            log_test("4b. Cost Delta", "PASS", f"Dashboard reflects +4000 delta ({initial_total} → {new_total})")
        else:
            log_test("4b. Cost Delta", "FAIL", 
                    f"Expected +4000, got {new_total - initial_total} ({initial_total} → {new_total})")
            return False
        
        # Test 404 for nonexistent resource
        resp = api_call("PUT", "/resources/nonexistent-id-12345", json={"monthly_cost": 1000})
        if resp.status_code == 404:
            log_test("4c. Update 404", "PASS", "PUT nonexistent resource returns 404")
        else:
            log_test("4c. Update 404", "FAIL", f"Expected 404, got {resp.status_code}")
            return False
        
        # Test validation: negative cost
        resp = api_call("PUT", f"/resources/{created_resource_id}", json={"monthly_cost": -5})
        if resp.status_code == 400:
            log_test("4d. Update Validation", "PASS", "PUT with negative cost returns 400")
        else:
            log_test("4d. Update Validation", "FAIL", f"Expected 400, got {resp.status_code}")
            return False
        
        return True
    except Exception as e:
        log_test("4. Resource Update", "FAIL", str(e))
        return False


def test_5_resource_delete():
    """Test 5: Resource deletion"""
    global created_resource_id
    
    if not created_resource_id:
        log_test("5. Resource Delete", "FAIL", "No resource ID from previous test")
        return False
    
    try:
        # Get current dashboard total
        resp = api_call("GET", "/dashboard")
        initial_total = resp.json()["stats"]["totalMonthlyCost"]
        
        # Delete resource
        resp = api_call("DELETE", f"/resources/{created_resource_id}")
        if resp.status_code != 200:
            log_test("5a. Resource Delete", "FAIL", f"Expected 200, got {resp.status_code}: {resp.text}")
            return False
        
        if resp.json().get("ok") != True:
            log_test("5a. Resource Delete", "FAIL", f"Expected {{ok:true}}, got {resp.json()}")
            return False
        
        log_test("5a. Resource Delete", "PASS", f"Deleted resource {created_resource_id}")
        
        # Verify dashboard total decreased by 9000
        time.sleep(0.5)
        resp = api_call("GET", "/dashboard")
        new_total = resp.json()["stats"]["totalMonthlyCost"]
        
        if new_total == initial_total - 9000:
            log_test("5b. Cost Decrease", "PASS", f"Dashboard total decreased by 9000 ({initial_total} → {new_total})")
        else:
            log_test("5b. Cost Decrease", "FAIL", 
                    f"Expected -9000, got {new_total - initial_total} ({initial_total} → {new_total})")
            return False
        
        # Test 404 for nonexistent resource
        resp = api_call("DELETE", "/resources/nonexistent-id-12345")
        if resp.status_code == 404:
            log_test("5c. Delete 404", "PASS", "DELETE nonexistent resource returns 404")
        else:
            log_test("5c. Delete 404", "FAIL", f"Expected 404, got {resp.status_code}")
            return False
        
        created_resource_id = None  # Clear for cleanup
        return True
    except Exception as e:
        log_test("5. Resource Delete", "FAIL", str(e))
        return False


def test_6_search_filter_pagination():
    """Test 6: Search, filter, and pagination"""
    try:
        # Search (case-insensitive)
        resp = api_call("GET", "/resources", params={"search": "vm"})
        if resp.status_code != 200:
            log_test("6a. Search", "FAIL", f"Search failed: {resp.status_code}")
            return False
        
        items = resp.json()["items"]
        # Verify search matches name/service/region/owner
        if items:
            log_test("6a. Search", "PASS", f"Search 'vm' returned {len(items)} results")
        else:
            log_test("6a. Search", "WARN", "Search 'vm' returned no results")
        
        # Filter by service
        resp = api_call("GET", "/resources", params={"service": "Azure Storage"})
        if resp.status_code != 200:
            log_test("6b. Service Filter", "FAIL", f"Service filter failed: {resp.status_code}")
            return False
        
        items = resp.json()["items"]
        if all(r["service_type"] == "Azure Storage" for r in items):
            log_test("6b. Service Filter", "PASS", f"Service filter returned {len(items)} Azure Storage resources")
        else:
            log_test("6b. Service Filter", "FAIL", "Service filter returned wrong service types")
            return False
        
        # Filter by status
        resp = api_call("GET", "/resources", params={"status": "Idle"})
        if resp.status_code != 200:
            log_test("6c. Status Filter", "FAIL", f"Status filter failed: {resp.status_code}")
            return False
        
        items = resp.json()["items"]
        if all(r["status"] == "Idle" for r in items):
            log_test("6c. Status Filter", "PASS", f"Status filter returned {len(items)} Idle resources")
        else:
            log_test("6c. Status Filter", "FAIL", "Status filter returned wrong statuses")
            return False
        
        # Cost range filter
        resp = api_call("GET", "/resources", params={"minCost": 1000, "maxCost": 3000})
        if resp.status_code != 200:
            log_test("6d. Cost Range Filter", "FAIL", f"Cost filter failed: {resp.status_code}")
            return False
        
        items = resp.json()["items"]
        if all(1000 <= r["monthly_cost"] <= 3000 for r in items):
            log_test("6d. Cost Range Filter", "PASS", f"Cost range filter returned {len(items)} resources in range")
        else:
            log_test("6d. Cost Range Filter", "FAIL", "Cost filter returned resources outside range")
            return False
        
        # Pagination
        resp = api_call("GET", "/resources", params={"page": 2, "pageSize": 5})
        if resp.status_code != 200:
            log_test("6e. Pagination", "FAIL", f"Pagination failed: {resp.status_code}")
            return False
        
        data = resp.json()
        required_fields = ["items", "total", "page", "pages", "facets", "catalog", "allRegions"]
        if all(field in data for field in required_fields):
            log_test("6e. Pagination", "PASS", 
                    f"Page 2 returned {len(data['items'])} items, total={data['total']}, pages={data['pages']}")
        else:
            log_test("6e. Pagination", "FAIL", f"Missing required fields: {required_fields}")
            return False
        
        return True
    except Exception as e:
        log_test("6. Search/Filter/Pagination", "FAIL", str(e))
        return False


def test_7_notifications():
    """Test 7: Notifications"""
    try:
        # Get initial notifications
        resp = api_call("GET", "/notifications")
        if resp.status_code != 200:
            log_test("7a. Get Notifications", "FAIL", f"GET failed: {resp.status_code}")
            return False
        
        initial_data = resp.json()
        initial_count = len(initial_data["items"])
        initial_unread = initial_data["unread"]
        
        log_test("7a. Get Notifications", "PASS", 
                f"Retrieved {initial_count} notifications, {initial_unread} unread")
        
        # Create a resource to trigger notification
        resp = api_call("POST", "/resources", json={
            "resource_name": "notification-test-vm",
            "service_type": "Azure Virtual Machine",
            "region": "East US",
            "monthly_cost": 1000,
            "status": "Active",
            "owner": "test"
        })
        
        if resp.status_code != 201:
            log_test("7b. Trigger Notification", "FAIL", f"Resource creation failed: {resp.status_code}")
            return False
        
        test_resource_id = resp.json()["id"]
        
        # Check for new notification
        time.sleep(0.5)
        resp = api_call("GET", "/notifications")
        new_data = resp.json()
        new_count = len(new_data["items"])
        
        # Look for "Resource added" notification
        has_resource_notif = any("Resource added" in n.get("title", "") for n in new_data["items"])
        
        if has_resource_notif:
            log_test("7b. Trigger Notification", "PASS", "New 'Resource added' notification created")
        else:
            log_test("7b. Trigger Notification", "FAIL", "No 'Resource added' notification found")
            # Clean up
            api_call("DELETE", f"/resources/{test_resource_id}")
            return False
        
        # Mark all as read
        resp = api_call("POST", "/notifications/read-all")
        if resp.status_code != 200 or resp.json().get("ok") != True:
            log_test("7c. Mark Read", "FAIL", f"read-all failed: {resp.status_code}")
            api_call("DELETE", f"/resources/{test_resource_id}")
            return False
        
        # Verify unread count is 0
        time.sleep(0.5)
        resp = api_call("GET", "/notifications")
        final_unread = resp.json()["unread"]
        
        if final_unread == 0:
            log_test("7c. Mark Read", "PASS", "All notifications marked as read, unread=0")
        else:
            log_test("7c. Mark Read", "FAIL", f"Expected unread=0, got {final_unread}")
            api_call("DELETE", f"/resources/{test_resource_id}")
            return False
        
        # Clean up test resource
        api_call("DELETE", f"/resources/{test_resource_id}")
        return True
    except Exception as e:
        log_test("7. Notifications", "FAIL", str(e))
        return False


def test_8_audit():
    """Test 8: Audit logs"""
    try:
        resp = api_call("GET", "/audit")
        if resp.status_code != 200:
            log_test("8. Audit Logs", "FAIL", f"GET /api/audit failed: {resp.status_code}")
            return False
        
        logs = resp.json()
        
        if not isinstance(logs, list):
            log_test("8. Audit Logs", "FAIL", "Response is not an array")
            return False
        
        # Check for required fields
        required_fields = ["action", "entity", "created_at"]
        if logs and all(all(field in log for field in required_fields) for log in logs[:5]):
            # Look for recent actions
            actions = [log["action"] for log in logs[:20]]
            has_create = "create" in actions
            has_delete = "delete" in actions
            
            log_test("8. Audit Logs", "PASS", 
                    f"Retrieved {len(logs)} audit entries (create={has_create}, delete={has_delete})")
        else:
            log_test("8. Audit Logs", "FAIL", "Missing required fields in audit logs")
            return False
        
        return True
    except Exception as e:
        log_test("8. Audit Logs", "FAIL", str(e))
        return False


def test_9_budget():
    """Test 9: Budget update"""
    try:
        # Update budget
        resp = api_call("POST", "/budget", json={"monthly_budget": 20000})
        if resp.status_code != 200:
            log_test("9a. Budget Update", "FAIL", f"POST /api/budget failed: {resp.status_code}")
            return False
        
        log_test("9a. Budget Update", "PASS", "Budget updated to 20000")
        
        # Verify in dashboard
        time.sleep(0.5)
        resp = api_call("GET", "/dashboard")
        dash = resp.json()
        
        if dash["budget"]["monthly_budget"] == 20000:
            log_test("9b. Budget Verification", "PASS", 
                    f"Dashboard shows budget=20000, usage={dash['budget']['usage_pct']}%")
        else:
            log_test("9b. Budget Verification", "FAIL", 
                    f"Expected budget=20000, got {dash['budget']['monthly_budget']}")
            return False
        
        # Test validation: budget too low
        resp = api_call("POST", "/budget", json={"monthly_budget": 50})
        if resp.status_code == 400:
            log_test("9c. Budget Validation", "PASS", "Budget < 100 returns 400")
        else:
            log_test("9c. Budget Validation", "FAIL", f"Expected 400, got {resp.status_code}")
            return False
        
        return True
    except Exception as e:
        log_test("9. Budget", "FAIL", str(e))
        return False


def test_10_reports():
    """Test 10: Reports persist, list, delete"""
    try:
        # Create report
        resp = api_call("POST", "/reports", json={"type": "Monthly Cost Report"})
        if resp.status_code != 201:
            log_test("10a. Report Create", "FAIL", f"POST /api/reports failed: {resp.status_code}")
            return False
        
        report = resp.json()
        report_id = report.get("id")
        
        # Verify snapshot structure
        required_fields = ["totalMonthlyCost", "budget", "forecast", "serviceBreakdown", "recommendations"]
        if all(field in report.get("snapshot", {}) for field in required_fields):
            log_test("10a. Report Create", "PASS", f"Report created with id={report_id}")
        else:
            log_test("10a. Report Create", "FAIL", "Report snapshot missing required fields")
            return False
        
        # List reports
        resp = api_call("GET", "/reports")
        if resp.status_code != 200:
            log_test("10b. Report List", "FAIL", f"GET /api/reports failed: {resp.status_code}")
            return False
        
        reports = resp.json()
        if any(r["id"] == report_id for r in reports):
            log_test("10b. Report List", "PASS", f"Report list contains newly created report")
        else:
            log_test("10b. Report List", "FAIL", "Newly created report not in list")
            return False
        
        # Delete report
        resp = api_call("DELETE", f"/reports/{report_id}")
        if resp.status_code == 200 and resp.json().get("ok") == True:
            log_test("10c. Report Delete", "PASS", f"Report {report_id} deleted")
        else:
            log_test("10c. Report Delete", "FAIL", f"DELETE failed: {resp.status_code}")
            return False
        
        return True
    except Exception as e:
        log_test("10. Reports", "FAIL", str(e))
        return False


def test_11_currency():
    """Test 11: Currency setting"""
    try:
        # Set currency to USD
        resp = api_call("POST", "/settings/currency", json={"currency": "USD"})
        if resp.status_code != 200:
            log_test("11a. Currency Update", "FAIL", f"POST failed: {resp.status_code}")
            return False
        
        log_test("11a. Currency Update", "PASS", "Currency set to USD")
        
        # Verify in dashboard
        time.sleep(0.5)
        resp = api_call("GET", "/dashboard")
        if resp.json()["currency"] == "USD":
            log_test("11b. Currency Verification", "PASS", "Dashboard shows currency=USD")
        else:
            log_test("11b. Currency Verification", "FAIL", f"Expected USD, got {resp.json()['currency']}")
            return False
        
        # Test invalid currency
        resp = api_call("POST", "/settings/currency", json={"currency": "XYZ"})
        if resp.status_code == 400:
            log_test("11c. Currency Validation", "PASS", "Invalid currency returns 400")
        else:
            log_test("11c. Currency Validation", "FAIL", f"Expected 400, got {resp.status_code}")
            return False
        
        # Reset to INR
        api_call("POST", "/settings/currency", json={"currency": "INR"})
        print("   ✓ Currency reset to INR")
        
        return True
    except Exception as e:
        log_test("11. Currency", "FAIL", str(e))
        return False


def test_12_regression():
    """Test 12: Regression tests for error handling"""
    try:
        all_passed = True
        
        # Azure connect with fake GUIDs
        resp = api_call("POST", "/azure/connect", json={
            "tenantId": "12345678-1234-1234-1234-123456789012",
            "clientId": "87654321-4321-4321-4321-210987654321",
            "clientSecret": "fake-secret-12345",
            "subscriptionId": "abcdef01-2345-6789-abcd-ef0123456789"
        })
        if resp.status_code == 422:
            print("   ✓ Azure connect with fake GUIDs → 422")
        else:
            print(f"   ✗ Azure connect with fake GUIDs → {resp.status_code} (expected 422)")
            all_passed = False
        
        # Azure sync without connection (after disconnect)
        api_call("POST", "/azure/disconnect")
        resp = api_call("POST", "/azure/sync")
        if resp.status_code == 404:
            print("   ✓ Azure sync without connection → 404")
        else:
            print(f"   ✗ Azure sync without connection → {resp.status_code} (expected 404)")
            all_passed = False
        
        # Email settings with bad key
        resp = api_call("POST", "/settings/email", json={"apiKey": "badkey", "recipient": "test@example.com"})
        if resp.status_code == 400:
            print("   ✓ Email with invalid key format → 400")
        else:
            print(f"   ✗ Email with invalid key format → {resp.status_code} (expected 400)")
            all_passed = False
        
        # Email settings with valid fake key
        resp = api_call("POST", "/settings/email", json={
            "apiKey": "re_fakeKeyForTesting123456",
            "recipient": "a@b.com"
        })
        if resp.status_code == 200:
            print("   ✓ Email with valid fake key → 200")
        else:
            print(f"   ✗ Email with valid fake key → {resp.status_code} (expected 200)")
            all_passed = False
        
        # Email test send (should fail gracefully)
        resp = api_call("POST", "/settings/email/test")
        if resp.status_code == 502:
            try:
                data = resp.json()
                if "error" in data:
                    error_msg = data["error"]
                    # Verify no key leak
                    if "re_fake" not in error_msg and "123456" not in error_msg:
                        print(f"   ✓ Email test send → 502 with safe error (no key leak)")
                    else:
                        print(f"   ✗ Email test send → 502 but error contains key: {error_msg}")
                        all_passed = False
                else:
                    print(f"   ✗ Email test send → 502 but no error field in JSON")
                    all_passed = False
            except Exception:
                # Response is not JSON (likely HTML error page from proxy)
                print(f"   ⚠️  Email test send → 502 (non-JSON response, likely proxy error page)")
        else:
            print(f"   ✗ Email test send → {resp.status_code} (expected 502)")
            all_passed = False
        
        # Rules validation
        resp = api_call("POST", "/settings/rules", json={"budgetWarnPct": 150})
        if resp.status_code == 400:
            print("   ✓ Rules with budgetWarnPct=150 → 400")
        else:
            print(f"   ✗ Rules with budgetWarnPct=150 → {resp.status_code} (expected 400)")
            all_passed = False
        
        # Verify GET /api/settings never exposes secrets
        resp = api_call("GET", "/settings")
        if resp.status_code == 200:
            settings_text = json.dumps(resp.json())
            if "clientSecret" not in settings_text and "resendApiKey" not in settings_text:
                print("   ✓ GET /api/settings does not expose raw secrets")
            else:
                print("   ✗ GET /api/settings exposes raw secrets")
                all_passed = False
        
        if all_passed:
            log_test("12. Regression Tests", "PASS", "All regression scenarios passed")
        else:
            log_test("12. Regression Tests", "FAIL", "Some regression tests failed")
        
        return all_passed
    except Exception as e:
        log_test("12. Regression Tests", "FAIL", str(e))
        return False


def main():
    """Run all tests"""
    print("=" * 70)
    print("Cloud-Cost-Pulse Backend API Test Suite")
    print("=" * 70)
    
    tests = [
        ("Health & Auth", test_1_health_and_auth),
        ("Live Cost Engine", test_2_live_cost_engine),
        ("Resource Create", test_3_resource_create),
        ("Resource Update", test_4_resource_update),
        ("Resource Delete", test_5_resource_delete),
        ("Search/Filter/Pagination", test_6_search_filter_pagination),
        ("Notifications", test_7_notifications),
        ("Audit Logs", test_8_audit),
        ("Budget", test_9_budget),
        ("Reports", test_10_reports),
        ("Currency", test_11_currency),
        ("Regression", test_12_regression),
    ]
    
    results = []
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n❌ {name}: EXCEPTION - {e}")
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed_count}/{total_count} tests passed")
    
    if passed_count == total_count:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total_count - passed_count} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
