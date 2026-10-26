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
