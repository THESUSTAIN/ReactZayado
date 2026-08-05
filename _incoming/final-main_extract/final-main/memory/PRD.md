# PRD / Contexte — Projet « MyExtension AI » (repo: Zayado)

## Problème initial
Installer le projet `final-main.zip` en local (lecture seule, sans toucher la prod Railway), puis livrer un audit technique honnête (investisseur + dev senior), module par module (verdict + 5 suggestions), et répondre : « comprend-on immédiatement ce qu'est myextension ? ».

## Réalité découverte
- **PAS une extension navigateur** (aucun manifest MV3). C'est un **SaaS B2B cockpit IA** pour indépendants/TPE. « MyExtension » = marque uniquement.
- Stack : Backend **FastAPI + SQLAlchemy async** (MySQL prod / **SQLite** dev — PAS Mongo). Frontend **React 19 (CRA)**. `public-site` **React 18 + Vite**. Intégration **WordPress headless**. LLM via proxy **Mammouth**. Déploiement **Railway** (Dockerfile + nixpacks).
- Volumétrie : ~67 routers backend, ~36k LOC, 909 lignes models, 64 tables, 106 fichiers de tests, 2 frontends.

## Installation (fait le 2026-08-04)
- Projet copié dans `/app` (backend, frontend, public-site, docs). Scaffold Mongo d'origine sauvegardé en `/app/backend_scaffold_bak` & `/app/frontend_scaffold_bak`.
- `.env` local factice créé (SQLite, clés dev). Deps installées (pip + yarn).
- ✅ Backend `/api/health` OK. ✅ Frontend compile & login s'affiche.

## Livrable
- **/app/AUDIT.md** — audit complet module par module + verdict global.

## Alertes bloquantes (P0) identifiées
1. Secrets réels commités dans `backend/env.example` (JWT_SECRET, FERNET_KEY).
2. Base client commitée `backend/zayado.db` (PII réelle : 2 users, 30 conversations).
3. 2FA non appliquée au login.
4. Migrations « maison » à chaque boot (pas d'Alembic).
5. Crons + rate-limiter in-process (doublons/contournement en multi-replica). Pas de CI/CD.

## Prochaines étapes (après feu vert user)
- Phase corrections P0 (secrets rotation + purge git, retrait DB, 2FA, .gitignore, README).
- Puis P1/P2 (Alembic, nettoyage requirements, Redis, GitHub Actions, code legacy).

## Statut
Phase build en cours. Aucune connexion prod Railway.

## CHANTIER #4 — Onboarding narratif COMPLET + fixes (VALIDÉ testing_agent iteration_7, 100%)
- 4 nouveaux chapitres: Ancrage (rappel vision), Bien-être (énergie /5), Action (3 tâches déduites), Premier document (One-Pager Vision téléchargeable .txt, bouton Drive désactivé « bientôt »).
- Recâblage écrans 8→12→13→9→10→(doSave)→14→15→11. stepMeta complété (12-15) + fallback anti-crash.
- Fix modales: classe shadcn `.dark` synchronisée sur <html> selon le thème (PrefsContext) → modales suivent le thème.
- Fix toggle thème: Header lit l'état réel du DOM (plus de `isDark` périmé) + touchedRef anti-écrasement prefs. NB: le « 1er clic perdu » observé en test = InspirationScreen post-login qui se ferme au 1er clic (comportement voulu, pas un bug).
- Login nettoyé: bouton SSO générique + panneau supprimés, croix ✝️ retirée, « Continuer avec thesustain.net » = le SSO (visible). Vérifié par screenshot.
- Fichiers: Onboarding.jsx, PrefsContext.jsx, Header.jsx, Login.jsx, App.css.

## CHANTIER #5 — Typographie + Login + Navigation (VALIDÉ testing_agent iteration_9, 100%)
- Typographie: titres en **Bricolage Grotesque** (grotesque géométrique confiante), texte Manrope conservé. App.css @import + remplacement Instrument Serif→Bricolage; tailwind display/sans mis à jour.
- Login: bouton SSO générique + panneau supprimés, croix ✝️ retirée; « Continuer avec thesustain.net » = SSO visible.
- Navigation réduite 7→6 (Croissance retirée du menu Sidebar+BottomNav; route /croissance conservée en accès direct). Automatisations déjà dans Paramètres; Simulation hors-menu (Campus plus tard).

## CHANTIER #8 — Pages publiques : SEO LP1, cohérence, vrais visuels produit (2026-08-05)
- **LP1 (page produit MyExtension AI, `/myextension-ai`)** : SEO appliqué (title « MyExtension AI — Le copilote IA des entrepreneurs | by Zayado », meta description + keywords) via les fallbacks `useWpContent` (WP non connecté ⇒ fallback code). Hero **différencié** du hub (« Le copilote IA qui transforme votre vision en actions quotidiennes ») → règle le doublon de hero Accueil/MyExtension AI.
- **Vrais visuels produit** (remplacent les photos stock Unsplash génériques, demande user) : heros `AntiBurnout` (mock check-in bien-être : énergie 7,2/10, score 75/100, charge équilibrée) et `Echeances` (mock « Le Point du jour » : TVA/URSSAF/IS + pastilles urgence + « Ouvrir dans le chat »). Mocks HTML/CSS crisp, fidèles à l'app (cohérents avec MyExtensionAI/Vision).
- **Header Expansion corrigé** : logo serif italique → « Zayado. » standard ; bouton Contact **vert (#25D366) → navy** (`ExpansionAgent.jsx`).
- **Hub Accueil** : description SEO modernisée (retrait wording legacy « extension technologique 70/30 » → copilote IA) dans `LandingHub.jsx`.
- **Tarifs vérifié = déjà correct** : `/tarifs` charge dynamiquement START(29€)/GROW(79€)/SERENITY(149€) depuis backend `/payments/plans` (source de vérité `utils.py SUBSCRIPTION_PLANS`), toggle mensuel/annuel −20%, comparateur, add-ons, FAQ. Rien à changer.
- **Route `/vision` en double supprimée** (était masquée par `Vision`). Décision (délégation user) : **aucune suppression** de page funnel live (valider/tester-son-projet, expansion-agent conservés — valeur SEO/conversion).
- **Thème clair** : fond ivoire `#F6F2EA` → `#FAFAF8` (blanchi, moins de jaune), sky-bg dédoré, surfaces plus blanches (App.css `.ambiance-clarte`).
- Vérifié : `yarn build` public-site OK + captures locales (localhost:4173) des heros + Expansion + cockpit clair.


## CHANTIER #7 — Pages d'atterrissage Ads (public-site) + typo + thème (2026-08-05)
- **Thème clair** : `--app-navy` (boutons pleins primaires) avait été passé au doré `#C9A449` → boutons jaunes moches en clair. Restauré au navy `#14213d` dans `.ambiance-clarte` (App.css). Doré = accent uniquement.
- **Typographie harmonisée** (titres = Bricolage Grotesque, corps = Manrope) : VisionBoard `.vb-title` Manrope → Bricolage (vision.css) ; tous les vestiges d'`Instrument Serif` remplacés (BienEtre.jsx, Croissance.jsx, Settings.jsx, PricingScreen.jsx, NotFound.jsx).
- **Landing pages Ads** (public-site, Vite/React 18, style Zayado : ZayadoLayout + tokens Tailwind + Helmet SEO + section sécurité RGPD) :
  - `/anti-burnout` (`AntiBurnout.jsx`) — angle anti-surcharge.
  - `/echeances` (`Echeances.jsx`) — angle « zéro échéance ratée » (aligné avec Le Point du jour).
  - Accueil (`/` LandingHub) + `/vision` existaient déjà. Routes câblées dans `main.jsx`.
- **Nettoyage legacy** : 14 pages `src/pages/legacy/` mortes (0 réf) supprimées ; conservées les 7 utilisées par PublicBoutique + partners-theme.js.
- Vérifié : `yarn build` public-site OK ; captures des 2 landings via `vite preview` (localhost:4173).
- NB : `public-site` n'est PAS servi sur l'URL de preview (app principale = port 3000). Vérif visuelle via preview local uniquement.


## CHANTIER #6 — « Le Point du jour » + retrait Mode Focus (2026-08-05, vérifié screenshots)
- **Fix bloquant** : `CockpitGreeting.jsx` avait une balise JSX corrompue (retrait raté du bouton Focus par le fork précédent) → app ne compilait plus. Corrigé.
- **Bouton « Mode Focus » retiré** du `Header.jsx` (icône ✨ / event `zayado:show-inspiration`).
- **« Le Point du jour »** (a4 combiné) :
  - Backend `growth_copilote.py` : `GET /api/growth/daily-brief` (moteur de règles FIXE pour échéances FR : TVA 24, URSSAF mensuel/trimestriel, IS, CFE, IR — aucune hallucination LLM, dates indicatives) + rappels réels (user_tasks). `POST /api/growth/work-request` (demande de collab → email équipe best-effort).
  - Frontend : `DailyBrief.jsx` (bannière Cockpit, masquable/jour) → clic → ouvre le chat co-pilote pré-rempli avec le brief (`CockpitChat.jsx` écoute `zayado:open-cockpit-chat` avec `detail.brief`).
  - CTA « Travailler avec l'équipe sur mon projet » dans le chat : WhatsApp (config publique) + envoi d'une demande à l'équipe.
  - Résumé/dialogue = via le chat (`/copilote`, LLM). Échéances = règles, pas LLM.
- Fichiers : `backend/routes/growth_copilote.py`, `frontend/src/lib/api.js`, `frontend/src/components/DailyBrief.jsx` (nouveau), `Dashboard.jsx`, `CockpitChat.jsx`, `Header.jsx`, `CockpitGreeting.jsx`.

## PROCHAIN CHANTIER (app puis pages publiques)
- Fin phase app: Pricing unifié (crédits cachés) · Brief « Le Point du jour » · Drive OAuth réel · fusion contenu Croissance→onglet Travail (optionnel).
- Puis pages publiques (landing Ads), puis Zayado (espace+marketplace), puis Campus.

## CHANTIER #3 — Thème clair brandé (VALIDÉ testing_agent iteration_5, 100%)
- `.ambiance-clarte` (App.css) surcharge désormais les tokens `--app-*` (bg ivoire #F6F2EA, texte navy #14213d, cartes blanc chaud, bordure navy subtile, accent doré profond #B0851F) — corrige l'illisibilité (texte blanc sur fond clair des modules Cockpit/Bien-être/Simulation).
- `.ambiance-clarte .sky-bg` = dégradé ivoire chaud (au lieu du bleu-blanc générique).
- Sombre non régressé. Fichier: frontend/src/App.css.

## CHANTIER #2 — Correction couche inspiration 3→2 univers (VALIDÉ iteration_4, 100%)
- Étape inspiration réduite à 2 univers : « Sagesse & Sens » (semence, tous) + « Foi » (chrétien opt-in). Carte « Clarté » retirée, imports nettoyés.

## CHANTIER #1 — Onboarding narratif + couche Sens/Foi (2026-08-04, VALIDÉ testing_agent iteration_3, 100%)
- Slides réécrites (Vision-first, one-liner « copilote qui transforme votre vision en actions », Zayado=écosystème / MyExtension=outil).
- Nouvelle étape **Vision** : champ « Pourquoi profond » (form.pourquoi → settings.why).
- Inspiration = **3 univers** : Clarté / Sens (semence universelle) / **Foi (chrétien)** avec verset biblique + lien « i » → thesustain.net/bible (target _blank). Ajouté aussi dans Paramètres.
- Univers Foi → déclenche `wellnessApi.seedChristianHabits()` (best-effort, PAS appelé pour les autres).
- Backend inchangé (features.py POST /onboarding acceptait déjà ambiance/why/spirituality). Persistance vérifiée en SQLite.
- Fichiers: frontend/src/components/Onboarding.jsx, frontend/src/lib/onboardingData.js, frontend/src/pages/Settings.jsx.
- Dette notée: Onboarding.jsx ~600 lignes (à découper — dans ROADMAP). Réordonnancement complet 6-chapitres (Analyse→Ancrage→Bien-être→Action→1er doc) = itération suivante.

## Corrections appliquées (2026-08-04, après feu vert user)
Bug signalé + corrigé et VALIDÉ testing_agent (iteration_1 & iteration_2):
- **Bug bouton vert « Thomas »** : cause = PUBLIC_FRONTEND_URL=localhost dans .env → dev_link injoignable. Fix = URL preview. PASS.
Corrections P0 audit (VALIDÉES testing_agent iteration_2, 100%):
1. **Secrets** : rotation JWT_SECRET/FERNET_KEY (.env local) + env.example assaini (placeholders, plus de vrais secrets).
2. **.gitignore** : ajout `*.db`, `*.sqlite*`, `backend/zayado.db`, `backend/admin_config.json`, `backend/uploads/`, `backend/generated_images/`.
3. **README.md** racine : vrai README produit (pitch, archi, run, sécurité).
4. **Rebrand** produit : « Zayado »→« MyExtension IA » (titre FastAPI, emails welcome). « by Zayado » conservé (maison mère).
5. **CI/CD** : `.github/workflows/ci.yml` (gitleaks + ruff + pip-audit + pytest + build front).
6. **Magic-link usage unique** (anti-rejeu jti) + garde StrictMode frontend (AuthContext window.__magicConsuming).
7. **2FA réellement appliquée** sur /login (mot de passe) + nouvel endpoint /auth/login/verify-2fa.

## RESTE À FAIRE (non appliqué — action user requise ou risqué)
- **Purge historique git** des secrets + `zayado.db` (git filter-repo/BFG) → action git, à faire par le user.
- **Rotation des vrais secrets en PROD Railway** (les anciens ont fuité via env.example).
- **Nettoyage requirements.txt** (retirer motor/pymongo, extras optionnels) → à faire via pip freeze contrôlé.
- **Alembic** (remplacer les ALTER TABLE de démarrage).
- **Refactor** des pages géantes (VisionBoard 2292, Croissance 1194, Settings 1041 lignes).
- **Crons hors process web** (verrou multi-replica) + **Redis** pour rate-limiter/quotas.
- **Chiffrement au repos** des données santé (module Bien-être) + clés API tierces.
