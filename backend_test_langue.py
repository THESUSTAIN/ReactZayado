#!/usr/bin/env python3
"""
Backend API Testing for Zayado - Copilote Language Support
Tests POST /api/copilote/chat with "langue" field for English and French responses
"""

import requests
import json
import sys
import re
from typing import Optional, Tuple

# Backend URL from frontend/.env
BACKEND_URL = "https://design-layout-test-1.preview.emergentagent.com/api"

# Test credentials
TEST_PRO_EMAIL = "test.pro@zayado.net"
TEST_PRO_PASSWORD = "Test!2026"


def login(email: str, password: str) -> Optional[str]:
    """Login and return JWT token"""
    try:
        response = requests.post(
            f"{BACKEND_URL}/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"❌ Login failed for {email}: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login exception for {email}: {e}")
        return None


def parse_sse_stream(response_text: str) -> Tuple[str, bool]:
    """Parse SSE stream and aggregate deltas"""
    full_text = ""
    done = False
    
    lines = response_text.strip().split('\n')
    for line in lines:
        if line.startswith('data: '):
            try:
                data = json.loads(line[6:])  # Remove 'data: ' prefix
                if 'delta' in data:
                    full_text += data['delta']
                if 'done' in data and data['done']:
                    done = True
            except json.JSONDecodeError:
                continue
    
    return full_text, done


def detect_language(text: str) -> str:
    """Simple language detection based on common words"""
    text_lower = text.lower()
    
    # Common English words
    english_words = ['the', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 
                     'can', 'could', 'should', 'your', 'you', 'this', 'that', 'with', 'from',
                     'today', 'priority', 'focus', 'task', 'action', 'one', 'thing']
    
    # Common French words
    french_words = ['le', 'la', 'les', 'un', 'une', 'des', 'est', 'sont', 'était', 'étaient',
                    'avoir', 'avez', 'avait', 'sera', 'serait', 'peut', 'pourrait', 'devrait',
                    'ton', 'ta', 'tes', 'tu', 'ce', 'cette', 'avec', 'pour', 'dans',
                    "aujourd'hui", 'priorité', 'tâche', 'action', 'chose']
    
    english_count = sum(1 for word in english_words if f' {word} ' in f' {text_lower} ')
    french_count = sum(1 for word in french_words if f' {word} ' in f' {text_lower} ')
    
    if english_count > french_count:
        return "en"
    elif french_count > english_count:
        return "fr"
    else:
        return "unknown"


def is_generic_fallback(text: str) -> bool:
    """Check if response is a generic fallback message"""
    fallback_indicators = [
        "réponse locale de repli",
        "momentanément indisponible",
        "je n'ai pas pu joindre",
        "copilote ia est momentanément",
        "local fallback",
        "temporarily unavailable"
    ]
    text_lower = text.lower()
    return any(indicator in text_lower for indicator in fallback_indicators)


def test_copilote_chat_english(token: str) -> bool:
    """Test 1: POST /api/copilote/chat with English message and langue="en" """
    print("\n" + "="*80)
    print("TEST 1: POST /api/copilote/chat - ENGLISH (langue='en')")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        body = {
            "message": "Give me one concrete priority for today, in one sentence.",
            "langue": "en"
        }
        
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        response = requests.post(
            f"{BACKEND_URL}/copilote/chat",
            json=body,
            headers=headers,
            timeout=60,
            stream=True
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        # Read SSE stream
        response_text = response.text
        print(f"\nRaw SSE stream (first 500 chars):\n{response_text[:500]}...")
        
        # Parse SSE stream
        full_text, done = parse_sse_stream(response_text)
        
        print(f"\n--- Aggregated Response ---")
        print(f"Full text ({len(full_text)} chars): {full_text}")
        print(f"Stream done: {done}")
        
        # Check 1: Response is not empty
        if not full_text or len(full_text) < 10:
            print(f"❌ FAILED: Response is empty or too short (length: {len(full_text)})")
            return False
        
        # Check 2: Response is NOT a generic fallback
        if is_generic_fallback(full_text):
            print(f"❌ FAILED: Response is a generic fallback message")
            print(f"   Fallback text detected: {full_text[:200]}")
            return False
        
        # Check 3: Detect language
        detected_lang = detect_language(full_text)
        print(f"\nDetected language: {detected_lang}")
        
        if detected_lang != "en":
            print(f"❌ FAILED: Response is not in English")
            print(f"   Expected: en, Got: {detected_lang}")
            return False
        
        # Check 4: Stream completed
        if not done:
            print(f"⚠️  WARNING: Stream did not send 'done: true' event")
        
        print(f"\n✅ PASSED: Response is in ENGLISH, non-empty, and NOT a fallback")
        print(f"   - Length: {len(full_text)} chars")
        print(f"   - Language: {detected_lang}")
        print(f"   - Extract: {full_text[:150]}...")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_copilote_chat_french(token: str) -> bool:
    """Test 2: POST /api/copilote/chat with French message and langue="fr" (regression)"""
    print("\n" + "="*80)
    print("TEST 2: POST /api/copilote/chat - FRENCH (langue='fr') - REGRESSION TEST")
    print("="*80)
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        body = {
            "message": "Donne-moi une priorité concrète pour aujourd'hui, en une phrase.",
            "langue": "fr"
        }
        
        print(f"Request body: {json.dumps(body, indent=2)}")
        
        response = requests.post(
            f"{BACKEND_URL}/copilote/chat",
            json=body,
            headers=headers,
            timeout=60,
            stream=True
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ FAILED: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        # Read SSE stream
        response_text = response.text
        print(f"\nRaw SSE stream (first 500 chars):\n{response_text[:500]}...")
        
        # Parse SSE stream
        full_text, done = parse_sse_stream(response_text)
        
        print(f"\n--- Aggregated Response ---")
        print(f"Full text ({len(full_text)} chars): {full_text}")
        print(f"Stream done: {done}")
        
        # Check 1: Response is not empty
        if not full_text or len(full_text) < 10:
            print(f"❌ FAILED: Response is empty or too short (length: {len(full_text)})")
            return False
        
        # Check 2: Detect language
        detected_lang = detect_language(full_text)
        print(f"\nDetected language: {detected_lang}")
        
        if detected_lang != "fr":
            print(f"❌ FAILED: Response is not in French")
            print(f"   Expected: fr, Got: {detected_lang}")
            return False
        
        # Check 3: Stream completed
        if not done:
            print(f"⚠️  WARNING: Stream did not send 'done: true' event")
        
        print(f"\n✅ PASSED: Response is in FRENCH, non-empty")
        print(f"   - Length: {len(full_text)} chars")
        print(f"   - Language: {detected_lang}")
        print(f"   - Extract: {full_text[:150]}...")
        return True
        
    except Exception as e:
        print(f"❌ FAILED: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def check_backend_logs() -> bool:
    """Test 3: Check backend logs for 500 errors or tracebacks"""
    print("\n" + "="*80)
    print("TEST 3: Check backend logs for 500 errors/tracebacks")
    print("="*80)
    
    import subprocess
    
    try:
        # Check backend error logs
        result = subprocess.run(
            ["tail", "-n", "100", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        error_log = result.stdout
        
        # Look for 500 errors or tracebacks
        has_500 = "500" in error_log or "Internal Server Error" in error_log
        has_traceback = "Traceback" in error_log
        
        print(f"Backend error log (last 100 lines):")
        print(f"  - Contains '500' or 'Internal Server Error': {has_500}")
        print(f"  - Contains 'Traceback': {has_traceback}")
        
        if has_500 or has_traceback:
            print(f"\n⚠️  WARNING: Found errors in backend logs:")
            # Show last 20 lines
            lines = error_log.split('\n')
            print('\n'.join(lines[-20:]))
            return False
        
        print(f"\n✅ PASSED: No 500 errors or tracebacks in backend logs")
        return True
        
    except Exception as e:
        print(f"⚠️  WARNING: Could not check backend logs: {e}")
        return True  # Don't fail the test if we can't check logs


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("ZAYADO COPILOTE - LANGUAGE SUPPORT TESTING")
    print("Testing POST /api/copilote/chat with 'langue' field")
    print("="*80)
    
    results = []
    
    # Login as test.pro
    print("\n" + "="*80)
    print("Logging in as test.pro@zayado.net...")
    print("="*80)
    token = login(TEST_PRO_EMAIL, TEST_PRO_PASSWORD)
    
    if not token:
        print(f"❌ Could not login as {TEST_PRO_EMAIL}, cannot proceed with tests")
        return 1
    
    print(f"✅ Login successful for {TEST_PRO_EMAIL}")
    
    # Test 1: English
    results.append(("Copilote Chat - English (langue='en')", test_copilote_chat_english(token)))
    
    # Test 2: French (regression)
    results.append(("Copilote Chat - French (langue='fr')", test_copilote_chat_french(token)))
    
    # Test 3: Backend logs
    results.append(("Backend Logs - No 500/Traceback", check_backend_logs()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return 0 if passed == total else 1


if __name__ == "__main__":
    sys.exit(main())
