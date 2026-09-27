#!/usr/bin/env python3
"""Tests backend Zayado via l'URL externe (NEXT_PUBLIC_BASE_URL)/api
Focus: bug fix POST /api/parrainage/inviter + flux récompense parrainage complet"""

import asyncio
import json
import os
import sys
import uuid
from datetime import datetime

import httpx
from dotenv import load_dotenv

load_dotenv("/app/.env")

BASE_URL = os.environ.get("NEXT_PUBLIC_BASE_URL", "").rstrip("/")
API_URL = f"{BASE_URL}/api"

print(f"🔍 Testing Zayado Backend API - Parrainage Fix Verification")
print(f"📍 Base URL: {BASE_URL}")
print(f"📍 API URL: {API_URL}")
print("=" * 80)


async def test_parrainage_inviter_bug_fix():
    """TEST 1 (PRIORITÉ): POST /api/parrainage/inviter - bug fix NOT NULL bonus_credits"""
    print("\n🧪 TEST 1 (BUG FIX): POST /api/parrainage/inviter")
    print("-" * 80)
    
    # Generate unique emails
    parrain_email = f"parrain_{uuid.uuid4().hex[:8]}@test.fr"
    filleul_email = f"filleul_{uuid.uuid4().hex[:8]}@test.fr"
    password = "Test!2026"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Register parrain
        try:
            print(f"✓ Step 1: Register parrain: {parrain_email}")
            response = await client.post(
                f"{API_URL}/auth/register",
                json={"email": parrain_email, "password": password}
            )
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ Registration FAILED: {response.text}")
                return False, None, None
            
            data = response.json()
            access_token = data["access_token"]
            print(f"  ✅ Parrain registered - Token: {access_token[:20]}...")
            
        except Exception as e:
            print(f"  ❌ Parrain registration FAILED: {e}")
            return False, None, None
        
        # Step 2: Invite filleul (THE BUG FIX TEST)
        try:
            print(f"\n✓ Step 2: POST /api/parrainage/inviter (BUG FIX TEST)")
            print(f"  Inviting: {filleul_email}")
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.post(
                f"{API_URL}/parrainage/inviter",
                headers=headers,
                json={"email": filleul_email}
            )
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ CRITICAL: Invitation FAILED with {response.status_code}")
                print(f"  Response: {response.text}")
                return False, None, None
            
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2)}")
            
            # Verify response structure
            assert "ok" in data, "Missing 'ok' field"
            assert data["ok"] == True, "Expected ok=true"
            assert "statut" in data, "Missing 'statut' field"
            assert data["statut"] == "en_attente", f"Expected statut='en_attente', got {data['statut']}"
            
            print("  ✅ BUG FIX VERIFIED: POST /api/parrainage/inviter works (no 500 error)")
            print(f"     - ok: {data['ok']}")
            print(f"     - statut: {data['statut']}")
            
        except Exception as e:
            print(f"  ❌ CRITICAL: Invitation FAILED: {e}")
            return False, None, None
        
        # Step 3: Verify nb_filleuls increased to 1
        try:
            print("\n✓ Step 3: GET /api/programmes/mon-programme (verify nb_filleuls=1)")
            headers = {"Authorization": f"Bearer {access_token}"}
            response = await client.get(f"{API_URL}/programmes/mon-programme", headers=headers)
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ Mon-programme FAILED: {response.text}")
                return False, None, None
            
            data = response.json()
            print(f"  Response keys: {list(data.keys())}")
            
            assert "nb_filleuls" in data, "Missing 'nb_filleuls' field"
            assert data["nb_filleuls"] == 1, f"Expected nb_filleuls=1, got {data['nb_filleuls']}"
            
            print("  ✅ Nb_filleuls verification PASSED")
            print(f"     - nb_filleuls: {data['nb_filleuls']}")
            print(f"     - mois_offerts_dus: {data.get('mois_offerts_dus', 0)}")
            print(f"     - nb_filleuls_actifs: {data.get('nb_filleuls_actifs', 0)}")
            
        except Exception as e:
            print(f"  ❌ Nb_filleuls verification FAILED: {e}")
            return False, None, None
    
    return True, parrain_email, filleul_email


async def test_parrainage_reward_flow(parrain_email: str, filleul_email: str):
    """TEST 2: Flux récompense parrainage complet"""
    print("\n🧪 TEST 2: FLUX RÉCOMPENSE PARRAINAGE COMPLET")
    print("-" * 80)
    
    password = "Test!2026"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Login parrain to get token
        try:
            print(f"✓ Step 1: Login parrain: {parrain_email}")
            response = await client.post(
                f"{API_URL}/auth/login",
                json={"email": parrain_email, "password": password}
            )
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ Login FAILED: {response.text}")
                return False
            
            data = response.json()
            parrain_token = data["access_token"]
            print(f"  ✅ Parrain logged in - Token: {parrain_token[:20]}...")
            
        except Exception as e:
            print(f"  ❌ Parrain login FAILED: {e}")
            return False
        
        # Step 2: Register filleul (activation du parrainage)
        try:
            print(f"\n✓ Step 2: Register filleul: {filleul_email}")
            print("  (This should activate the referral and credit the parrain)")
            response = await client.post(
                f"{API_URL}/auth/register",
                json={"email": filleul_email, "password": password}
            )
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ Filleul registration FAILED: {response.text}")
                return False
            
            data = response.json()
            print(f"  ✅ Filleul registered - Token: {data['access_token'][:20]}...")
            
        except Exception as e:
            print(f"  ❌ Filleul registration FAILED: {e}")
            return False
        
        # Step 3: Verify parrain's rewards (mois_offerts_dus=1, nb_filleuls_actifs=1)
        try:
            print("\n✓ Step 3: Verify parrain's rewards")
            print("  Expected: mois_offerts_dus=1, nb_filleuls_actifs=1")
            headers = {"Authorization": f"Bearer {parrain_token}"}
            response = await client.get(f"{API_URL}/programmes/mon-programme", headers=headers)
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ Mon-programme FAILED: {response.text}")
                return False
            
            data = response.json()
            print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            # Verify rewards
            mois_offerts = data.get("mois_offerts_dus", 0)
            nb_actifs = data.get("nb_filleuls_actifs", 0)
            
            print(f"\n  📊 Parrain rewards:")
            print(f"     - mois_offerts_dus: {mois_offerts} (expected: 1)")
            print(f"     - nb_filleuls_actifs: {nb_actifs} (expected: 1)")
            print(f"     - nb_filleuls: {data.get('nb_filleuls', 0)}")
            
            if mois_offerts != 1:
                print(f"  ❌ FAILED: mois_offerts_dus should be 1, got {mois_offerts}")
                return False
            
            if nb_actifs != 1:
                print(f"  ❌ FAILED: nb_filleuls_actifs should be 1, got {nb_actifs}")
                return False
            
            print("  ✅ REWARD FLOW VERIFIED: Parrain received 1 mois offert")
            
        except Exception as e:
            print(f"  ❌ Reward verification FAILED: {e}")
            return False
    
    return True


async def test_regression_programmes():
    """TEST 3: Régression - GET /api/programmes"""
    print("\n🧪 TEST 3 (RÉGRESSION): GET /api/programmes")
    print("-" * 80)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(f"{API_URL}/programmes")
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ FAILED: {response.text}")
                return False
            
            data = response.json()
            
            # Verify structure
            assert "programmes" in data, "Missing 'programmes' field"
            assert "paliers_affiliation" in data, "Missing 'paliers_affiliation' field"
            
            programmes = data["programmes"]
            paliers = data["paliers_affiliation"]
            
            print(f"  Programmes count: {len(programmes)} (expected: 3)")
            print(f"  Paliers count: {len(paliers)} (expected: 4)")
            
            # Verify 3 programmes
            assert len(programmes) == 3, f"Expected 3 programmes, got {len(programmes)}"
            programme_keys = [p["cle"] for p in programmes]
            assert "parrainage" in programme_keys, "Missing 'parrainage'"
            assert "ambassadeur" in programme_keys, "Missing 'ambassadeur'"
            assert "affiliation" in programme_keys, "Missing 'affiliation'"
            
            # Verify 4 paliers
            assert len(paliers) == 4, f"Expected 4 paliers, got {len(paliers)}"
            palier_keys = [p["cle"] for p in paliers]
            assert "bronze" in palier_keys, "Missing 'bronze'"
            assert "argent" in palier_keys, "Missing 'argent'"
            assert "or" in palier_keys, "Missing 'or'"
            assert "diamant" in palier_keys, "Missing 'diamant'"
            
            print("  ✅ REGRESSION TEST PASSED")
            print(f"     - Programmes: {', '.join(programme_keys)}")
            print(f"     - Paliers: {', '.join(palier_keys)}")
            
            return True
            
        except Exception as e:
            print(f"  ❌ FAILED: {e}")
            return False


async def test_regression_connexion_lien():
    """TEST 4: Régression - POST /api/connexion/lien"""
    print("\n🧪 TEST 4 (RÉGRESSION): POST /api/connexion/lien")
    print("-" * 80)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{API_URL}/connexion/lien",
                json={"email": "demo@test.fr", "origin": "https://app.zayado.net"}
            )
            print(f"  Status: {response.status_code}")
            
            if response.status_code != 200:
                print(f"  ❌ FAILED: {response.text}")
                return False
            
            data = response.json()
            print(f"  Response keys: {list(data.keys())}")
            
            # Verify structure
            assert "envoye" in data, "Missing 'envoye' field"
            assert data["envoye"] == False, "Expected envoye=false (no email key in preview)"
            assert "lien_direct" in data, "Missing 'lien_direct' field"
            assert data["lien_direct"].startswith("https://app.zayado.net/login?token="), \
                f"Invalid lien_direct format: {data['lien_direct']}"
            
            print("  ✅ REGRESSION TEST PASSED")
            print(f"     - envoye: {data['envoye']}")
            print(f"     - lien_direct: {data['lien_direct'][:60]}...")
            
            return True
            
        except Exception as e:
            print(f"  ❌ FAILED: {e}")
            return False


async def main():
    """Run all tests"""
    print(f"\n🚀 Starting Backend Tests - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    results = {
        "parrainage_inviter_bug_fix": False,
        "parrainage_reward_flow": False,
        "regression_programmes": False,
        "regression_connexion_lien": False,
    }
    
    # TEST 1: Bug fix - POST /api/parrainage/inviter
    success, parrain_email, filleul_email = await test_parrainage_inviter_bug_fix()
    results["parrainage_inviter_bug_fix"] = success
    
    # TEST 2: Reward flow (only if TEST 1 passed)
    if success and parrain_email and filleul_email:
        results["parrainage_reward_flow"] = await test_parrainage_reward_flow(parrain_email, filleul_email)
    else:
        print("\n⚠️  Skipping TEST 2 (reward flow) - TEST 1 failed")
    
    # TEST 3: Regression - GET /api/programmes
    results["regression_programmes"] = await test_regression_programmes()
    
    # TEST 4: Regression - POST /api/connexion/lien
    results["regression_connexion_lien"] = await test_regression_connexion_lien()
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"  {test_name}: {status}")
    
    print("-" * 80)
    print(f"  Total: {total} | Passed: {passed} | Failed: {failed}")
    print("=" * 80)
    
    if failed > 0:
        print("\n❌ Some tests FAILED")
        sys.exit(1)
    else:
        print("\n✅ All tests PASSED")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
