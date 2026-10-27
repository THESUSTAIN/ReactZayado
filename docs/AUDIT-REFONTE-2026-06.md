# Audit et refonte progressive — compte rendu (juin 2026)

Guide appliqué : `Guide_audit_refonte_architecture_Zayado.md`. Rien n'a été déployé et aucune donnée de production n'a été touchée (base locale SQLite uniquement).

## A. Constats confirmés

| # | Problème | Preuve | Conséquence |
|---|---|---|---|
| 1 | `GET /api/marque` renvoie 401 sans connexion | Absent de `_ROUTES_PUBLIQUES_EXACTES` alors que `marque_ext.py` le déclare PUBLIC et que `Login.jsx` l'appelle avant connexion ; `curl` → 401 | Page de connexion et site affichaient la marque par défaut, pas celle de l'admin. 2 tests rouges. |
| 2 | Isolation des tests rompue | `conftest.py` faisait `os.environ.pop(EMERGENT_LLM_KEY…)` puis `server.py` → `load_dotenv()` rechargeait la clé de `backend/.env` | Appels IA réels pendant les tests (coût, non déterminisme) ; `test_relances` rouge. |
| 3 | 18 tests « serveur distant » mélangés à la suite autonome | Ils visent d'anciennes URL de préproduction (`kairos-vision…`, `faith-build-4…`) ou `localhost:8001` avec comptes démo ; 9 étaient des copies identiques de `tests/archive_serveur_distant/` | 86 échecs + 17 erreurs non liés au code. |
| 4 | `install_boutique_installation` appelé 2 fois | `server.py` (après `shopify_auth` puis après `prix`) ; 2 routes en double détectées sur `app.routes` | Routes dupliquées, ordre d'installation trompeur. |
| 5 | Doublon frontend `src/features/thesustain` | `diff -rq` vide avec `src/zy/features/thesustain` ; aucun import | Test `test_foi_cles.py` vérifiait la copie morte au lieu de la source active. |
| 6 | `frontend/App.tsx` et `frontend/index.css` périmés | Hors `tsconfig` (`include: ["src"]`), `index.html` charge `src/main.tsx`, contenu plus ancien | Confusion sur le fichier à modifier. |
| 7 | Test Vitest jamais exécutable | `memoireLogic.test.js` utilisait `test`/`expect` globaux (Jest/CRA), Vitest sans `globals` → « test is not defined » | Logique Mémoire non testée. |
| 8 | Fichiers locaux sensibles suivis par Git | `git ls-files` : `backend/kairos.db`, `memory/.tok_local` (JWT) | Données locales et jeton publiés sur GitHub. |
| 9 | `server.py` monolithique (7 400 lignes) | ~140 routes, modèles et logique dans un fichier | Maintenance difficile ; extraction progressive possible via le motif `install_xxx(globals())` existant. |

## B. Hypothèses à vérifier (non traitées)

- `vitrine-entreprise/` et `frontend/public/public/entreprise/` sont-ils encore servis en production ? Le README Shopify indique une redirection vers zayado.net. Vérification : logs nginx / Railway. Gardés en l'état.
- `exports/zayado-entreprise/Zayado-Entreprise-main/` : copie de référence design, sans usage par le code. Gardée.
- Les secrets présents dans l'historique Git (`kairos.db`, `.tok_local`, et clés collées dans le chat précédemment) : le retrait du suivi ne nettoie pas l'historique.

## C/D. Lots exécutés (chacun réversible par `git revert` du checkpoint)

| Lot | Modification | Fichiers |
|---|---|---|
| 1 | Isolation des tests : clés mises à `""` au lieu de `pop` | `backend/tests/conftest.py` |
| 2 | Tests serveur distant déplacés dans `archive_serveur_distant/` (copies identiques supprimées, versions plus récentes conservées) | `backend/tests/*` |
| 3 | `/api/marque` ajouté aux routes publiques | `backend/server.py` |
| 4 | Second `install_boutique_installation` retiré | `backend/server.py` |
| 5 | Doublons frontend archivés dans `archives/frontend-doublons/` (avec preuves) ; `test_foi_cles.py` pointé sur la source active | `frontend/`, `archives/`, `backend/tests/test_foi_cles.py` |
| 6 | Import explicite `vitest` dans le test Mémoire | `frontend/src/zy/features/thesustain/memoireLogic.test.js` |
| 7 | `kairos.db` et `memory/.tok_local` retirés du suivi Git (restent sur disque) + `.gitignore` ; test `test_hygiene_git.py` | `.gitignore`, `backend/tests/test_hygiene_git.py` |
| 8 | Extraction des domaines Processus et Demandes Collaborateurs hors de `server.py` (mêmes routes, tables, réponses) ; tests de caractérisation écrits et passés **sur l'ancien code** avant extraction | `backend/processus_ext.py`, `backend/demandes_collaborateur_ext.py`, `backend/server.py`, `backend/tests/test_processus_demandes.py` |

### Tests réellement exécutés

| Vérification | Avant | Après |
|---|---|---|
| `pytest backend/tests` (2 workers xdist) | 230 passés, 86 échecs, 17 erreurs, 1 ignoré | **237 passés, 0 échec**, 1 ignoré |
| `yarn typecheck` | OK | OK |
| `yarn build` | OK | OK |
| `vitest run` | 2 fichiers en échec (0 test exécuté) | 1 fichier, **8 tests passés** |
| Liste des routes (méthode + chemin, 653) | référence | **identique** (doublons en moins) |
| Tables SQLAlchemy | 107 | 107 |
| `curl` preview après redémarrage : `/api/`, `/api/marque` (sans jeton), `/api/processus`, `/api/demandes-collaborateur/mes`, `/api/auth/me` | — | 200 ; `/api/processus` sans jeton → 401 ; route admin avec compte Pro → 403 |
| Navigateur : `/login`, `/app/ma-foi`, `/app/collaborateurs` | — | pages chargées, 0 erreur JS |

Non vérifié : déploiement Railway, thème Shopify (non modifié), WhatsApp-service (non modifié), tests e2e Playwright (`tests/e2e`, nécessitent un serveur cible).

## E. Étapes suivantes proposées

1. **Rotation des secrets** (validation humaine) : `JWT_SECRET` (invalide `.tok_local` et tous les jetons existants), `SHOPIFY_CLIENT_SECRET`, Mollie, Brevo. Nettoyage d'historique Git (`git filter-repo`) seulement si nécessaire et décidé.
2. Poursuivre l'extraction de `server.py` par domaine, un lot à la fois, même méthode (candidats délimités : Agent Business, récupération du compte démo, comptes démo auto).
3. Décider du sort de `vitrine-entreprise/` et `exports/` après vérification des logs de production.
4. Avant de pousser sur GitHub/Railway : relancer `pytest`, `yarn build`, puis tester la page de connexion en production (marque).

## F. Deuxième passe (lots 9 à 12)

| Lot | Modification | Vérification ciblée |
|---|---|---|
| 9 | Agent Business → `backend/agent_business_ext.py` (republie `AgentBusiness`, `_agent_du_proprietaire`, `_consigne_agent`, `AGENTS_PAR_PLAN` dans `g` pour `agents_perso_ext` / `entreprise_assistant_ext` ; `_client_llm`, `_profil`, `_role_courant` lus à l'appel pour rester remplaçables) | `tests/test_agent_business.py` (4 tests) passé sur l'ancien code **puis** sur le nouveau |
| 10 | `/ia/statut` + `/admin/diagnostics` → `backend/diagnostics_ext.py` | Réponses JSON admin capturées avant/après : **identiques** |
| 11 | Récupération compte démo → `backend/compte_demo_ext.py` (tables lues à l'appel) | `tests/test_compte_demo.py` passé avant puis après |
| 12 | Frontend : une seule source pour la liste et les noms des offres (`OFFRES_PAYANTES`, `NOMS_OFFRES_PAYANTES` dans `zy/lib/droits.js`) ; 6 copies locales supprimées (Admin, AdminGestion, AdminEquipe, Parametres, PricingSuccess, Onboarding). Libellé admin « Aucune offre » conservé par surcharge. | `droits.test.js` (2 tests), typecheck, build, oxlint 0 erreur, navigateur : Admin › « Abonnés par offre » affiche Rêveur/Solo/Pro/Équipe/Entreprise, Réglages sans erreur JS |

Outils de contrôle ajoutés : `outils_dev/routes_snapshot.py` (liste routes + tables), `outils_dev/couplage.py <début> <fin>` (symboles d'une plage de `server.py` utilisés ailleurs).

Résultats après la passe : routes + tables **identiques** à la référence d'avant audit (commit 84fc4bd, 653 routes, 107 tables) ; pytest complet **243 passés, 0 échec** (lancé une fois, en fin de passe) ; vitest 10/10 ; build OK ; `curl` preview 200 sur les routes déplacées (Pro et admin). `server.py` : 7 412 → 6 923 lignes.

Non traité volontairement (risque non évaluable sans tests) : WhatsApp (`_get_connection` utilisé par 5 modules, `WA_SERVICE_SECRET` remplacé par les tests) et Telegram (`_tg_send` utilisé par 4 modules) — aucun test ne couvre ces flux. `zayado/AdminTunnels.tsx` garde sa table `essentielle → "Rêveur"` (choix d'affichage distinct, non fusionné).
