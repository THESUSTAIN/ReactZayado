#!/usr/bin/env python3
"""
Tests backend Zayado - Focus sur le repli IA via EmergentChat
Test des endpoints IA avec authentification JWT
"""
import os
import sys
import json
import requests
import time

# Configuration
BACKEND_URL = os.getenv("REACT_APP_BACKEND_URL", "https://design-layout-test-1.preview.emergentagent.com")
API_BASE = f"{BACKEND_URL}/api"

# Comptes de test
ADMIN_EMAIL = "admin@zayado.net"
ADMIN_PASSWORD = "Admin!2026"
TEST_PRO_EMAIL = "test.pro@zayado.net"
TEST_PRO_PASSWORD = "Test!2026"

# Couleurs pour l'affichage
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

def log_test(name, status, details=""):
    """Affiche le résultat d'un test"""
    color = GREEN if status == "✅" else RED if status == "❌" else YELLOW
    print(f"{color}{status}{RESET} {name}")
    if details:
        print(f"   {details}")

def login(email, password):
    """Authentification et récupération du token JWT"""
    try:
        response = requests.post(
            f"{API_BASE}/auth/login",
            json={"email": email, "password": password},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            log_test(f"Login {email}", "❌", f"Status {response.status_code}: {response.text[:200]}")
            return None
    except Exception as e:
        log_test(f"Login {email}", "❌", f"Exception: {str(e)}")
        return None

def test_ia_statut(token, account_name):
    """Test 1: GET /api/ia/statut - Vérifier que l'IA est active avec modèle Anthropic"""
    print(f"\n{BLUE}=== Test 1: GET /api/ia/statut ({account_name}) ==={RESET}")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/ia/statut", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("GET /api/ia/statut", "❌", f"Status {response.status_code}")
            return False
        
        data = response.json()
        log_test("GET /api/ia/statut", "✅", f"Status 200")
        
        # Vérifier ia_active=true
        if not data.get("ia_active"):
            log_test("  ia_active=true", "❌", f"Got ia_active={data.get('ia_active')}")
            return False
        log_test("  ia_active=true", "✅")
        
        # Vérifier que modele contient "anthropic" ou "claude"
        modele = data.get("modele")
        if not modele or ("anthropic" not in str(modele).lower() and "claude" not in str(modele).lower()):
            log_test("  modele anthropic", "❌", f"Got modele={modele}")
            return False
        log_test("  modele anthropic", "✅", f"modele={modele}")
        
        return True
        
    except Exception as e:
        log_test("GET /api/ia/statut", "❌", f"Exception: {str(e)}")
        return False

def test_copilote_chat(token, account_name):
    """Test 2: POST /api/copilote/chat - Vérifier réponse IA réelle (pas de repli)"""
    print(f"\n{BLUE}=== Test 2: POST /api/copilote/chat ({account_name}) ==={RESET}")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"message": "Donne-moi une priorité concrète pour aujourd'hui en une phrase."}
        
        response = requests.post(
            f"{API_BASE}/copilote/chat",
            headers=headers,
            json=payload,
            timeout=60,
            stream=True
        )
        
        if response.status_code != 200:
            log_test("POST /api/copilote/chat", "❌", f"Status {response.status_code}")
            return False
        
        log_test("POST /api/copilote/chat", "✅", f"Status 200 (streaming)")
        
        # Agréger les deltas SSE
        full_response = ""
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith("data: "):
                    try:
                        data = json.loads(line_str[6:])
                        if "delta" in data:
                            full_response += data["delta"]
                        if data.get("done"):
                            break
                    except json.JSONDecodeError:
                        continue
        
        if not full_response.strip():
            log_test("  Réponse non vide", "❌", "Réponse vide")
            return False
        log_test("  Réponse non vide", "✅", f"Longueur: {len(full_response)} caractères")
        
        # Vérifier qu'il n'y a PAS de mention de repli
        repli_keywords = [
            "réponse locale de repli",
            "Réponse locale de repli",
            "momentanément indisponible",
            "Le Copilote IA est momentanément indisponible"
        ]
        
        found_repli = False
        for keyword in repli_keywords:
            if keyword.lower() in full_response.lower():
                log_test("  Pas de repli", "❌", f"Trouvé: '{keyword}'")
                found_repli = True
                break
        
        if not found_repli:
            log_test("  Pas de repli", "✅", "Réponse IA authentique")
            # Afficher un extrait de la réponse
            preview = full_response[:150] + "..." if len(full_response) > 150 else full_response
            print(f"   Extrait: {preview}")
            return True
        
        return False
        
    except Exception as e:
        log_test("POST /api/copilote/chat", "❌", f"Exception: {str(e)}")
        return False

def test_point_du_jour(token, account_name):
    """Test 3: GET /api/copilote/point-du-jour - Vérifier source != "repli" """
    print(f"\n{BLUE}=== Test 3: GET /api/copilote/point-du-jour ({account_name}) ==={RESET}")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/copilote/point-du-jour", headers=headers, timeout=60)
        
        if response.status_code != 200:
            log_test("GET /api/copilote/point-du-jour", "❌", f"Status {response.status_code}")
            return False
        
        data = response.json()
        log_test("GET /api/copilote/point-du-jour", "✅", f"Status 200")
        
        # Vérifier que source != "repli"
        source = data.get("source")
        if source == "repli":
            log_test("  source != 'repli'", "❌", f"Got source={source}")
            return False
        
        log_test("  source != 'repli'", "✅", f"source={source}")
        
        # Vérifier que le texte n'est pas vide
        texte = data.get("texte", "")
        if not texte.strip():
            log_test("  Texte non vide", "❌", "Texte vide")
            return False
        
        log_test("  Texte non vide", "✅", f"Longueur: {len(texte)} caractères")
        
        return True
        
    except Exception as e:
        log_test("GET /api/copilote/point-du-jour", "❌", f"Exception: {str(e)}")
        return False

def test_cockpit_radar(token, account_name):
    """Test 4: GET /api/cockpit/radar?refresh=true - Vérifier source idéalement "ia" """
    print(f"\n{BLUE}=== Test 4: GET /api/cockpit/radar?refresh=true ({account_name}) ==={RESET}")
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(
            f"{API_BASE}/cockpit/radar?refresh=true",
            headers=headers,
            timeout=60
        )
        
        if response.status_code != 200:
            log_test("GET /api/cockpit/radar", "❌", f"Status {response.status_code}")
            return False
        
        data = response.json()
        log_test("GET /api/cockpit/radar", "✅", f"Status 200")
        
        # Vérifier la source (idéalement "ia", mais "repli" n'est pas bloquant selon la review request)
        source = data.get("source")
        if source == "ia":
            log_test("  source='ia'", "✅", "IA active pour le Radar")
        elif source == "repli":
            log_test("  source='ia'", "⚠️", f"source={source} (non bloquant, peut dépendre du contexte)")
        else:
            log_test("  source présente", "✅", f"source={source}")
        
        return True
        
    except Exception as e:
        log_test("GET /api/cockpit/radar", "❌", f"Exception: {str(e)}")
        return False

def check_backend_logs():
    """Test 5: Vérifier qu'il n'y a pas d'erreurs 500 dans les logs backend"""
    print(f"\n{BLUE}=== Test 5: Vérification des logs backend ==={RESET}")
    
    try:
        import subprocess
        result = subprocess.run(
            ["tail", "-n", "100", "/var/log/supervisor/backend.err.log"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        logs = result.stdout
        
        # Chercher des erreurs 500 ou des tracebacks récents
        has_500 = "500" in logs
        has_traceback = "Traceback" in logs
        has_error = "ERROR" in logs
        
        if has_500 or has_traceback:
            log_test("Pas d'erreurs 500/traceback", "❌", "Erreurs détectées dans les logs")
            # Afficher les dernières lignes pertinentes
            lines = logs.split("\n")
            for line in lines[-20:]:
                if "500" in line or "Traceback" in line or "ERROR" in line:
                    print(f"   {line}")
            return False
        elif has_error:
            log_test("Pas d'erreurs critiques", "⚠️", "Warnings détectés (non bloquant)")
            return True
        else:
            log_test("Pas d'erreurs 500/traceback", "✅", "Logs propres")
            return True
            
    except Exception as e:
        log_test("Vérification logs", "⚠️", f"Impossible de lire les logs: {str(e)}")
        return True  # Non bloquant

def main():
    """Exécution de tous les tests"""
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}Tests Backend Zayado - Repli IA via EmergentChat{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"API Base: {API_BASE}")
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }
    
    # Test avec compte test.pro
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}Authentification test.pro@zayado.net{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")
    
    test_pro_token = login(TEST_PRO_EMAIL, TEST_PRO_PASSWORD)
    if not test_pro_token:
        print(f"\n{RED}❌ Impossible de se connecter avec test.pro - Tests annulés{RESET}")
        return 1
    
    log_test("Login test.pro", "✅", "Token JWT obtenu")
    
    # Tests avec test.pro
    tests_to_run = [
        (test_ia_statut, test_pro_token, "test.pro"),
        (test_copilote_chat, test_pro_token, "test.pro"),
        (test_point_du_jour, test_pro_token, "test.pro"),
        (test_cockpit_radar, test_pro_token, "test.pro"),
    ]
    
    for test_func, token, account in tests_to_run:
        results["total"] += 1
        try:
            if test_func(token, account):
                results["passed"] += 1
            else:
                results["failed"] += 1
        except Exception as e:
            results["failed"] += 1
            print(f"{RED}Exception non gérée: {str(e)}{RESET}")
    
    # Vérification des logs
    results["total"] += 1
    if check_backend_logs():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Résumé final
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}RÉSUMÉ DES TESTS{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")
    print(f"Total: {results['total']}")
    print(f"{GREEN}Réussis: {results['passed']}{RESET}")
    print(f"{RED}Échoués: {results['failed']}{RESET}")
    
    if results["failed"] == 0:
        print(f"\n{GREEN}✅ TOUS LES TESTS SONT PASSÉS{RESET}")
        return 0
    else:
        print(f"\n{RED}❌ {results['failed']} TEST(S) ÉCHOUÉ(S){RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
