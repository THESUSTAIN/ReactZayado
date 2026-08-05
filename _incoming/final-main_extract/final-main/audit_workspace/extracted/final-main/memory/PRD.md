
## Actions réalisées (3 août 2026 — session installation + corrections)

### Installation / run
- Zip `final-main.zip` réinstallé dans `/app` (backend, frontend, public-site, Dockerfile, nixpacks, railway.json).
- Backend deps installées (`pip install -r requirements.txt`), frontend `yarn install`.
- `backend/.env` recréé (SQLite dev, JWT/FERNET, CORS ciblé, FRONTEND_URL = preview).
- Supervisor backend+frontend OK (health 200).

### Bug déploiement / CORS corrigé (bloquant)
- `CORS_ORIGINS='*'` + `allow_credentials=True` => les navigateurs bloquent les
  requêtes authentifiées (wildcard interdit avec credentials). Corrigé: CORS_ORIGINS
  = URL exacte du frontend. En prod, `env.example` liste déjà les domaines zayado.net.
- Railway "Build Failed ... _legacy/app-main/WhatsApp-service ... lstat _legacy: no such file":
  = lien symbolique cassé dans le dépôt connecté à Railway (absent du zip propre).
  Le codebase propre build correctement (`yarn build` OK). `.dockerignore` durci
  (_legacy/, *.bak, WhatsApp-service/). Recommandation: redéployer ce codebase propre.

### Dashboard (Cockpit) — lisibilité dark/light
- Design existant conservé (pas de refonte). Corrections de contraste light-mode
  dans `CockpitGreeting` (bouton Boutique + chips via `var(--gold-strong)` /
  `var(--glass-soft)`), variable `--gold-strong` ajoutée (clair/sombre).
- Vérifié via testing agent: dark ET light lisibles (100% pass), toggle OK.

### Google Analytics (production only)
- GA4 `G-ZV0BQGN1X6` injecté dans `frontend/public/index.html`, chargé UNIQUEMENT
  si hostname matche `*.zayado.net` (zayado.net / app.zayado.net). Absent en preview (vérifié).

### WordPress (headless)
- Docs créées: `docs/wordpress-admin-setup.md` (variables WP_BASE_URL, WP_USERNAME,
  WP_APP_PASSWORD, WP_WEBHOOK_SECRET + création Application Password) et
  `docs/wp-mu-plugin.php` (webhook d'invalidation de cache WP -> Zayado).

## Dashboard aligné sur la maquette MyExtension AI (3 août 2026)
- Dashboard.jsx restructuré pour reproduire la maquette (2 colonnes, ordre des sections).
- CONSERVÉ & réorganisé: CockpitGreeting (en-tête) ; Priorités du jour | Vision Board ;
  bandeau KPI ; Valeur générée IA | Activité récente ; Insights co-pilote.
- RETRANCHÉ (absent de la maquette): DecisionBanner, HeroEnergy, BienEtreHebdo,
  accordéon "Voir le détail" (TrajectoireCard + AlignmentScoreCard), CockpitMentorPanel (aside droit).
- Nouvelle util CSS .cockpit-2col (align-items:start, 1.25fr/1fr ; --even = 1fr/1fr).
- Vérifié visuellement en dark ET light : lisible, sans erreur de compilation.
- Fixes lisibilité onboarding: .ob-modal/.ob-loading forcent texte clair (var(--txt) ne
  vire plus au marine invisible en thème clair) ; pastilles help modal -> var(--gold-strong).

## Persistance des uploads (fix déploiement Railway) — 3 août 2026
- Les fichiers uploadés étaient écrits sur le disque du pod (perdus au redéploiement Railway).
- Nouveau `backend/storage.py` = client stockage objet Emergent (EMERGENT_LLM_KEY).
- Nouveau modèle `UploadedFile` (table uploaded_files) = référence DB (source de vérité).
- chat `/api/chat/upload` : lecture en mémoire + upload objet + réf DB ; sert via
  `/api/chat/uploads-store/{filename}`. `/api/chat/send` relit les fichiers depuis le stockage objet.
- profile `/api/documents/upload` : texte extrait persisté en base (user.settings.qa_docs), plus de disque.
- admin `/api/admin/upload-asset` : logo/favicon encodé en data URL (persiste dans la config).
- ⚠️ PROD Railway : définir EMERGENT_LLM_KEY dans les variables pour que les uploads chat fonctionnent.
- Round-trip vérifié en preview (upload -> objet -> serve HTTP 200).

## Refonte Cockpit calquée sur la maquette + responsive (3 août 2026)
- Nouveau Dashboard.jsx (ordre maquette): En-tête -> [Priorités | Vision] -> 5 KPI
  (ajout "Temps gagné (IA)") -> [Valeur générée avec l'IA | Prochaine séquence]
  -> [Focus compétences (4 anneaux) | Insights clés (3 cartes)] -> bandeau citation.
- Nouveau CockpitSections.jsx: NextSequence, SkillsFocus (anneaux dérivés de vraies
  métriques), KeyInsights, QuoteBar. Couleurs existantes conservées (var CSS).
- KpiCards.jsx: 5e carte "Temps gagné (IA)" (value_generated.time_saved_min), classe .grid-5-cards.
- CSS responsive: .cockpit-2col (2->1 col <900px), .grid-5-cards (5 desktop -> 2 mobile),
  .cockpit-insights-grid (empilé), .cockpit-quote-bar. Menu (BottomNav) NON modifié.
- Bien-être: déjà responsive (pgrid mobile-first, charts flex, SVG viewBox). Vérifié.
- Testing agent iteration_2: 100% frontend, aucun débordement horizontal (desktop+mobile),
  dark+light lisibles, sections présentes dans l'ordre. retest_needed=false.

## Cockpit — ajustements maquette (itération 3, 4 août 2026)
- SUPPRIMÉ: section "Focus compétences" (SkillsFocus retiré du Cockpit).
- Insights clés: 3 cartes CÔTE À CÔTE en pleine largeur sur PC (Opportunité/Attention/Idée),
  textes fidèles à la maquette (pas de données inventées).
- Réordonnancement via grid-template-areas (.cockpit-grid): sur MOBILE la Vision Board passe
  SOUS les Insights ; sur PC elle reste à droite des Priorités. En-tête NON modifié.
- Testing agent iteration_3: 100% frontend, aucun débordement, dark+light OK. retest_needed=false.

## RESTE À FAIRE (prochaine itération) — demandé par l'utilisateur
1. ONBOARDING "anti-écran vide": à l'inscription, forcer la saisie des infos clés
   (objectif CA, secteur, vision, etc.) dans Paramètres pour que le Cockpit ne soit jamais vide
   (comme les concurrents). Pas de données fictives.
2. PAGE BIEN-ÊTRE: corriger la disposition des sections (PC + mobile) et ajouter les sections
   manquantes par rapport à la maquette (hub "Moi").

## Session 4 août 2026 — Moteur IA priorités + refonte Bien-être (FAIT)

### 1. Bug racine onboarding corrigé (P0)
- Le frontend Onboarding.jsx postait les clés FR (prenom, secteur, objectif_90j, project_type…)
  mais le backend `OnboardingSimple` (features.py) n'acceptait que des clés EN → TOUTES les réponses
  de l'utilisateur étaient silencieusement ignorées (cause racine du Cockpit vide).
- `POST /api/onboarding` accepte désormais le vrai payload FR + compat EN, persiste dans
  user.settings (project_type, secteur, objectif_90j, projet_description, priorites, first_mission…)
  + UserOnboarding, et renvoie {type, first_mission, summary}.
- `GET /api/onboarding` renvoie project_type + first_mission + form pré-rempli.
- Vérifié via curl : données persistées et relues correctement.

### 2. Moteur IA "3 priorités du jour" (P0) — utilise MAMMOUTH AI (existant)
- `POST /api/tasks/generate` (missing_apis.py) réécrit : appelle `mammouth_client.chat()`
  (Mammouth → repli Emergent auto, EMERGENT_LLM_KEY présent) avec le contexte réel :
  type projet NET/TERRAIN + 1ère mission onboarding + outils connectés (user_connections + workspace)
  + état réel (leads/finance/vision/bien-être). Parse JSON [{label,priority,duration_min,type}].
  Dédup vs tâches existantes. Repli déterministe ancré (jamais fictif) si l'IA échoue.
- Frontend PriorityOfTheDay.jsx : auto-génère les priorités si liste vide ET onboarding terminé
  (état "L'IA prépare vos 3 priorités…"), affiche chips Priorité + durée.
- Vérifié end-to-end (curl + screenshot) : 3 priorités concrètes personnalisées générées.

### 3. Refonte page Bien-être (hub "Moi") calquée sur la maquette (P0)
- BienEtre.jsx restructuré (couleurs actuelles conservées) :
  Header ("Votre énergie est votre premier actif professionnel") →
  Row 1 : Énergie (jauge) | Verdict IA du jour | Risque de burn-out →
  "1. Check-in quotidien" (3 sélecteurs) → "2. Impact sur ma vision" | "4. Coach IA" →
  "3. Timeline énergie · 30j" → "5. Prévention burn-out" (Prévision 30j + Facteurs à surveiller).
- Données réelles uniquement (today.score, burnout.level, history, activity) ; empty states propres.
- Vérifié via screenshots (états vide + peuplé après check-in score=75).

### Maquettes de référence (assets du run)
- Cockpit : me3d1rir_image.png / eve8i4s4 / c0vmrlw1 (mobile)
- Bien-être ("Moi") : hlbt0zrw_image.png (desktop+mobile), pwug5m8e (variante "Moi" à onglets)

## Session 4 août 2026 (bis) — Responsive + onglets "Moi" + regénération IA (FAIT)

### 1. Responsive Cockpit corrigé (P0)
- Bug : sur mobile, les items de `.cockpit-grid` (min-width:auto par défaut) forçaient la piste 1fr
  à la largeur du contenu le plus large → cartes coupées à droite (KPIs, insights, vision, night recap).
- Fix (App.css) : `.cockpit-grid, .cockpit-grid > * { min-width: 0 }` + `.grid-5-cards/.vision-timeline/.cockpit-insights-grid`.
- Vérifié en 390px : `.ck-kpis` passe de 463px → 358px, plus aucun débordement horizontal.

### 2. Responsive Bien-être — déjà propre (vérifié 390px, empty + peuplé).

### 3. Hub "Moi" à onglets (P1) — Aujourd'hui / Habitudes / Sommeil
- Barre d'onglets ajoutée en tête de BienEtre.jsx (state `tab`).
- Nouveau `MoiTabs.jsx` : HabitsTab (ajout / toggle jour / streak / suppression) et
  SleepTab (durée + qualité + moyenne + graphe 14j).
- Backend `missing_apis.py` : `/api/wellness/habits` (GET/POST/toggle/DELETE) et
  `/api/wellness/sleep` (GET/POST upsert par date), tables JSON `user_habits` / `user_sleep`.
- api.js : wellnessApi.habits/addHabit/toggleHabit/removeHabit/sleep/logSleep.
- Vérifié : les 3 onglets basculent et rendent correctement (curl + UI).

### 4. Bouton "Confier à l'IA" = régénération instantanée (P1)
- PriorityOfTheDay.jsx : `confierIA()` supprime les priorités IA ouvertes puis relance
  `/api/tasks/generate` et recharge → 3 nouvelles priorités.
- Vérifié réseau : 3×DELETE → POST generate → GET, priorités renouvelées.

### 5. BONUS — bug bloquant corrigé (P0 caché)
- L'écran d'inspiration (`InspirationScreen.jsx` / `.insp2`) restait cliquable pendant son
  fondu de sortie (opacity 0 mais pointer-events actifs) → interceptait les clics sur une
  partie de la page (ex : onglet "Habitudes"). Fix : `pointerEvents: leaving ? "none" : "auto"`
  sur `.insp2` et `.insp2-content`. Vérifié : le point de l'onglet Habitudes renvoie bien le
  bouton et les 3 onglets basculent.

## Session 4 août 2026 (ter) — Onboarding informatif + fidélité maquette Bien-être (FAIT)

### 1. Onboarding : skip informatif (NON bloquant)
- Demande user : ne PAS rendre les étapes obligatoires ; juste informer que sauter une étape
  laisse l'info vide (configurable ensuite dans Paramètres).
- `SkipLink` (Onboarding.jsx) : note explicative (icône Info) + libellé « Passer cette étape
  pour l'instant » + note contextuelle par étape (profil, projet, priorités, ambiance, outils).

### 2. Fidélité maquette Bien-être (hlbt0zrw)
- Icône cœur près du titre ; sous-titre Timeline ; boutons d'action : Risque burn-out
  « Voir le détail », Impact « Voir mon Vision Board » (→/vision-board), Coach IA
  « Voir mon plan d'actions » (→/croissance), Prévention « Voir le détail et conseils ».
- Coach IA sous-titre « Recommandations personnalisées pour aujourd'hui. ».
- Ordre conforme maquette : Check-in → Impact/Coach → Timeline → Prévention → extras.
  Bloc micro-actions redondant supprimé.
- 2 écarts VOLONTAIRES (zéro donnée fictive) : check-in 3 dimensions (Sommeil = onglet dédié) ;
  timeline jour-par-jour au lieu d'intra-journalier. Vérifié desktop (screenshots).



## Session 4 août 2026 (quater) — Refonte page "Moi" premium (FAIT, testé iter6)
- Page "Bien-être" renommée "👤 Moi" partout (nav "Me"/"Moi", icône User, Header, i18n FR/EN).
- Hiérarchie premium : Hero Verdict décisionnel (grand titre éditorial + CTA) + rangée KPI (Énergie jauge | Risque burn-out) persistante au-dessus des onglets.
- Onglets : Aujourd'hui (verdict/kpi/rappels/check-in/impact/coach/timeline/prévention) · Bien-être (analyses & outils : Year in Pixels, corrélations, boutique, bilan hebdo, intégrations) · Habitudes. Onglet SOMMEIL SUPPRIMÉ (tab + logger + graphe + SleepTab).
- Carte "Corrélation Habitudes × Productivité × Bien-être" (onglet Habitudes, données réelles, empty state).
- Rappels doux in-app (MoiReminders) : matin→check-in, soir→habitudes restantes.
- Micro-animations d'entrée stagger (.moi-anim, respecte prefers-reduced-motion).
- SSO thesustain.net SIMULÉ : bouton login (login-thesustain-btn) + seed habitudes chrétiennes idempotent (POST /api/wellness/habits/seed-christian, source='thesustain', badge ✝️). Seed déclenché globalement dans App.js dès connexion SSO (pas seulement à l'ouverture de l'onglet).
- Export PDF "Bilan santé" enrichi d'une page Habitudes & régularité.
- Résultats test iter6 : backend 9/9, frontend 100% Thomas, aucune donnée fictive (81/100, 12%, 7h20 absents), régression Cockpit mobile OK (ck-kpis 358px). retest_needed:false.
- Backlog UX (non bloquant) : compte SSO neuf = 4 modales d'onboarding empilées ; modale "Pilotage mode d'emploi" du Cockpit se réaffiche (préexistant iter5).

## Session 4 août 2026 (5) — Page "Travail" + Automatisation dans Paramètres (FAIT, testé iter7)

### Décision investisseur/dev (contexte)
- Séparation stratégique validée : fil produit Vision → Travail → Automatisation → Moi.
- Rentabilité : ne pas vendre les briques (CRM/agenda banalisés) mais la PROMESSE ("staff IA que le solo ne peut pas s'offrir" + métrique "heures récupérées" + switching cost). Moat = le CONTEXTE (les agents connaissent vision, clients, énergie).
- CONFORMITÉ EU (RGPD Art.9 + AI Act) sur le croisement bien-être × travail : self-tracking B2C = hors interdiction "emotion recognition au travail" (qui vise employeur↔salarié). Règles gravées : (1) données bien-être cloisonnées dans "Moi", jamais envoyées à un tiers ; (2) suggestion jamais action auto (Art.22) ; (3) consentement explicite opt-in, OFF par défaut, révocable ; (4) privacy-by-design = argument commercial EU.

### Page "Travail" (/travail) — nouvelle, fidèle maquette, ZÉRO donnée fictive
- backend/routes/travail.py : GET /api/travail/overview (agrège projets, tâches, agenda, pipeline CRM, finances mois vs mois précédent + deltas), CRM CRUD (crm_leads : 6 stages nouveau/contacte/proposition/negociation/gagne/perdu), Agenda CRUD (crm_events, ?day=today), GET /recommendations (déterministe : leads stale >7j, dépenses récurrentes, tâches en attente). Réutilise helpers _list_rows/_insert_row… de missing_apis.
- Frontend Travail.jsx : header + "Nouveau" (menu → QuickCreate tâche/lead/RDV) + 5 onglets (Vue d'ensemble / CRM kanban / Projets / Documents / DAF IA). 5 KPI (kpi-projects/tasks/appointments/ca/marge), tâches réelles, agenda, donut pipeline SVG, perf financière, docs récents, recos IA. Empty states propres. Fix React insertBefore via key={tab}.
- Nav : "Mon Bureau" REMPLACÉ par "Travail" (BottomNav + Sidebar + i18n nav_travail FR "Travail"/EN "Work"). /bureau reste accessible (boutons goto-bureau depuis onglets Projets/Documents).
- api.js : travailApi, projectsApi, automationsApi.

### Automatisation = section DANS Paramètres (façon Emergent, PAS une page)
- backend/routes/automations.py : GET /stats (active_count, total_runs, minutes_saved, hours_saved "estimation", wellbeing_adaptive), POST /custom (brouillon depuis description NL, statut "à configurer", persiste), DELETE /custom/{id}, PUT /wellbeing-consent (consentement RGPD). Fix : _get_automations conserve désormais les automatisations custom (merge). Fix testing agent : updated_at NOT NULL sur INSERT user_data.
- Frontend components/AutomatisationSettings.jsx (section active==="automatisation" dans Settings.jsx) : KPI heures récupérées, input création NL (auto-create), liste toggle/run/delete, bloc consentement bien-être (wellbeing-consent-toggle) avec mention RGPD/AI Act.

### Tests iter7 : backend 16/16, frontend ~100% (insertBefore corrigé). retest_needed=false.
### Backlog connu (préexistant, hors périmètre) : InspirationScreen splash agressif + modale "Paramètres mode d'emploi" réapparaissent.
