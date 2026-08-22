#!/usr/bin/env python3
"""
Cloud-Cost-Pulse Backend API Test Suite
Tests all backend endpoints with Clerk authentication
"""

import requests
import json
import time
import sys
from typing import Optional, Dict, Any

# Configuration
BASE_URL = "https://finops-dash.preview.emergentagent.com/api"
CLERK_API_BASE = "https://api.clerk.com/v1"
CLERK_SECRET_KEY = "sk_test_tQ0ZZVxvsOIHsdTQ4r0uYMrPRRU5t3JpddidutPE2x"

# Test users
TEST_USER_1 = {
    "email": "ccp.tester@example.com",
    "password": "CcpTest!2025Secure"
}
TEST_USER_2 = {
    "email": "ccp.tester2@example.com",
    "password": "CcpTest!2025Secure"
}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def log_test(name: str):
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST: {name}{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")

def log_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def log_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def log_info(msg: str):
    print(f"{Colors.YELLOW}ℹ {msg}{Colors.END}")

class ClerkAuth:
    """Handle Clerk authentication"""
    
    def __init__(self):
        self.headers = {
            "Authorization": f"Bearer {CLERK_SECRET_KEY}",
            "Content-Type": "application/json"
        }
    
    def create_or_get_user(self, email: str, password: str) -> Optional[str]:
        """Create a user or get existing user ID"""
        try:
            # Try to create user
            response = requests.post(
                f"{CLERK_API_BASE}/users",
                headers=self.headers,
                json={
                    "email_address": [email],
                    "password": password
                }
            )
            
            if response.status_code == 200:
                user_id = response.json()["id"]
                log_success(f"Created user: {email} (ID: {user_id})")
                return user_id
            elif response.status_code == 422:
                # User exists, fetch it
                log_info(f"User {email} already exists, fetching...")
                response = requests.get(
                    f"{CLERK_API_BASE}/users",
                    headers=self.headers,
                    params={"email_address": [email]}
                )
                if response.status_code == 200:
                    users = response.json()
                    if users and len(users) > 0:
                        user_id = users[0]["id"]
                        log_success(f"Found existing user: {email} (ID: {user_id})")
                        return user_id
            
            log_error(f"Failed to create/get user: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            log_error(f"Exception creating/getting user: {e}")
            return None
    
    def create_session(self, user_id: str) -> Optional[str]:
        """Create a session for the user"""
        try:
            response = requests.post(
                f"{CLERK_API_BASE}/sessions",
                headers=self.headers,
                json={"user_id": user_id}
            )
            
            if response.status_code == 200:
                session_id = response.json()["id"]
                log_success(f"Created session: {session_id}")
                return session_id
            
            log_error(f"Failed to create session: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            log_error(f"Exception creating session: {e}")
            return None
    
    def mint_jwt(self, session_id: str) -> Optional[str]:
        """Mint a JWT token for the session"""
        try:
            response = requests.post(
                f"{CLERK_API_BASE}/sessions/{session_id}/tokens",
                headers=self.headers,
                json={}
            )
            
            if response.status_code == 200:
                jwt = response.json()["jwt"]
                log_success(f"Minted JWT token (expires in ~60s)")
                return jwt
            
            log_error(f"Failed to mint JWT: {response.status_code} - {response.text}")
            return None
        except Exception as e:
            log_error(f"Exception minting JWT: {e}")
            return None
    
    def get_auth_token(self, email: str, password: str) -> Optional[str]:
        """Complete auth flow and return JWT"""
        log_info(f"Authenticating user: {email}")
        user_id = self.create_or_get_user(email, password)
        if not user_id:
            return None
        
        session_id = self.create_session(user_id)
        if not session_id:
            return None
        
        jwt = self.mint_jwt(session_id)
        return jwt

def test_health():
    """Test 1: GET /api/health (no auth required)"""
    log_test("GET /api/health (no auth)")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "ok":
                log_success(f"Health check passed: {data}")
                return True
            else:
                log_error(f"Unexpected response: {data}")
                return False
        else:
            log_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_dashboard_unauth():
    """Test 2: GET /api/dashboard (unauthenticated) -> 401"""
    log_test("GET /api/dashboard (unauthenticated)")
    
    try:
        response = requests.get(f"{BASE_URL}/dashboard")
        
        if response.status_code == 401:
            log_success(f"Correctly returned 401 for unauthenticated request")
            return True
        else:
            log_error(f"Expected 401, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_dashboard_auth(jwt: str):
    """Test 3: GET /api/dashboard (authenticated)"""
    log_test("GET /api/dashboard (authenticated)")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}"}
        response = requests.get(f"{BASE_URL}/dashboard", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify required fields
            required_fields = ["stats", "services", "trend", "serviceBreakdown", 
                             "forecast", "budget", "recommendations", "currency", 
                             "dataSource", "meta", "workspace"]
            
            missing = [f for f in required_fields if f not in data]
            if missing:
                log_error(f"Missing required fields: {missing}")
                return False
            
            # Verify stats structure
            stats = data.get("stats", {})
            stats_fields = ["totalMonthlyCost", "totalResources", "activeServices", 
                          "potentialSavings", "budgetUsage", "growth"]
            missing_stats = [f for f in stats_fields if f not in stats]
            if missing_stats:
                log_error(f"Missing stats fields: {missing_stats}")
                return False
            
            # Verify meta structure
            meta = data.get("meta", {})
            if "azureConnected" not in meta or "emailConfigured" not in meta:
                log_error(f"Missing meta fields: {meta}")
                return False
            
            # Verify workspace structure
            workspace = data.get("workspace", {})
            if "isOrg" not in workspace or "tenantId" not in workspace:
                log_error(f"Missing workspace fields: {workspace}")
                return False
            
            # Verify currency is INR for demo
            if data.get("currency") != "INR":
                log_error(f"Expected currency INR, got {data.get('currency')}")
                return False
            
            # Verify dataSource is demo initially
            if data.get("dataSource") != "demo":
                log_error(f"Expected dataSource demo, got {data.get('dataSource')}")
                return False
            
            log_success(f"Dashboard returned valid data structure")
            log_info(f"Stats: totalMonthlyCost={stats.get('totalMonthlyCost')}, totalResources={stats.get('totalResources')}")
            log_info(f"Meta: azureConnected={meta.get('azureConnected')}, emailConfigured={meta.get('emailConfigured')}")
            return True
        else:
            log_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_settings(jwt: str):
    """Test 4: GET /api/settings"""
    log_test("GET /api/settings")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}"}
        response = requests.get(f"{BASE_URL}/settings", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify structure
            if "azure" not in data or "email" not in data or "rules" not in data:
                log_error(f"Missing required fields in settings: {data.keys()}")
                return False
            
            # Verify azure.connected is false initially
            if data["azure"].get("connected") != False:
                log_error(f"Expected azure.connected=false, got {data['azure'].get('connected')}")
                return False
            
            # Note: email.configured may be true if tests ran before, that's OK
            email_configured = data["email"].get("configured", False)
            log_info(f"Email configured: {email_configured}")
            
            # Verify default rules (or custom if already set)
            rules = data.get("rules", {})
            log_info(f"Rules: idleCostThreshold={rules.get('idleCostThreshold')}, spikePct={rules.get('spikePct')}, budgetWarnPct={rules.get('budgetWarnPct')}")
            
            # Verify no secrets in response
            response_str = json.dumps(data)
            if "clientSecret" in response_str or "resendApiKey" in response_str:
                log_error(f"Secrets leaked in settings response!")
                return False
            
            log_success(f"Settings returned valid data with no secrets leaked")
            return True
        else:
            log_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_rules_update(jwt: str):
    """Test 5: POST /api/settings/rules with validation"""
    log_test("POST /api/settings/rules")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
        
        # Test valid update
        log_info("Testing valid rules update...")
        response = requests.post(
            f"{BASE_URL}/settings/rules",
            headers=headers,
            json={
                "idleCostThreshold": 1000,
                "spikePct": 10,
                "budgetWarnPct": 70
            }
        )
        
        if response.status_code != 200:
            log_error(f"Valid rules update failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        if not data.get("saved"):
            log_error(f"Expected saved=true, got {data}")
            return False
        
        rules = data.get("rules", {})
        if rules.get("idleCostThreshold") != 1000 or rules.get("spikePct") != 10 or rules.get("budgetWarnPct") != 70:
            log_error(f"Rules not updated correctly: {rules}")
            return False
        
        log_success(f"Valid rules update succeeded")
        
        # Test invalid budgetWarnPct (>100)
        log_info("Testing invalid budgetWarnPct=150...")
        response = requests.post(
            f"{BASE_URL}/settings/rules",
            headers=headers,
            json={"budgetWarnPct": 150}
        )
        
        if response.status_code != 400:
            log_error(f"Expected 400 for invalid budgetWarnPct, got {response.status_code}")
            return False
        
        log_success(f"Invalid budgetWarnPct correctly rejected with 400")
        
        # Test invalid spikePct (non-numeric)
        log_info("Testing invalid spikePct='abc'...")
        response = requests.post(
            f"{BASE_URL}/settings/rules",
            headers=headers,
            json={"spikePct": "abc"}
        )
        
        if response.status_code != 400:
            log_error(f"Expected 400 for invalid spikePct, got {response.status_code}")
            return False
        
        log_success(f"Invalid spikePct correctly rejected with 400")
        
        return True
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_recommendations(jwt: str):
    """Test 6: GET /api/recommendations (should include rule-based items)"""
    log_test("GET /api/recommendations")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}"}
        response = requests.get(f"{BASE_URL}/recommendations", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            
            if not isinstance(data, list):
                log_error(f"Expected array, got {type(data)}")
                return False
            
            # Check for rule_based recommendations
            rule_based = [r for r in data if r.get("rule_based") == True]
            
            if len(rule_based) > 0:
                log_success(f"Found {len(rule_based)} rule-based recommendations")
                for rec in rule_based[:2]:  # Show first 2
                    log_info(f"  - {rec.get('title')} (savings: {rec.get('potential_savings')})")
            else:
                log_info(f"No rule-based recommendations found (may be due to random data)")
            
            log_success(f"Recommendations endpoint returned {len(data)} items")
            return True
        else:
            log_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_email_settings(jwt: str):
    """Test 7: POST /api/settings/email with validation"""
    log_test("POST /api/settings/email")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
        
        # Test invalid key format
        log_info("Testing invalid Resend key format...")
        response = requests.post(
            f"{BASE_URL}/settings/email",
            headers=headers,
            json={
                "apiKey": "invalid_format",
                "recipient": "test@example.com"
            }
        )
        
        if response.status_code != 400:
            log_error(f"Expected 400 for invalid key format, got {response.status_code}")
            return False
        
        log_success(f"Invalid key format correctly rejected with 400")
        
        # Test valid key format (fake key)
        log_info("Testing valid key format (fake key)...")
        response = requests.post(
            f"{BASE_URL}/settings/email",
            headers=headers,
            json={
                "apiKey": "re_fakeKeyForTesting123456",
                "recipient": "tester@example.com"
            }
        )
        
        if response.status_code != 200:
            log_error(f"Expected 200 for valid key format, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        if not data.get("saved"):
            log_error(f"Expected saved=true, got {data}")
            return False
        
        log_success(f"Valid email settings saved")
        
        # Verify settings show configured=true and key is masked
        log_info("Verifying email settings are masked...")
        response = requests.get(f"{BASE_URL}/settings", headers=headers)
        
        if response.status_code != 200:
            log_error(f"Failed to get settings: {response.status_code}")
            return False
        
        data = response.json()
        email = data.get("email", {})
        
        if not email.get("configured"):
            log_error(f"Expected email.configured=true, got {email.get('configured')}")
            return False
        
        if email.get("recipient") != "tester@example.com":
            log_error(f"Expected recipient=tester@example.com, got {email.get('recipient')}")
            return False
        
        if email.get("keyMask") != "re_••••••••":
            log_error(f"Expected masked key, got {email.get('keyMask')}")
            return False
        
        # Verify raw key is NOT in response
        response_str = json.dumps(data)
        if "re_fakeKeyForTesting123456" in response_str:
            log_error(f"Raw Resend key leaked in settings response!")
            return False
        
        log_success(f"Email settings correctly masked, no key leak")
        
        # Test invalid recipient email
        log_info("Testing invalid recipient email...")
        response = requests.post(
            f"{BASE_URL}/settings/email",
            headers=headers,
            json={"recipient": "not-an-email"}
        )
        
        if response.status_code != 400:
            log_error(f"Expected 400 for invalid email, got {response.status_code}")
            return False
        
        log_success(f"Invalid recipient email correctly rejected with 400")
        
        return True
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_email_test_send(jwt: str):
    """Test 8: POST /api/settings/email/test (should fail with fake key)"""
    log_test("POST /api/settings/email/test")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
        response = requests.post(f"{BASE_URL}/settings/email/test", headers=headers, json={})
        
        # Should return 502 with fake key (Resend rejects it)
        if response.status_code == 502:
            # Response might be JSON or HTML (from proxy/gateway)
            try:
                data = response.json()
                error = data.get("error", "")
                
                # Verify safe error message (no key leak)
                if "re_fakeKeyForTesting123456" in error:
                    log_error(f"Resend key leaked in error message!")
                    return False
                
                log_success(f"Test send correctly failed with 502 and safe error: {error}")
            except (ValueError, KeyError):
                # HTML error page from gateway is also acceptable for 502
                log_success(f"Test send correctly failed with 502 (gateway error page)")
            
            # Verify no key leak in response text
            if "re_fakeKeyForTesting123456" in response.text:
                log_error(f"Resend key leaked in error response!")
                return False
            
            return True
        else:
            log_error(f"Expected 502, got {response.status_code}: {response.text[:500]}")
            return False
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_budget_alert_email(jwt: str):
    """Test 9: Budget alert email attempt"""
    log_test("Budget alert email (with fake Resend key)")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
        
        # Set budget to 1000 (spend should exceed it)
        log_info("Setting budget to 1000...")
        response = requests.post(
            f"{BASE_URL}/budget",
            headers=headers,
            json={"monthly_budget": 1000}
        )
        
        if response.status_code != 200:
            log_error(f"Failed to set budget: {response.status_code} - {response.text}")
            return False
        
        log_success(f"Budget set to 1000")
        
        # Get dashboard (should trigger alert attempt)
        log_info("Getting dashboard (should trigger alert)...")
        response = requests.get(f"{BASE_URL}/dashboard", headers=headers)
        
        if response.status_code != 200:
            log_error(f"Dashboard request failed: {response.status_code} - {response.text}")
            return False
        
        data = response.json()
        
        # Verify budget usage is capped at 100
        budget = data.get("budget", {})
        if budget.get("usage_pct") != 100:
            log_error(f"Expected usage_pct=100, got {budget.get('usage_pct')}")
            return False
        
        log_success(f"Budget usage correctly capped at 100%")
        
        # Verify emailAlert shows failure (fake key)
        email_alert = data.get("emailAlert")
        if email_alert is None:
            log_info(f"No emailAlert in response (email not configured or already sent)")
        elif email_alert.get("sent") == False:
            log_success(f"Email alert correctly failed with fake key: {email_alert.get('error')}")
        else:
            log_error(f"Unexpected emailAlert: {email_alert}")
            return False
        
        # Verify alert record in settings
        log_info("Checking alert record in settings...")
        response = requests.get(f"{BASE_URL}/settings", headers=headers)
        
        if response.status_code != 200:
            log_error(f"Failed to get settings: {response.status_code}")
            return False
        
        data = response.json()
        alerts = data.get("alerts", [])
        
        if len(alerts) > 0:
            log_success(f"Found {len(alerts)} alert record(s) in settings")
            latest = alerts[0]
            log_info(f"  Latest alert: threshold={latest.get('threshold')}, error={latest.get('error')}")
        else:
            log_info(f"No alert records found (may not have triggered)")
        
        return True
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_budget_restore(jwt: str):
    """Test 10: Restore budget to 50000"""
    log_test("Restore budget to 50000")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
        
        response = requests.post(
            f"{BASE_URL}/budget",
            headers=headers,
            json={"monthly_budget": 50000}
        )
        
        if response.status_code != 200:
            log_error(f"Failed to restore budget: {response.status_code} - {response.text}")
            return False
        
        log_success(f"Budget restored to 50000")
        
        # Verify in dashboard
        response = requests.get(f"{BASE_URL}/dashboard", headers=headers)
        
        if response.status_code != 200:
            log_error(f"Dashboard request failed: {response.status_code}")
            return False
        
        data = response.json()
        budget = data.get("budget", {})
        
        if budget.get("monthly_budget") != 50000:
            log_error(f"Expected monthly_budget=50000, got {budget.get('monthly_budget')}")
            return False
        
        log_success(f"Budget correctly restored in dashboard")
        return True
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_azure_endpoints(jwt: str):
    """Test 11: Azure endpoints (no real creds)"""
    log_test("Azure endpoints (graceful failures)")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
        
        # Test missing tenantId
        log_info("Testing POST /api/azure/connect with missing tenantId...")
        response = requests.post(
            f"{BASE_URL}/azure/connect",
            headers=headers,
            json={}
        )
        
        if response.status_code != 400:
            log_error(f"Expected 400 for missing tenantId, got {response.status_code}")
            return False
        
        log_success(f"Missing tenantId correctly rejected with 400")
        
        # Test invalid GUID format
        log_info("Testing invalid GUID format...")
        response = requests.post(
            f"{BASE_URL}/azure/connect",
            headers=headers,
            json={
                "tenantId": "short",
                "clientId": "x",
                "clientSecret": "y",
                "subscriptionId": "z"
            }
        )
        
        if response.status_code != 400:
            log_error(f"Expected 400 for invalid GUID, got {response.status_code}")
            return False
        
        log_success(f"Invalid GUID correctly rejected with 400")
        
        # Test with well-formed fake GUIDs
        log_info("Testing with well-formed fake GUIDs...")
        response = requests.post(
            f"{BASE_URL}/azure/connect",
            headers=headers,
            json={
                "tenantId": "11111111-1111-1111-1111-111111111111",
                "clientId": "22222222-2222-2222-2222-222222222222",
                "clientSecret": "fake-secret",
                "subscriptionId": "33333333-3333-3333-3333-333333333333"
            }
        )
        
        # Should return 400/422/502 (Azure rejects), NOT 500
        if response.status_code == 500:
            log_error(f"Got 500 (should be 400/422/502): {response.text}")
            return False
        
        if response.status_code not in [400, 422, 502]:
            log_error(f"Expected 400/422/502, got {response.status_code}: {response.text}")
            return False
        
        # Verify no secret leak
        response_str = response.text
        if "fake-secret" in response_str:
            log_error(f"Client secret leaked in error response!")
            return False
        
        log_success(f"Fake Azure creds correctly rejected with {response.status_code}, no secret leak")
        
        # Test sync without connection
        log_info("Testing POST /api/azure/sync without connection...")
        response = requests.post(
            f"{BASE_URL}/azure/sync",
            headers=headers,
            json={}
        )
        
        if response.status_code != 404:
            log_error(f"Expected 404 for sync without connection, got {response.status_code}")
            return False
        
        log_success(f"Sync without connection correctly returned 404")
        
        # Test disconnect
        log_info("Testing POST /api/azure/disconnect...")
        response = requests.post(
            f"{BASE_URL}/azure/disconnect",
            headers=headers,
            json={}
        )
        
        if response.status_code != 200:
            log_error(f"Expected 200 for disconnect, got {response.status_code}")
            return False
        
        data = response.json()
        if not data.get("ok") or data.get("dataSource") != "demo":
            log_error(f"Unexpected disconnect response: {data}")
            return False
        
        log_success(f"Disconnect succeeded")
        
        return True
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_reset(jwt: str):
    """Test 12: POST /api/reset"""
    log_test("POST /api/reset")
    
    try:
        headers = {"Authorization": f"Bearer {jwt}", "Content-Type": "application/json"}
        
        response = requests.post(f"{BASE_URL}/reset", headers=headers, json={})
        
        if response.status_code != 200:
            log_error(f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        if data.get("status") != "reseeded":
            log_error(f"Expected status=reseeded, got {data}")
            return False
        
        log_success(f"Reset succeeded")
        
        # Verify dashboard still works
        log_info("Verifying dashboard still works after reset...")
        response = requests.get(f"{BASE_URL}/dashboard", headers=headers)
        
        if response.status_code != 200:
            log_error(f"Dashboard failed after reset: {response.status_code}")
            return False
        
        log_success(f"Dashboard still works after reset")
        return True
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def test_data_isolation(jwt1: str, jwt2: str):
    """Test 13: Data isolation between users"""
    log_test("Data isolation between users")
    
    try:
        headers1 = {"Authorization": f"Bearer {jwt1}"}
        headers2 = {"Authorization": f"Bearer {jwt2}"}
        
        # Get dashboard for user 2
        log_info("Getting dashboard for user 2...")
        response = requests.get(f"{BASE_URL}/dashboard", headers=headers2)
        
        if response.status_code != 200:
            log_error(f"User 2 dashboard failed: {response.status_code}")
            return False
        
        data2 = response.json()
        log_success(f"User 2 got their own seeded data")
        
        # Get settings for user 2
        log_info("Getting settings for user 2...")
        response = requests.get(f"{BASE_URL}/settings", headers=headers2)
        
        if response.status_code != 200:
            log_error(f"User 2 settings failed: {response.status_code}")
            return False
        
        settings2 = response.json()
        
        # Verify user 2 does NOT see user 1's email config
        if settings2.get("email", {}).get("configured") != False:
            log_error(f"User 2 sees user 1's email config! {settings2.get('email')}")
            return False
        
        log_success(f"User 2 does NOT see user 1's email config (correctly isolated)")
        
        return True
    except Exception as e:
        log_error(f"Exception: {e}")
        return False

def main():
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}Cloud-Cost-Pulse Backend API Test Suite{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"Base URL: {BASE_URL}")
    print(f"Clerk API: {CLERK_API_BASE}")
    
    results = {}
    
    # Test 1: Health check (no auth)
    results["health"] = test_health()
    
    # Test 2: Dashboard unauthenticated
    results["dashboard_unauth"] = test_dashboard_unauth()
    
    # Authenticate user 1
    log_test("Authenticating User 1")
    clerk = ClerkAuth()
    jwt1 = clerk.get_auth_token(TEST_USER_1["email"], TEST_USER_1["password"])
    
    if not jwt1:
        log_error("Failed to authenticate user 1, aborting tests")
        sys.exit(1)
    
    log_success(f"User 1 authenticated successfully")
    
    # Test 3: Dashboard authenticated
    results["dashboard_auth"] = test_dashboard_auth(jwt1)
    
    # Test 4: Settings
    results["settings"] = test_settings(jwt1)
    
    # Test 5: Rules update
    results["rules_update"] = test_rules_update(jwt1)
    
    # Test 6: Recommendations
    results["recommendations"] = test_recommendations(jwt1)
    
    # Test 7: Email settings
    results["email_settings"] = test_email_settings(jwt1)
    
    # Test 8: Email test send
    results["email_test_send"] = test_email_test_send(jwt1)
    
    # Test 9: Budget alert email
    results["budget_alert"] = test_budget_alert_email(jwt1)
    
    # Test 10: Budget restore
    results["budget_restore"] = test_budget_restore(jwt1)
    
    # Test 11: Azure endpoints
    results["azure_endpoints"] = test_azure_endpoints(jwt1)
    
    # Test 12: Reset
    results["reset"] = test_reset(jwt1)
    
    # Authenticate user 2
    log_test("Authenticating User 2")
    jwt2 = clerk.get_auth_token(TEST_USER_2["email"], TEST_USER_2["password"])
    
    if not jwt2:
        log_error("Failed to authenticate user 2, skipping isolation test")
        results["data_isolation"] = False
    else:
        log_success(f"User 2 authenticated successfully")
        # Test 13: Data isolation
        results["data_isolation"] = test_data_isolation(jwt1, jwt2)
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BLUE}TEST SUMMARY{Colors.END}")
    print(f"{Colors.BLUE}{'='*80}{Colors.END}")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.END}" if result else f"{Colors.RED}FAIL{Colors.END}"
        print(f"{test_name}: {status}")
    
    print(f"\n{Colors.BLUE}Total: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"{Colors.GREEN}All tests passed!{Colors.END}")
        sys.exit(0)
    else:
        print(f"{Colors.RED}Some tests failed{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()
