#!/usr/bin/env python3
"""
Test backend Zayado - Auto-detection de langue du Copilote
Test rapide: le Copilote doit répondre dans la langue DU MESSAGE de l'utilisateur (détection auto).
"""
import requests
import json
import sys
import os

# Backend URL from frontend/.env
BACKEND_URL = "https://design-layout-test-1.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "test.pro@zayado.net"
TEST_PASSWORD = "Test!2026"

def login(email, password):
    """Login and return JWT token"""
    url = f"{BACKEND_URL}/auth/login"
    payload = {"email": email, "password": password}
    print(f"\n🔐 Login: POST {url}")
    print(f"   Payload: {payload}")
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print(f"   ✅ Token obtained: {token[:20]}...")
                return token
            else:
                print(f"   ❌ No access_token in response: {data}")
                return None
        else:
            print(f"   ❌ Login failed: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return None

def test_copilote_chat(token, message, expected_language):
    """Test POST /api/copilote/chat with SSE streaming"""
    url = f"{BACKEND_URL}/copilote/chat"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {"message": message}
    
    print(f"\n📨 Test Copilote Chat ({expected_language})")
    print(f"   POST {url}")
    print(f"   Message: {message}")
    print(f"   Expected language: {expected_language}")
    
    try:
        response = requests.post(url, json=payload, headers=headers, stream=True, timeout=60)
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ Failed: {response.text}")
            return {
                "success": False,
                "status_code": response.status_code,
                "error": response.text,
                "detected_language": None,
                "response_text": None
            }
        
        # Parse SSE stream and aggregate deltas
        deltas = []
        done = False
        sources = None
        juridique = False
        
        print(f"   📡 Streaming response...")
        for line in response.iter_lines(decode_unicode=True):
            if line.startswith("data: "):
                data_str = line[6:]  # Remove "data: " prefix
                try:
                    data = json.loads(data_str)
                    if "delta" in data:
                        deltas.append(data["delta"])
                    elif "done" in data and data["done"]:
                        done = True
                    elif "sources" in data:
                        sources = data.get("sources")
                        juridique = data.get("juridique", False)
                except json.JSONDecodeError:
                    print(f"   ⚠️  Failed to parse JSON: {data_str}")
        
        response_text = "".join(deltas).strip()
        
        print(f"   ✅ Response received ({len(response_text)} chars)")
        print(f"   Response excerpt: {response_text[:150]}...")
        print(f"   Done flag: {done}")
        
        # Detect language from response
        detected_language = detect_language(response_text)
        print(f"   🌐 Detected language: {detected_language}")
        
        # Check if response is in expected language
        language_match = detected_language.lower() == expected_language.lower()
        
        # Check for generic fallback patterns
        is_generic = is_generic_fallback(response_text)
        
        if language_match and not is_generic and len(response_text) > 0:
            print(f"   ✅ SUCCESS: Response in {expected_language}, non-empty, not generic")
            success = True
        else:
            print(f"   ❌ FAILED:")
            if not language_match:
                print(f"      - Language mismatch: expected {expected_language}, got {detected_language}")
            if is_generic:
                print(f"      - Generic fallback detected")
            if len(response_text) == 0:
                print(f"      - Empty response")
            success = False
        
        return {
            "success": success,
            "status_code": response.status_code,
            "detected_language": detected_language,
            "response_text": response_text,
            "response_length": len(response_text),
            "done": done,
            "is_generic": is_generic,
            "language_match": language_match
        }
        
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        return {
            "success": False,
            "status_code": None,
            "error": str(e),
            "detected_language": None,
            "response_text": None
        }

def detect_language(text):
    """Simple language detection based on common words"""
    text_lower = text.lower()
    
    # French indicators
    french_words = ["le", "la", "les", "de", "du", "des", "un", "une", "est", "sont", "pour", "avec", "dans", "sur", "ton", "ta", "tes", "ce", "cette", "aujourd'hui", "priorité", "tâche"]
    french_count = sum(1 for word in french_words if f" {word} " in f" {text_lower} " or text_lower.startswith(f"{word} ") or text_lower.endswith(f" {word}"))
    
    # English indicators
    english_words = ["the", "is", "are", "your", "you", "with", "for", "and", "this", "that", "focus", "priority", "task", "today", "morning"]
    english_count = sum(1 for word in english_words if f" {word} " in f" {text_lower} " or text_lower.startswith(f"{word} ") or text_lower.endswith(f" {word}"))
    
    # Spanish indicators
    spanish_words = ["el", "la", "los", "las", "de", "del", "un", "una", "es", "son", "para", "con", "en", "tu", "tus", "este", "esta", "hoy", "prioridad", "tarea"]
    spanish_count = sum(1 for word in spanish_words if f" {word} " in f" {text_lower} " or text_lower.startswith(f"{word} ") or text_lower.endswith(f" {word}"))
    
    # Determine language
    if french_count > english_count and french_count > spanish_count:
        return "FRENCH"
    elif english_count > french_count and english_count > spanish_count:
        return "ENGLISH"
    elif spanish_count > french_count and spanish_count > english_count:
        return "SPANISH"
    else:
        # Check for specific characters
        if "ñ" in text_lower or "¿" in text or "¡" in text:
            return "SPANISH"
        elif "ç" in text_lower or "à" in text_lower or "é" in text_lower or "è" in text_lower:
            return "FRENCH"
        else:
            return "UNKNOWN"

def is_generic_fallback(text):
    """Check if response is a generic fallback"""
    text_lower = text.lower()
    fallback_patterns = [
        "réponse locale de repli",
        "momentanément indisponible",
        "service temporairement indisponible",
        "temporarily unavailable",
        "local fallback response",
        "servicio temporalmente no disponible"
    ]
    return any(pattern in text_lower for pattern in fallback_patterns)

def check_backend_logs():
    """Check backend logs for errors"""
    log_file = "/var/log/supervisor/backend.err.log"
    print(f"\n📋 Checking backend logs: {log_file}")
    
    try:
        # Get last 50 lines
        result = os.popen(f"tail -n 50 {log_file}").read()
        
        # Check for 500 errors or tracebacks
        has_500 = "500" in result
        has_traceback = "Traceback" in result
        
        if has_500 or has_traceback:
            print(f"   ❌ Errors found in logs:")
            if has_500:
                print(f"      - 500 errors detected")
            if has_traceback:
                print(f"      - Tracebacks detected")
            print(f"\n   Last 50 lines:")
            print(result)
            return False
        else:
            print(f"   ✅ No 500 errors or tracebacks in last 50 lines")
            return True
    except Exception as e:
        print(f"   ⚠️  Could not read logs: {e}")
        return None

def main():
    print("=" * 80)
    print("TEST BACKEND ZAYADO - AUTO-DETECTION LANGUE COPILOTE")
    print("=" * 80)
    
    # Login
    token = login(TEST_EMAIL, TEST_PASSWORD)
    if not token:
        print("\n❌ FAILED: Could not login")
        sys.exit(1)
    
    # Test 1: English message
    print("\n" + "=" * 80)
    print("TEST 1: ENGLISH MESSAGE")
    print("=" * 80)
    result_en = test_copilote_chat(
        token,
        "What should I focus on first this morning? One sentence.",
        "ENGLISH"
    )
    
    # Test 2: French message
    print("\n" + "=" * 80)
    print("TEST 2: FRENCH MESSAGE")
    print("=" * 80)
    result_fr = test_copilote_chat(
        token,
        "Quelle est ma priorité ce matin ? Une phrase.",
        "FRENCH"
    )
    
    # Test 3: Spanish message (bonus)
    print("\n" + "=" * 80)
    print("TEST 3: SPANISH MESSAGE (BONUS)")
    print("=" * 80)
    result_es = test_copilote_chat(
        token,
        "¿Cuál es mi prioridad hoy? Una frase.",
        "SPANISH"
    )
    
    # Check backend logs
    print("\n" + "=" * 80)
    print("BACKEND LOGS CHECK")
    print("=" * 80)
    logs_ok = check_backend_logs()
    
    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    all_success = True
    
    print("\n1️⃣  ENGLISH TEST:")
    if result_en["success"]:
        print(f"   ✅ PASSED")
        print(f"   - Status: {result_en['status_code']}")
        print(f"   - Detected language: {result_en['detected_language']}")
        print(f"   - Response length: {result_en['response_length']} chars")
        print(f"   - Excerpt: {result_en['response_text'][:100]}...")
    else:
        print(f"   ❌ FAILED")
        print(f"   - Status: {result_en.get('status_code', 'N/A')}")
        print(f"   - Error: {result_en.get('error', 'See details above')}")
        all_success = False
    
    print("\n2️⃣  FRENCH TEST:")
    if result_fr["success"]:
        print(f"   ✅ PASSED")
        print(f"   - Status: {result_fr['status_code']}")
        print(f"   - Detected language: {result_fr['detected_language']}")
        print(f"   - Response length: {result_fr['response_length']} chars")
        print(f"   - Excerpt: {result_fr['response_text'][:100]}...")
    else:
        print(f"   ❌ FAILED")
        print(f"   - Status: {result_fr.get('status_code', 'N/A')}")
        print(f"   - Error: {result_fr.get('error', 'See details above')}")
        all_success = False
    
    print("\n3️⃣  SPANISH TEST (BONUS):")
    if result_es["success"]:
        print(f"   ✅ PASSED")
        print(f"   - Status: {result_es['status_code']}")
        print(f"   - Detected language: {result_es['detected_language']}")
        print(f"   - Response length: {result_es['response_length']} chars")
        print(f"   - Excerpt: {result_es['response_text'][:100]}...")
    else:
        print(f"   ❌ FAILED (bonus test)")
        print(f"   - Status: {result_es.get('status_code', 'N/A')}")
        print(f"   - Error: {result_es.get('error', 'See details above')}")
        # Don't fail overall for bonus test
    
    print("\n4️⃣  BACKEND LOGS:")
    if logs_ok:
        print(f"   ✅ No 500 errors or tracebacks")
    elif logs_ok is False:
        print(f"   ❌ Errors found in logs")
        all_success = False
    else:
        print(f"   ⚠️  Could not check logs")
    
    print("\n" + "=" * 80)
    if all_success:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 80)
    
    sys.exit(0 if all_success else 1)

if __name__ == "__main__":
    main()
