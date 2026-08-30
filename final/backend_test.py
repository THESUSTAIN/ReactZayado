#!/usr/bin/env python3
"""
ZAYADO Backend API Test Suite
Tests all backend endpoints for the MyExtension Business app
"""
import requests
import json
import sys
from typing import Dict, Any

# Backend URL from frontend/.env
BASE_URL = "https://messaging-stage.preview.emergentagent.com/api"

# Test results tracking
test_results = []

def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    result = f"{status}: {test_name}"
    if details:
        result += f"\n    Details: {details}"
    print(result)
    test_results.append({"test": test_name, "passed": passed, "details": details})

def test_health():
    """Test 1: Health endpoint"""
    print("\n=== TEST 1: Health Endpoint ===")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "status" in data and data["status"] == "ok":
                log_test("GET /api/health", True, f"Status: {data.get('status')}, Mode: {data.get('mode')}")
            else:
                log_test("GET /api/health", False, f"Missing 'status: ok' in response: {data}")
        else:
            log_test("GET /api/health", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/health", False, f"Exception: {str(e)}")

def test_root():
    """Test 2: Root endpoint"""
    print("\n=== TEST 2: Root Endpoint ===")
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            log_test("GET /api/", True, f"Response: {data}")
        else:
            log_test("GET /api/", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/", False, f"Exception: {str(e)}")

def test_auth_demo():
    """Test 3: Auth demo endpoints"""
    print("\n=== TEST 3: Auth Demo ===")
    
    # Test 3a: Login with credentials
    try:
        payload = {"email": "thomas@zayado.net", "password": "x"}
        resp = requests.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "access_token" in data and "user" in data:
                log_test("POST /api/auth/login", True, f"Got access_token and user object")
            else:
                log_test("POST /api/auth/login", False, f"Missing access_token or user: {data}")
        else:
            log_test("POST /api/auth/login", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/auth/login", False, f"Exception: {str(e)}")
    
    # Test 3b: GET /api/auth/me WITHOUT Authorization header (should be 401)
    try:
        resp = requests.get(f"{BASE_URL}/auth/me", timeout=10)
        if resp.status_code == 401:
            log_test("GET /api/auth/me (no auth)", True, "Correctly returned 401 Unauthorized")
        else:
            log_test("GET /api/auth/me (no auth)", False, f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/auth/me (no auth)", False, f"Exception: {str(e)}")
    
    # Test 3c: GET /api/auth/me WITH Authorization header
    try:
        headers = {"Authorization": "Bearer demo-preview-token"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if "first_name" in data and data["first_name"] == "Thomas":
                log_test("GET /api/auth/me (with auth)", True, f"Got user object with first_name: {data['first_name']}")
            else:
                log_test("GET /api/auth/me (with auth)", False, f"Missing first_name 'Thomas': {data}")
        else:
            log_test("GET /api/auth/me (with auth)", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/auth/me (with auth)", False, f"Exception: {str(e)}")

def test_mammouth_ai_chat():
    """Test 4: Mammouth AI chat (REAL integration)"""
    print("\n=== TEST 4: Mammouth AI Chat (REAL) ===")
    
    # Test 4a: Simple message
    try:
        payload = {"message": "Donne-moi une astuce de trésorerie en une phrase."}
        resp = requests.post(f"{BASE_URL}/growth/copilote", json=payload, timeout=50)
        if resp.status_code == 200:
            data = resp.json()
            reply = data.get("reply", "")
            
            # Check if reply is REAL (not demo mode)
            is_demo = "mode démo" in reply.lower() or "clé mammouth n'est pas configurée" in reply.lower()
            is_real = len(reply) > 0 and not is_demo
            
            if is_real:
                log_test("POST /api/growth/copilote (simple)", True, 
                        f"Got REAL AI response ({len(reply)} chars): {reply[:100]}...")
            else:
                log_test("POST /api/growth/copilote (simple)", False, 
                        f"Got demo/empty response: {reply}")
        else:
            log_test("POST /api/growth/copilote (simple)", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/growth/copilote (simple)", False, f"Exception: {str(e)}")
    
    # Test 4b: With history
    try:
        payload = {
            "message": "Et pour la prospection ?",
            "history": [
                {"role": "user", "content": "Donne-moi une astuce de trésorerie."},
                {"role": "assistant", "content": "Anticipez vos flux de trésorerie sur 90 jours."}
            ]
        }
        resp = requests.post(f"{BASE_URL}/growth/copilote", json=payload, timeout=50)
        if resp.status_code == 200:
            data = resp.json()
            reply = data.get("reply", "")
            
            is_demo = "mode démo" in reply.lower() or "clé mammouth n'est pas configurée" in reply.lower()
            is_real = len(reply) > 0 and not is_demo
            
            if is_real:
                log_test("POST /api/growth/copilote (with history)", True, 
                        f"Got REAL AI response with history ({len(reply)} chars)")
            else:
                log_test("POST /api/growth/copilote (with history)", False, 
                        f"Got demo/empty response: {reply}")
        else:
            log_test("POST /api/growth/copilote (with history)", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/growth/copilote (with history)", False, f"Exception: {str(e)}")

def test_decision_cards():
    """Test 5: Decision cards (validations)"""
    print("\n=== TEST 5: Decision Cards ===")
    
    # Test 5a: GET decisions
    try:
        resp = requests.get(f"{BASE_URL}/chat/decision?session_id=test", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            decisions = data.get("decisions", [])
            
            if len(decisions) == 3:
                # Check structure of first decision
                first = decisions[0]
                required_fields = ["id", "status", "source_key", "title", "detail"]
                has_all_fields = all(field in first for field in required_fields)
                
                if has_all_fields and first["status"] == "pending":
                    log_test("GET /api/chat/decision", True, 
                            f"Got 3 decisions with correct structure. First: {first['title']}")
                else:
                    log_test("GET /api/chat/decision", False, 
                            f"Missing required fields or wrong status: {first}")
            else:
                log_test("GET /api/chat/decision", False, 
                        f"Expected 3 decisions, got {len(decisions)}")
        else:
            log_test("GET /api/chat/decision", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/chat/decision", False, f"Exception: {str(e)}")
    
    # Test 5b: POST approve decision
    try:
        payload = {"decision": "approve"}
        resp = requests.post(f"{BASE_URL}/chat/decision/dec-prospects", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "approved" and "message" in data:
                log_test("POST /api/chat/decision/dec-prospects (approve)", True, 
                        f"Status: {data['status']}, Message: {data['message'][:50]}...")
            else:
                log_test("POST /api/chat/decision/dec-prospects (approve)", False, 
                        f"Wrong status or missing message: {data}")
        else:
            log_test("POST /api/chat/decision/dec-prospects (approve)", False, 
                    f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/chat/decision/dec-prospects (approve)", False, f"Exception: {str(e)}")
    
    # Test 5c: POST defer decision
    try:
        payload = {"decision": "defer"}
        resp = requests.post(f"{BASE_URL}/chat/decision/dec-focus", json=payload, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "deferred" and "message" in data:
                log_test("POST /api/chat/decision/dec-focus (defer)", True, 
                        f"Status: {data['status']}, Message: {data['message'][:50]}...")
            else:
                log_test("POST /api/chat/decision/dec-focus (defer)", False, 
                        f"Wrong status or missing message: {data}")
        else:
            log_test("POST /api/chat/decision/dec-focus (defer)", False, 
                    f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("POST /api/chat/decision/dec-focus (defer)", False, f"Exception: {str(e)}")

def test_catch_all():
    """Test 6: Catch-all behavior for unimplemented routes"""
    print("\n=== TEST 6: Catch-all Routes (Unimplemented Integrations) ===")
    
    # Test 6a: Dashboard summary
    try:
        resp = requests.get(f"{BASE_URL}/dashboard/summary", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 0:
                log_test("GET /api/dashboard/summary (catch-all)", True, "Returns empty list []")
            else:
                log_test("GET /api/dashboard/summary (catch-all)", False, f"Expected [], got {data}")
        else:
            log_test("GET /api/dashboard/summary (catch-all)", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/dashboard/summary (catch-all)", False, f"Exception: {str(e)}")
    
    # Test 6b: News digest
    try:
        resp = requests.get(f"{BASE_URL}/growth/news-digest?user_id=test", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 0:
                log_test("GET /api/growth/news-digest (catch-all)", True, "Returns empty list []")
            else:
                log_test("GET /api/growth/news-digest (catch-all)", False, f"Expected [], got {data}")
        else:
            log_test("GET /api/growth/news-digest (catch-all)", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/growth/news-digest (catch-all)", False, f"Exception: {str(e)}")
    
    # Test 6c: Drive status
    try:
        resp = requests.get(f"{BASE_URL}/drive/status", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) == 0:
                log_test("GET /api/drive/status (catch-all)", True, "Returns empty list [] (Drive OAuth NOT implemented)")
            else:
                log_test("GET /api/drive/status (catch-all)", False, f"Expected [], got {data}")
        else:
            log_test("GET /api/drive/status (catch-all)", False, f"Expected 200, got {resp.status_code}")
    except Exception as e:
        log_test("GET /api/drive/status (catch-all)", False, f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for r in test_results if r["passed"])
    failed = sum(1 for r in test_results if not r["passed"])
    total = len(test_results)
    
    print(f"\nTotal Tests: {total}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    if failed > 0:
        print("\n❌ FAILED TESTS:")
        for r in test_results:
            if not r["passed"]:
                print(f"  - {r['test']}")
                if r["details"]:
                    print(f"    {r['details']}")
    
    print("\n" + "="*70)
    print("INTEGRATION STATUS")
    print("="*70)
    print("\n✅ FULLY FUNCTIONAL:")
    print("  - Health check (/api/health)")
    print("  - Demo authentication (/api/auth/*)")
    print("  - Mammouth AI chat (/api/growth/copilote) - REAL AI responses")
    print("  - Decision cards (/api/chat/decision) - Approve/Defer actions")
    
    print("\n⚠️  NOT IMPLEMENTED (Catch-all returns empty []):")
    print("  - Google Drive OAuth integration")
    print("  - Unsplash image integration")
    print("  - Brevo email service")
    print("  - Microsoft OAuth integration")
    print("  - Mollie payment integration")
    print("  - Dashboard summary data")
    print("  - News digest data")
    
    print("\n" + "="*70)
    
    return failed == 0

def main():
    """Run all tests"""
    print("="*70)
    print("ZAYADO BACKEND API TEST SUITE")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print("="*70)
    
    # Run all tests
    test_health()
    test_root()
    test_auth_demo()
    test_mammouth_ai_chat()
    test_decision_cards()
    test_catch_all()
    
    # Print summary
    all_passed = print_summary()
    
    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
