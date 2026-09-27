#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================
user_problem_statement: "Zayado (FastAPI+React) — ajout logo dans les e-mails (wordmark bleu) et vérification que tous les e-mails fonctionnent ; + suppression des crédits et 3 programmes partenaires (parrainage/ambassadeur/affiliation)."

backend:
  - task: "E-mails : en-tête logo bleu commun (_email_wrap) + validateur de sécurité"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Ajout _email_wrap() (logo bleu sur fond clair) appliqué au lien magique (/api/connexion/lien), à la validation de décision, à la notification collaborateur et à l'e-mail de bienvenue. EMAIL_LOGO_URL par défaut https://app.zayado.net/logo-zayado-bleu.png. Vérifié en-process que les 3 templates passent _assert_safe_email. NOTE: aucune clé e-mail (EMERGENT_EMAIL_KEY/BREVO_API_KEY) en preview → l'envoi réel ne part pas ; /api/connexion/lien renvoie {envoye:false, lien_direct} en non-prod. À vérifier : l'endpoint /api/connexion/lien répond 200 avec la bonne structure et ne crashe pas."
        -working: true
        -agent: "testing"
        -comment: "✅ TESTED via /app/backend_test.py - POST /api/connexion/lien fonctionne correctement. Répond 200 avec {envoye:false, lien_direct:'https://app.zayado.net/login?token=...'} comme attendu (pas de clé e-mail en preview, comportement normal). Validation email invalide (sans @) renvoie bien 400. Aucun champ 'credits' détecté dans les réponses."
  - task: "Programmes partenaires (parrainage/ambassadeur/affiliation) + suppression crédits"
    implemented: true
    working: false
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Nouveaux endpoints: GET /api/programmes (public, 3 programmes + 4 paliers), GET /api/programmes/mon-programme, POST /api/programmes/demander, GET /api/admin/programmes, POST /api/admin/programmes/{id}/valider, POST /api/admin/programmes/{id}/payer. Crédits retirés (remplacés par mois_offerts_dus + solde_commission). Codes promo -> mois offerts. Testé en-process (8/8). À revérifier via l'API live."
        -working: false
        -agent: "testing"
        -comment: "❌ CRITICAL: POST /api/parrainage/inviter renvoie 500 (IntegrityError). CAUSE: Migration DB incomplète - la table 'referrals' contient encore la colonne 'bonus_credits' (INTEGER NOT NULL) qui devrait être supprimée. Le modèle SQLAlchemy a été correctement mis à jour (recompense_type + recompense_valeur) mais le schéma DB n'a pas été migré. TESTS RÉUSSIS: ✅ GET /api/programmes (3 programmes + 4 paliers), ✅ POST /api/auth/register, ✅ GET /api/programmes/mon-programme (code_parrainage généré, solde_commission=0, mois_offerts_dus=0), ✅ POST /api/programmes/demander (ambassadeur), ✅ Validation programme invalide (422). Aucun champ 'credits' dans les réponses JSON. FIX REQUIS: Supprimer la colonne 'bonus_credits' de la table 'referrals' ou recréer la DB avec le nouveau schéma."

frontend:
  - task: "Logo (favicon Z bleu + wordmark blanc header) + page /programmes"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/Programmes.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Non testé automatiquement (attendre accord user pour tests frontend)."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Programmes partenaires (parrainage/ambassadeur/affiliation) + suppression crédits"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Tester le BACKEND uniquement via l'URL externe (NEXT_PUBLIC_BASE_URL)/api — le frontend React (port 3000) proxifie /api vers FastAPI (port 8001). Focus: (1) e-mails: POST /api/connexion/lien {email, origin:'https://app.zayado.net'} doit répondre 200 avec {envoye:false, lien_direct:'https://app.zayado.net/login?token=...'} (pas de clé e-mail en preview, c'est normal, ne PAS considérer l'absence d'envoi comme un échec). (2) Programmes: GET /api/programmes (public) = 3 programmes + 4 paliers; créer un compte via POST /api/auth/register {email,password}, récupérer access_token, puis GET /api/programmes/mon-programme (Bearer) = programme 'parrainage' + code_parrainage généré; POST /api/programmes/demander {programme:'ambassadeur'} = 200. Comptes de test dans /app/memory/test_credentials.md (mdp Test!2026)."
    -agent: "testing"
    -message: "Tests backend complétés via /app/backend_test.py. RÉSULTATS: ✅ E-mails (POST /api/connexion/lien) fonctionne parfaitement. ✅ Programmes publics (GET /api/programmes) OK. ✅ Inscription (POST /api/auth/register) OK. ✅ Mon-programme (GET /api/programmes/mon-programme) OK avec code_parrainage généré. ✅ Demander programme (POST /api/programmes/demander) OK. ❌ CRITIQUE: POST /api/parrainage/inviter échoue avec 500 (IntegrityError: NOT NULL constraint failed: referrals.bonus_credits). CAUSE: Migration DB incomplète - la colonne 'bonus_credits' existe encore dans la table 'referrals' avec contrainte NOT NULL, alors que le code SQLAlchemy a été correctement mis à jour (recompense_type + recompense_valeur). FIX: Supprimer la colonne 'bonus_credits' de la table 'referrals' ou recréer la DB. Aucun champ 'credits' détecté dans les réponses JSON (régression OK)."

