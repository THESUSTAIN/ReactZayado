# PRD — Zayado / MyExtension AI (reprise)

## Contexte
Projet existant : backend FastAPI (SQLAlchemy async, SQLite dev / MySQL-Postgres prod), frontend React (CRA/craco), plugin WordPress admin, extension Chrome MV3, site public Vite. Prod : Railway + Hostinger/MySQL.

## Session 1 (2026-08-10) — installé + fonctionnel en preview
- Backend + frontend tournent sous supervisor, SQLite `zayado.db`, login OK.
- Comptes : admin@zayado.net / ZayadoAdmin2026! ; thomas@zayado.fr / Thomas2026!
- Fix plugin WP : POST /api/admin/users/{id}/credits accepte {amount} ET {credits}. Panneau admin validé (11/11).

## Session 2 (2026-08-10) — clés branchées + fiabilité P0
### Clés branchées dans backend/.env
Brevo, Mammouth (MAMMOTH+MAMMOUTH), Google OAuth, Microsoft OAuth, WA_SERVICE_SECRET, Unsplash.
### Corrections
- **#5 Lien magique idempotent** — verify-link : anti-rejeu remplacé par fenêtre de grâce (120s) → StrictMode/refresh ré-émettent la session (200/200) au lieu de 401 → plus de ?error=link_failed. Testé (2 appels = 200).
- **#28 Brevo** — clé réelle branchée ; send_brevo_email renvoie un message-id smtp-relay.mailin.fr (plus de 401). Les 401 en logs dataient d'avant.
- **#7 Score Business** — DÉJÀ figé & documenté dans cet export (routes/vision_brain.py `_collect_metrics`), plancher démo retiré. Confirmé.
- **E1 content.js** — DÉJÀ implémenté dans cet export (lit Gmail/Calendar/Outlook, remonte au side-panel). Confirmé.

## État réel de l'extension (audité dans le code)
- E1 ✅ (content.js miroir Gmail/Agenda/Outlook) · E2 ✅ (auth prod email + pont externally_connectable) · E3 ✅ (manifest domaines prod, sidepanel DEFAULT_API=app.zayado.net, URL preview retirée) · E4 ✅ (actions tâche/opportunité/note/CRM via /features/captures + page-context) · E10 ✅ (permissions restreintes, pas de <all_urls>)
- **E5 ❌ RESTE** : pas d'EventSource/SSE dans l'extension pour recevoir les updates OS en temps réel.
- E7 RESTE : publication Chrome Web Store + politique de confidentialité.

## Backlog restant (priorisé)
### P0 mocks (clés dispo) : OAuth Google/MS branchement complet (redirect prod), Mollie (clé test), Web Push VAPID envoi câblé, Agent Prospection réel.
### P0 fiabilité restant : #6 migration PostgreSQL prod validée. #8 cartes latérales Cockpit (bug vs voulu).
### P1 : E5 SSE extension ; #14 coût IA (routing multi-modèles + cache + budget/plan) ; #15 métriques activation/rétention exploitables ; #16 JSON IA stable (déjà schéma pydantic) + questions IA (déjà présentes) ; #17 digest RSS réel.
### Non négociable scale : RGPD prospection (whitelist/opt-in/journal/purge — purge partielle via _gdpr_purge_loop) ; Sécurité (audit JWT ok jti/revocation, rate-limit ok ; RESTE secrets mgmt + chiffrement au repos) ; Observabilité (health+app_logs ok ; RESTE monitoring/alerting/SLA) ; Tests CI (à câbler couverture réelle).
### Design/UX : onboarding "aha" <60s (spec fournie : barre 6 segments, ÉTAPE x/6, BIENVENUE or, CTA pilule or #F2B93B) ; design system formalisé ; micro-interactions temps réel ; a11y.

## Session 3 (2026-08-10) — HeyGen + News-Reprise + Rôles + E5 SSE (14/14 tests OK)
- **HeyGen** : `routes/heygen_routes.py` câblé (X-Zayado-Secret) + page plugin "Vidéo IA (HeyGen)" (class-heygen.php, proxy admin-ajax) + champ secret dans Config. Manque HEYGEN_API_KEY (renvoie 500 propre en attendant).
- **News-Reprise** : `routes/news_reprise.py` — inbound (webhook secret) + submit/list/approve/reject (JWT admin). IA reformule au nom de Zayado, brouillon +72h, notif email. Page plugin class-news-reprise.php. Testé (rewrite OK, +72h).
- **Rôles plugin** : capacité `zayado_content` + rôle `zayado_commercial` ; menu par capacité (contenu = Génération IA/HeyGen/Emails/News-Reprise ; reste = manage_options).
- **E5 SSE extension** : sidepanel.js ouvre EventSource sur /api/vision/events/stream, carte "Cockpit en direct" (score + flash) mise à jour sur card_update/tick.
- Zip plugin à jour : /app/zayado-admin-v2.zip + {PREVIEW}/downloads/zayado-admin-v2.zip. WP_CONNECTOR_SECRET généré dans .env.
- À FAIRE côté user : fournir HEYGEN_API_KEY, coller WP_CONNECTOR_SECRET dans le plugin, redéployer backend Railway avec les nouvelles env vars.

## Session 4 (2026-08-10) — Gel notifications + Citations + Due-diligence
- **Gel notifications** : notif_gate.py + POST/GET /api/admin/notifications/gate. hold=true → broadcast renvoie null + push bloqués (seule la dernière mémorisée) ; hold=false → réactive + renvoie la dernière. Page plugin class-notifications.php. Testé 13/13.
- **Citations** : routes/inspiration.py (jeux christian/secular, current rotation 0h + upcoming 30j, CRUD, seed auto). Page plugin class-inspiration.php. Testé.
- Zip plugin v2 mis à jour (10 pages, rôles). Build frontend prod OK (479KB).

## Verdict due-diligence (investisseur) : NON prêt pour levée majeure, OUI démo seed/Series-A
Blocants DD à corriger (2-4 semaines) : #30 CI/CD ABSENT (.github inexistant dans l'export), #6 pas de migrations Alembic (schéma ad-hoc), #29 observabilité absente (Sentry/logs/alerting), tests (110 fichiers) non câblés en CI, README VIDE, #14 gouvernance coût IA absente, #26 RGPD prospection partielle, mocks P0 (OAuth/Mollie/Push réels) non validés e2e, #8 cartes cockpit vides en démo. Aucun n'est un cul-de-sac architectural.

## Demandes plugin/produit encore en attente de GO
- Gestion notifications (blocage global pendant correction, seule la dernière renvoyée à la réactivation).
- Citations d'inspiration (voir celles qui démarrent dans 30j + l'actuelle passant à 0h, jeux chrétien/non-chrétien paramétrables).
- Connecteur HeyGen (zip + heygen_routes.py fournis) à intégrer dans le plugin admin. [FAIT session 3]
- Gestion notifications : blocage global pendant correction (seule la dernière renvoyée à la réactivation).
- Citations d'inspiration : voir celles qui démarrent dans 30j + l'actuelle passant à 0h, jeux chrétien / non-chrétien paramétrables.
- Workflow Brevo "news-reprise@zayado.net" : IA reformule le mail concurrent au nom de Zayado → brouillon Brevo daté (+72h) → mail de notif "un mail a été réajusté".
- Filtrage des rôles dans le plugin : commercial/communication = accès Heyzine/articles/contenu uniquement ; le reste = admin.

## Session 5-6 (2026-08-10) — Docs deploy + Audit UX A→Z + corrections
- Docs créées : backend/.env.example, RAILWAY_DEPLOY.md, INSTALL_PLUGIN.md, INSTALL_EXTENSION.md, .github/workflows/ci.yml, README.md.
- Audit UX complet compte Thomas (iteration_5). Corrections (iteration_6, 100% OK) :
  - FIX PATCH /api/tasks/{id} : upsert idempotent (plus de 404 sur priorités du jour).
  - FIX GET /api/roadmap : endpoint public ajouté (plus de 404).
  - FIX modales tuto ('mode d'emploi' + checklist) : plus d'auto-ouverture pour Thomas/admin (1re impression investisseur nette).
- Bug portabilité MySQL corrigé (VARCHAR(36) PK) sur news_reprise_drafts + inspiration_quotes.

## Encore À FAIRE (demandé, non fait cette session — gros chantiers)
- Coût IA (#14) en admin : routing multi-modèles + cache SWOT/scores + budgets/plan + dashboard coût. (api_costs table existe déjà → agrégation à exposer)
- Observabilité (#29) en admin : dashboard erreurs/logs (app_logs existe) + alerting.
- Pages plugin correspondantes (class-ai-cost.php, class-observability.php).
