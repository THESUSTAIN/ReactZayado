# Zayado --- Guide d'audit et de refonte de l'architecture du SaaS

## 1. Objectif du document

Ce document sert de consigne de travail à une IA de développement
chargée d'auditer puis d'améliorer progressivement l'architecture du
projet **ReactZayado**.

L'objectif n'est pas de réécrire l'application ni de déplacer
massivement les fichiers. Il s'agit de comprendre l'architecture
réellement utilisée, d'identifier les responsabilités et sources de
vérité, puis de proposer et d'appliquer des corrections contrôlées,
testées et réversibles.

**Règle fondamentale : le code et la configuration réellement présents
dans le dépôt constituent la source de vérité.** L'arborescence fournie
est un indice d'audit, pas une preuve suffisante de l'usage ou de
l'inutilité d'un fichier.

## 2. Contexte technique observé

D'après l'arborescence transmise, le dépôt contient notamment :

-   Une application principale dans `frontend/`, avec React, TypeScript
    et Vite.
-   Un backend Python dans `backend/`, avec `server.py`, de nombreux
    modules `*_ext.py`, des modèles, des routeurs, des utilitaires et
    des tests.
-   Un service Node.js distinct dans `WhatsApp-service/`.
-   Une application de vitrine dans `vitrine-entreprise/`.
-   Une copie ou export d'application dans
    `exports/zayado-entreprise/Zayado-Entreprise-main/`, qui contient
    notamment un frontend et un backend.
-   Une boutique Shopify dans `shopify/`, avec des thèmes, des sections
    Liquid, des templates JSON, des produits et des outils.
-   Des composants et fonctionnalités répartis entre plusieurs
    répertoires du frontend, notamment `frontend/src/zy/`,
    `frontend/src/pages/`, `frontend/src/components/`,
    `frontend/src/features/` et `frontend/src/lib/`.
-   Des configurations et documents de déploiement Railway, des tests,
    des rapports de tests et des archives.
-   Des fichiers potentiellement sensibles ou locaux, notamment
    `backend/kairos.db`, `backend/assets/rh/prive.xlsx` et
    `memory/.tok_local`.

Ces éléments décrivent uniquement la structure visible dans
l'arborescence fournie. Ils ne prouvent pas, à eux seuls, que des
applications sont dupliquées, qu'un fichier est inutilisé ou qu'une
migration est sans risque.

## 2.2  Arboressance actuelle

└── ReactZayado/
    ├── .emergent/
    │   ├── emergent.yml
    │   └── markers/
    │       ├── .bootstrap-complete
    │       └── .restore-complete
    ├── .git/
    │   ├── COMMIT_EDITMSG
    │   ├── HEAD
    │   ├── config
    │   ├── description
    │   ├── hooks/
    │   │   ├── applypatch-msg.sample
    │   │   ├── commit-msg.sample
    │   │   ├── fsmonitor-watchman.sample
    │   │   ├── post-update.sample
    │   │   ├── pre-applypatch.sample
    │   │   ├── pre-commit.sample
    │   │   ├── pre-merge-commit.sample
    │   │   ├── pre-push.sample
    │   │   ├── pre-rebase.sample
    │   │   ├── pre-receive.sample
    │   │   ├── prepare-commit-msg.sample
    │   │   ├── push-to-checkout.sample
    │   │   ├── sendemail-validate.sample
    │   │   └── update.sample
    │   ├── index
    │   ├── info/
    │   │   └── exclude
    │   ├── logs/
    │   │   ├── HEAD
    │   │   └── refs/
    │   │       ├── heads/
    │   │       │   └── main
    │   │       └── remotes/
    │   │           └── origin/
    │   │               ├── HEAD
    │   │               └── main
    │   ├── objects/
    │   │   ├── 39/
    │   │   │   └── c6d56220b90e3baeb9011818f6e5d7fe9bbcb9
    │   │   ├── 4e/
    │   │   │   └── 8cacca4ef197cd574627df12db29658b72e0a3
    │   │   ├── 6a/
    │   │   │   └── 34ef79be380365dea62cd4c4c8596df334834a
    │   │   ├── 7d/
    │   │   │   └── 1e4f3d73728c5c37d57975d69a362ef206bc94
    │   │   ├── 9d/
    │   │   │   └── 477ed432ad4f0d9efa76a0bf65ebe7699b4488
    │   │   ├── ab/
    │   │   │   └── 9e2398c8715de2786310a20696248d5e17ed1b
    │   │   ├── b5/
    │   │   │   └── 6ab51e92d68463be03e2e63c96fe6993114501
    │   │   ├── e8/
    │   │   │   └── a98612ccc361a2da30ad24ec4d953706d50846
    │   │   ├── info/
    │   │   └── pack/
    │   │       ├── pack-5d98b2b03043c2ab5099841dfc830f393fec0127.idx
    │   │       ├── pack-5d98b2b03043c2ab5099841dfc830f393fec0127.pack
    │   │       └── pack-5d98b2b03043c2ab5099841dfc830f393fec0127.rev
    │   ├── packed-refs
    │   └── refs/
    │       ├── heads/
    │       │   └── main
    │       ├── remotes/
    │       │   └── origin/
    │       │       ├── HEAD
    │       │       └── main
    │       └── tags/
    ├── .gitconfig
    ├── .gitignore
    ├── .idea/
    │   ├── .gitignore
    │   ├── ReactZayado.iml
    │   ├── copilot.data.migration.agent.xml
    │   ├── copilot.data.migration.ask.xml
    │   ├── copilot.data.migration.ask2agent.xml
    │   ├── copilot.data.migration.edit.xml
    │   ├── inspectionProfiles/
    │   │   ├── Project_Default.xml
    │   │   └── profiles_settings.xml
    │   ├── misc.xml
    │   ├── modules.xml
    │   ├── vcs.xml
    │   └── workspace.xml
    ├── CHANGES-verification-13-10.md
    ├── CHECKLIST-DEPLOIEMENT-RAILWAY.md
    ├── DEPLOIEMENT-RAILWAY.md
    ├── FONCTIONNALITES-PAR-OFFRE.md
    ├── GUIDE-ESPACE-ENTREPRISE.md
    ├── NOTIFICATIONS.md
    ├── README.md
    ├── WhatsApp-service/
    │   ├── .gitignore
    │   ├── Dockerfile
    │   ├── README.md
    │   ├── eslint.config.mjs
    │   ├── package.json
    │   ├── railway.json
    │   └── server.js
    ├── backend/
    │   ├── Dockerfile
    │   ├── _dump_schema.py
    │   ├── actualite_ext.py
    │   ├── admin_plus_ext.py
    │   ├── agent_missions_ext.py
    │   ├── agents_perso_ext.py
    │   ├── apollo_ext.py
    │   ├── app_logs_ext.py
    │   ├── assets/
    │   │   ├── boutique/
    │   │   │   ├── confidentialite-shopify.html
    │   │   │   ├── produits-zayado.csv
    │   │   │   └── textes-a-coller.md
    │   │   ├── rh/
    │   │   │   ├── prive.xlsx
    │   │   │   └── reference.xlsx
    │   │   └── teams/
    │   │       ├── color.png
    │   │       └── outline.png
    │   ├── boutique_installation_ext.py
    │   ├── canaux_ext.py
    │   ├── carrousel_ext.py
    │   ├── cession_ext.py
    │   ├── commerce_ext.py
    │   ├── comptes_admin_ext.py
    │   ├── conftest.py
    │   ├── connexions_vault_ext.py
    │   ├── crm_ext.py
    │   ├── diagnostic_ext.py
    │   ├── documents_ext.py
    │   ├── emails_ia_ext.py
    │   ├── entreprise_assistant_ext.py
    │   ├── entreprise_decompte.py
    │   ├── entreprise_excel.py
    │   ├── entreprise_ext.py
    │   ├── entreprise_installation_ext.py
    │   ├── entreprise_sheet_ext.py
    │   ├── entreprise_source_ext.py
    │   ├── equipe_collab_ext.py
    │   ├── espace_pro_ext.py
    │   ├── foi_ext.py
    │   ├── foi_pratique.py
    │   ├── fournisseurs_sheet.py
    │   ├── gamification_ext.py
    │   ├── generer_cles_vapid.py
    │   ├── heygen_routes.py
    │   ├── journal_ext.py
    │   ├── juridique_ext.py
    │   ├── kairos.db
    │   ├── lib/
    │   │   ├── __init__.py
    │   │   ├── dates.py
    │   │   ├── db.py
    │   │   ├── fec.py
    │   │   ├── notifs.py
    │   │   └── utilisateur.py
    │   ├── llm_mammouth.py
    │   ├── marque_ext.py
    │   ├── mindset_contenus.py
    │   ├── mindset_ext.py
    │   ├── models/
    │   │   ├── __init__.py
    │   │   ├── copilote.py
    │   │   ├── pilotage.py
    │   │   ├── plan.py
    │   │   ├── radar.py
    │   │   ├── vision.py
    │   │   └── workspace.py
    │   ├── nettoyage_hostinger.sql
    │   ├── newsletters_ext.py
    │   ├── notifications_ext.py
    │   ├── onboarding_ext.py
    │   ├── organisation_ext.py
    │   ├── part2_ext.py
    │   ├── pilotage_ext.py
    │   ├── prix_ext.py
    │   ├── push_ext.py
    │   ├── pytest.ini
    │   ├── radar_signaux.py
    │   ├── railway.json
    │   ├── rappels_ext.py
    │   ├── relances_ext.py
    │   ├── requirements.txt
    │   ├── revue_auto_ext.py
    │   ├── rituels_ext.py
    │   ├── routers/
    │   │   ├── __init__.py
    │   │   ├── admin_tunnels.py
    │   │   ├── cercle.py
    │   │   ├── copilote.py
    │   │   ├── paiements_tunnels.py
    │   │   ├── partenaires_financement.py
    │   │   ├── pilotage.py
    │   │   ├── plan.py
    │   │   ├── radar.py
    │   │   ├── tunnels_douleurs.py
    │   │   ├── tunnels_publics.py
    │   │   └── vision.py
    │   ├── schema_reference.sql
    │   ├── seed_comptes_demo.py
    │   ├── server.py
    │   ├── shopify_auth.py
    │   ├── shopify_ext.py
    │   ├── sso_ext.py
    │   ├── teams_ext.py
    │   ├── tests/
    │   │   ├── __init__.py
    │   │   ├── archive_serveur_distant/
    │   │   │   ├── LISEZMOI.md
    │   │   │   ├── backend_test.py
    │   │   │   ├── test_iteration3.py
    │   │   │   ├── test_iteration4.py
    │   │   │   ├── test_iteration5.py
    │   │   │   ├── test_kairos_auth_admin.py
    │   │   │   ├── test_tscheck_admin_diagnostics.py
    │   │   │   ├── test_tscheck_agent_business_tester.py
    │   │   │   ├── test_tscheck_cors_401_and_200.py
    │   │   │   ├── test_tscheck_db_sanitized_password_rotated.py
    │   │   │   ├── test_tscheck_dev_proxy_same_origin.py
    │   │   │   ├── test_tscheck_git_purge_script.py
    │   │   │   ├── test_tscheck_git_secrets_untracked.py
    │   │   │   ├── test_tscheck_ia_statut.py
    │   │   │   ├── test_tscheck_radar_vision_endpoints.py
    │   │   │   └── test_vision.py
    │   │   ├── backend_test.py
    │   │   ├── conftest.py
    │   │   ├── test_abonnement_auto.py
    │   │   ├── test_actu_cache_admin.py
    │   │   ├── test_actualite.py
    │   │   ├── test_admin.py
    │   │   ├── test_agent_missions.py
    │   │   ├── test_auth_securite.py
    │   │   ├── test_boutique_installation.py
    │   │   ├── test_cession.py
    │   │   ├── test_compte_offre.py
    │   │   ├── test_crm_liaisons.py
    │   │   ├── test_emails_ia.py
    │   │   ├── test_entreprise.py
    │   │   ├── test_entreprise_chrono.py
    │   │   ├── test_entreprise_decompte.py
    │   │   ├── test_entreprise_drive.py
    │   │   ├── test_entreprise_installation.py
    │   │   ├── test_entreprise_source.py
    │   │   ├── test_essai.py
    │   │   ├── test_foi_cles.py
    │   │   ├── test_iter7_uploads.py
    │   │   ├── test_iteration3.py
    │   │   ├── test_iteration4.py
    │   │   ├── test_iteration5.py
    │   │   ├── test_kairos_auth_admin.py
    │   │   ├── test_leads_aimants.py
    │   │   ├── test_marketplace.py
    │   │   ├── test_marque.py
    │   │   ├── test_mindset.py
    │   │   ├── test_offre_equipe_limite.py
    │   │   ├── test_pilotage.py
    │   │   ├── test_plan_action.py
    │   │   ├── test_prix_journal.py
    │   │   ├── test_question_integrations.py
    │   │   ├── test_radar.py
    │   │   ├── test_relances.py
    │   │   ├── test_rituels.py
    │   │   ├── test_schema.py
    │   │   ├── test_shopify_ext.py
    │   │   ├── test_suppression_groupe.py
    │   │   ├── test_teams_pack.py
    │   │   ├── test_thesustain_code.py
    │   │   ├── test_tscheck_admin_diagnostics.py
    │   │   ├── test_tscheck_admin_notifications.py
    │   │   ├── test_tscheck_agent_business_tester.py
    │   │   ├── test_tscheck_copilote_bienvenue.py
    │   │   ├── test_tscheck_cors_401_and_200.py
    │   │   ├── test_tscheck_db_sanitized_password_rotated.py
    │   │   ├── test_tscheck_dev_proxy_same_origin.py
    │   │   ├── test_tscheck_git_secrets_untracked.py
    │   │   ├── test_tscheck_ia_statut.py
    │   │   ├── test_tscheck_pilotage_imports.py
    │   │   ├── test_tscheck_radar_entreprise_validation.py
    │   │   ├── test_tscheck_radar_vision_endpoints.py
    │   │   ├── test_tunnel_zayado_iter3.py
    │   │   ├── test_vision.py
    │   │   ├── test_vision_partage_membres.py
    │   │   ├── test_zayado_iter2.py
    │   │   └── test_zayado_iter3.py
    │   ├── trello_ext.py
    │   ├── tunnel_zayado_ext.py
    │   ├── uploads_ext.py
    │   ├── vendeur_dokan_ext.py
    │   ├── victoires_ext.py
    │   └── vision_plus.py
    ├── design_guidelines.json
    ├── exports/
    │   ├── audit-commercial.md
    │   ├── capturer_pages.py
    │   ├── generer_index_apercu.py
    │   ├── pages-publiques/
    │   │   ├── LISEZ-MOI-liste.md
    │   │   ├── pages/
    │   │   │   └── tunnel/
    │   │   │       ├── TunnelPublic.tsx
    │   │   │       ├── TunnelReprise.tsx
    │   │   │       └── TunnelZayado.tsx
    │   │   ├── public-legal/
    │   │   │   ├── confidentialite-shopify.html
    │   │   │   └── confidentialite.html
    │   │   └── zy/
    │   │       ├── components/
    │   │       │   ├── legal/
    │   │       │   │   └── ConfidentialiteContenu.jsx
    │   │       │   └── marketing/
    │   │       │       └── MarketingLayout.jsx
    │   │       └── pages/
    │   │           ├── Achat.jsx
    │   │           ├── Activer.jsx
    │   │           ├── Confidentialite.jsx
    │   │           ├── ConfidentialiteEmbed.jsx
    │   │           ├── ConnexionExterne.jsx
    │   │           ├── EntrepriseRejoindre.jsx
    │   │           ├── ExerciceEmbed.jsx
    │   │           ├── Legal.jsx
    │   │           ├── LiaisonCompte.jsx
    │   │           ├── Login.jsx
    │   │           ├── MonCompte.jsx
    │   │           ├── Onboarding.jsx
    │   │           ├── PartenariatTheSustain.jsx
    │   │           ├── Pricing.jsx
    │   │           ├── PricingSuccess.jsx
    │   │           ├── PublicVision.jsx
    │   │           ├── TarifsEmbed.jsx
    │   │           └── TemoignagePublic.jsx
    │   └── zayado-entreprise/
    │       └── Zayado-Entreprise-main/
    │           ├── .emergent/
    │           │   ├── emergent.yml
    │           │   └── markers/
    │           │       ├── .bootstrap-complete
    │           │       └── .restore-complete
    │           ├── .gitconfig
    │           ├── .gitignore
    │           ├── README.md
    │           ├── backend/
    │           │   ├── pytest.ini
    │           │   ├── requirements.txt
    │           │   ├── server.py
    │           │   └── tests/
    │           │       └── backend_test.py
    │           ├── design_guidelines.json
    │           ├── frontend/
    │           │   ├── .gitignore
    │           │   ├── README.md
    │           │   ├── components.json
    │           │   ├── craco.config.js
    │           │   ├── jsconfig.json
    │           │   ├── package.json
    │           │   ├── plugins/
    │           │   │   └── health-check/
    │           │   │       ├── health-endpoints.js
    │           │   │       └── webpack-health-plugin.js
    │           │   ├── postcss.config.js
    │           │   ├── public/
    │           │   │   ├── favicon.svg
    │           │   │   └── index.html
    │           │   ├── src/
    │           │   │   ├── App.css
    │           │   │   ├── App.js
    │           │   │   ├── components/
    │           │   │   │   ├── AppHeader.jsx
    │           │   │   │   ├── Footer.jsx
    │           │   │   │   ├── FunnelHeader.jsx
    │           │   │   │   ├── Logo.jsx
    │           │   │   │   ├── MarketCard.jsx
    │           │   │   │   ├── Marquee.jsx
    │           │   │   │   ├── Nav.jsx
    │           │   │   │   ├── Reveal.jsx
    │           │   │   │   ├── ServiceForm.jsx
    │           │   │   │   └── ui/
    │           │   │   │       ├── accordion.jsx
    │           │   │   │       ├── alert-dialog.jsx
    │           │   │   │       ├── alert.jsx
    │           │   │   │       ├── aspect-ratio.jsx
    │           │   │   │       ├── avatar.jsx
    │           │   │   │       ├── badge.jsx
    │           │   │   │       ├── breadcrumb.jsx
    │           │   │   │       ├── button.jsx
    │           │   │   │       ├── calendar.jsx
    │           │   │   │       ├── card.jsx
    │           │   │   │       ├── carousel.jsx
    │           │   │   │       ├── checkbox.jsx
    │           │   │   │       ├── collapsible.jsx
    │           │   │   │       ├── command.jsx
    │           │   │   │       ├── context-menu.jsx
    │           │   │   │       ├── dialog.jsx
    │           │   │   │       ├── drawer.jsx
    │           │   │   │       ├── dropdown-menu.jsx
    │           │   │   │       ├── form.jsx
    │           │   │   │       ├── hover-card.jsx
    │           │   │   │       ├── input-otp.jsx
    │           │   │   │       ├── input.jsx
    │           │   │   │       ├── label.jsx
    │           │   │   │       ├── menubar.jsx
    │           │   │   │       ├── navigation-menu.jsx
    │           │   │   │       ├── pagination.jsx
    │           │   │   │       ├── popover.jsx
    │           │   │   │       ├── progress.jsx
    │           │   │   │       ├── radio-group.jsx
    │           │   │   │       ├── resizable.jsx
    │           │   │   │       ├── scroll-area.jsx
    │           │   │   │       ├── select.jsx
    │           │   │   │       ├── separator.jsx
    │           │   │   │       ├── sheet.jsx
    │           │   │   │       ├── skeleton.jsx
    │           │   │   │       ├── slider.jsx
    │           │   │   │       ├── sonner.jsx
    │           │   │   │       ├── switch.jsx
    │           │   │   │       ├── table.jsx
    │           │   │   │       ├── tabs.jsx
    │           │   │   │       ├── textarea.jsx
    │           │   │   │       ├── toast.jsx
    │           │   │   │       ├── toaster.jsx
    │           │   │   │       ├── toggle-group.jsx
    │           │   │   │       ├── toggle.jsx
    │           │   │   │       └── tooltip.jsx
    │           │   │   ├── constants/
    │           │   │   │   └── testIds/
    │           │   │   │       ├── auth.js
    │           │   │   │       ├── home.js
    │           │   │   │       └── index.js
    │           │   │   ├── context/
    │           │   │   │   └── CartContext.jsx
    │           │   │   ├── data/
    │           │   │   │   ├── catalogue.js
    │           │   │   │   ├── content.js
    │           │   │   │   ├── diagnosticLib.js
    │           │   │   │   ├── images.js
    │           │   │   │   └── quiz.js
    │           │   │   ├── hooks/
    │           │   │   │   ├── use-toast.js
    │           │   │   │   └── usePageMeta.js
    │           │   │   ├── index.css
    │           │   │   ├── index.js
    │           │   │   ├── lib/
    │           │   │   │   ├── api.js
    │           │   │   │   └── utils.js
    │           │   │   └── pages/
    │           │   │       ├── Besoins.jsx
    │           │   │       ├── BoxPage.jsx
    │           │   │       ├── BoxPreco.jsx
    │           │   │       ├── Checkout.jsx
    │           │   │       ├── Cockpit.jsx
    │           │   │       ├── ComingSoon.jsx
    │           │   │       ├── Diagnostic.jsx
    │           │   │       ├── Favoris.jsx
    │           │   │       ├── FichePage.jsx
    │           │   │       ├── HeroChoix.jsx
    │           │   │       ├── Home.jsx
    │           │   │       ├── Journal.jsx
    │           │   │       ├── JournalArticle.jsx
    │           │   │       ├── MaisonPage.jsx
    │           │   │       ├── Marketplace.jsx
    │           │   │       ├── Merci.jsx
    │           │   │       ├── Panier.jsx
    │           │   │       ├── PaymentResult.jsx
    │           │   │       ├── Services.jsx
    │           │   │       ├── TunnelHome.jsx
    │           │   │       ├── TunnelPage.jsx
    │           │   │       └── Vision.jsx
    │           │   └── tailwind.config.js
    │           ├── memory/
    │           │   ├── .gitkeep
    │           │   └── PRD.md
    │           ├── test_reports/
    │           │   ├── .gitkeep
    │           │   ├── iteration_1.json
    │           │   ├── iteration_2.json
    │           │   ├── iteration_3.json
    │           │   └── pytest/
    │           │       ├── .gitkeep
    │           │       └── pytest_results.xml
    │           ├── test_result.md
    │           └── tests/
    │               └── __init__.py
    ├── frontend/
    │   ├── .dockerignore
    │   ├── .gitignore
    │   ├── .oxlintrc.json
    │   ├── App.tsx
    │   ├── Dockerfile
    │   ├── components.json
    │   ├── docker-entrypoint.d/
    │   │   ├── 05-backend-default.envsh
    │   │   └── 05-backend-default.sh
    │   ├── index.css
    │   ├── index.html
    │   ├── nginx.conf
    │   ├── package.json
    │   ├── public/
    │   │   ├── aimants/
    │   │   │   ├── zayado-aimant-lumiere.pdf
    │   │   │   ├── zayado-aimant-rituel.pdf
    │   │   │   └── zayado-aimant-tresorerie.pdf
    │   │   ├── apercu/
    │   │   │   ├── app-accueil.png
    │   │   │   ├── app-acheter.png
    │   │   │   ├── app-activer.png
    │   │   │   ├── app-compte.png
    │   │   │   ├── app-connexion-externe.png
    │   │   │   ├── app-diagnostic.png
    │   │   │   ├── app-embed-confidentialite.png
    │   │   │   ├── app-embed-tarifs.png
    │   │   │   ├── app-entreprise-rejoindre.png
    │   │   │   ├── app-legal-cgu.png
    │   │   │   ├── app-legal-cgv.png
    │   │   │   ├── app-legal-confidentialite.png
    │   │   │   ├── app-legal-mentions.png
    │   │   │   ├── app-login.png
    │   │   │   ├── app-mon-espace.png
    │   │   │   ├── app-onboarding.png
    │   │   │   ├── app-partenaires.png
    │   │   │   ├── app-pricing.png
    │   │   │   ├── app-reprise-rdv.png
    │   │   │   ├── app-reprise.png
    │   │   │   ├── app-tunnel-fast-track.png
    │   │   │   ├── app-tunnel-kit.png
    │   │   │   ├── app-tunnel-merci.png
    │   │   │   ├── app-tunnel.png
    │   │   │   ├── index.html
    │   │   │   ├── shop-accueil.png
    │   │   │   ├── shop-besoins.png
    │   │   │   ├── shop-boutique.png
    │   │   │   ├── shop-box.png
    │   │   │   ├── shop-cgu.png
    │   │   │   ├── shop-cgv.png
    │   │   │   ├── shop-cockpit.png
    │   │   │   ├── shop-confidentialite.png
    │   │   │   ├── shop-contact.png
    │   │   │   ├── shop-journal.png
    │   │   │   ├── shop-liens.png
    │   │   │   ├── shop-maison.png
    │   │   │   ├── shop-mentions.png
    │   │   │   ├── shop-outils.png
    │   │   │   ├── shop-panier.png
    │   │   │   ├── shop-parcours.png
    │   │   │   ├── shop-recherche.png
    │   │   │   ├── shop-ressources.png
    │   │   │   ├── shop-services.png
    │   │   │   └── shop-vision.png
    │   │   ├── apple-touch-icon.png
    │   │   ├── favicon-16x16.png
    │   │   ├── favicon-32x32.png
    │   │   ├── favicon.ico
    │   │   ├── favicon.png
    │   │   ├── favicon.svg
    │   │   ├── icon-zayado-192.png
    │   │   ├── icon-zayado-512.png
    │   │   ├── icon-zayado-maskable-512.png
    │   │   ├── icons.svg
    │   │   ├── kits/
    │   │   │   ├── google/
    │   │   │   │   ├── Installation-ZayadoRH-Google.xlsx
    │   │   │   │   └── Installer-ZayadoRH-Google.gs
    │   │   │   └── microsoft/
    │   │   │       ├── Install-ZayadoRH.ps1
    │   │   │       └── Installation-ZayadoRH.xlsx
    │   │   ├── legal/
    │   │   │   ├── confidentialite-shopify.html
    │   │   │   └── confidentialite.html
    │   │   ├── logo-app.png
    │   │   ├── logo.png
    │   │   ├── logo192.png
    │   │   ├── logo512.png
    │   │   ├── manifest.json
    │   │   ├── notif-badge.png
    │   │   ├── notif-icon.png
    │   │   ├── og/
    │   │   │   ├── cession.png
    │   │   │   ├── diagnostic.png
    │   │   │   └── reprise.png
    │   │   ├── og-zayado.png
    │   │   ├── presentation-poster.jpg
    │   │   ├── public/
    │   │   │   └── entreprise/
    │   │   │       ├── favicon.svg
    │   │   │       └── index.html
    │   │   ├── robots.txt
    │   │   ├── shopify-espace-vendeur.html
    │   │   ├── sitemap.xml
    │   │   └── sw.js
    │   ├── railway.json
    │   ├── src/
    │   │   ├── App.tsx
    │   │   ├── components/
    │   │   │   ├── Commentaires.tsx
    │   │   │   ├── ConfigEditor.tsx
    │   │   │   ├── ConnectSource.tsx
    │   │   │   ├── RowFields.tsx
    │   │   │   ├── StatusPill.tsx
    │   │   │   ├── ViewRenderer.tsx
    │   │   │   ├── ui/
    │   │   │   │   ├── badge.tsx
    │   │   │   │   ├── button.tsx
    │   │   │   │   ├── calendar.tsx
    │   │   │   │   ├── card.tsx
    │   │   │   │   ├── checkbox.tsx
    │   │   │   │   ├── dialog.tsx
    │   │   │   │   ├── dropdown-menu.tsx
    │   │   │   │   ├── input.tsx
    │   │   │   │   ├── label.tsx
    │   │   │   │   ├── popover.tsx
    │   │   │   │   ├── select.tsx
    │   │   │   │   ├── sheet.tsx
    │   │   │   │   ├── sonner.tsx
    │   │   │   │   ├── table.tsx
    │   │   │   │   ├── tabs.tsx
    │   │   │   │   └── textarea.tsx
    │   │   │   ├── views/
    │   │   │   │   ├── CalendarView.tsx
    │   │   │   │   ├── CardsView.tsx
    │   │   │   │   ├── ChronoView.tsx
    │   │   │   │   ├── DashboardView.tsx
    │   │   │   │   ├── FormView.tsx
    │   │   │   │   ├── KanbanView.tsx
    │   │   │   │   ├── TableView.tsx
    │   │   │   │   └── TimelineView.tsx
    │   │   │   └── vision/
    │   │   │       ├── CarrouselBoard.tsx
    │   │   │       ├── Cercle.tsx
    │   │   │       ├── EnTete.tsx
    │   │   │       ├── VerifEntreprise.tsx
    │   │   │       ├── atomes.tsx
    │   │   │       ├── chrome.tsx
    │   │   │       ├── graphiques.tsx
    │   │   │       └── menus.tsx
    │   │   ├── features/
    │   │   │   └── thesustain/
    │   │   │       ├── MaFoiApp.jsx
    │   │   │       ├── MaFoiHub.jsx
    │   │   │       ├── MemoireAide.jsx
    │   │   │       ├── MemoirePage.jsx
    │   │   │       ├── memoireLogic.js
    │   │   │       ├── memoireLogic.test.js
    │   │   │       ├── memoireStore.js
    │   │   │       ├── store.js
    │   │   │       └── thesustainData.js
    │   │   ├── index.css
    │   │   ├── lib/
    │   │   │   ├── api.ts
    │   │   │   ├── format.ts
    │   │   │   ├── hooks.ts
    │   │   │   ├── lucide-react.tsx
    │   │   │   ├── queryClient.ts
    │   │   │   ├── recharts.tsx
    │   │   │   ├── session.ts
    │   │   │   ├── types.ts
    │   │   │   └── utils.ts
    │   │   ├── main.tsx
    │   │   ├── pages/
    │   │   │   ├── copilote/
    │   │   │   │   ├── Pilotage.tsx
    │   │   │   │   ├── PlanAction.tsx
    │   │   │   │   ├── Radar.tsx
    │   │   │   │   └── VisionGlobale.tsx
    │   │   │   ├── entreprise/
    │   │   │   │   ├── DemarrageEntreprise.tsx
    │   │   │   │   ├── EspaceBases.tsx
    │   │   │   │   ├── EspaceKpis.tsx
    │   │   │   │   └── EspacePage.tsx
    │   │   │   ├── tunnel/
    │   │   │   │   ├── AimantSortie.tsx
    │   │   │   │   ├── CodeTunnel.tsx
    │   │   │   │   ├── TunnelPublic.tsx
    │   │   │   │   ├── TunnelReprise.tsx
    │   │   │   │   ├── TunnelZayado.tsx
    │   │   │   │   └── types.ts
    │   │   │   └── zayado/
    │   │   │       ├── AdminPartenaires.tsx
    │   │   │       ├── AdminTunnels.tsx
    │   │   │       ├── TunnelPaiements.tsx
    │   │   │       ├── TunnelPublication.tsx
    │   │   │       ├── Tunnels.tsx
    │   │   │       └── blocsCode.ts
    │   │   ├── styles/
    │   │   │   └── copilote.css
    │   │   ├── types/
    │   │   │   ├── pilotage.ts
    │   │   │   ├── plan.ts
    │   │   │   ├── radar.ts
    │   │   │   └── vision.ts
    │   │   ├── zayado/
    │   │   │   ├── Shell.tsx
    │   │   │   ├── api.ts
    │   │   │   ├── droits.ts
    │   │   │   ├── types.ts
    │   │   │   └── ui.tsx
    │   │   └── zy/
    │   │       ├── components/
    │   │       │   ├── admin/
    │   │       │   │   ├── AdminAppLogs.jsx
    │   │       │   │   ├── AdminArticles.jsx
    │   │       │   │   ├── AdminBranchements.jsx
    │   │       │   │   ├── AdminConnexions.jsx
    │   │       │   │   ├── AdminEquipe.jsx
    │   │       │   │   ├── AdminGestion.jsx
    │   │       │   │   ├── AdminMarque.jsx
    │   │       │   │   ├── AdminNewsletters.jsx
    │   │       │   │   ├── AdminPagesPubliques.jsx
    │   │       │   │   ├── AdminPrix.jsx
    │   │       │   │   ├── AdminRetention.jsx
    │   │       │   │   ├── AdminTemoignages.jsx
    │   │       │   │   ├── CarrouselLoginAdmin.jsx
    │   │       │   │   └── DeploiementBoutique.jsx
    │   │       │   ├── agents/
    │   │       │   │   ├── AgentParDefaut.jsx
    │   │       │   │   ├── MesAgents.jsx
    │   │       │   │   └── MissionsAgent.jsx
    │   │       │   ├── ideas/
    │   │       │   │   ├── CaptureBar.jsx
    │   │       │   │   ├── IdeaDrawer.jsx
    │   │       │   │   ├── IdeesEquipe.jsx
    │   │       │   │   └── constants.js
    │   │       │   ├── kairos/
    │   │       │   │   ├── AccesGate.jsx
    │   │       │   │   ├── AiFallbackBanner.jsx
    │   │       │   │   ├── AutoPush.jsx
    │   │       │   │   ├── BottomNav.jsx
    │   │       │   │   ├── BoutonDernierMessage.jsx
    │   │       │   │   ├── BreathingSession.jsx
    │   │       │   │   ├── CanauxCopilote.jsx
    │   │       │   │   ├── CarteApplication.jsx
    │   │       │   │   ├── CarteContacts.jsx
    │   │       │   │   ├── ChatAssistant.jsx
    │   │       │   │   ├── ChoixPays.jsx
    │   │       │   │   ├── CollaborateurModal.jsx
    │   │       │   │   ├── EnergyCheckin.jsx
    │   │       │   │   ├── GlassCard.jsx
    │   │       │   │   ├── GlobalChat.jsx
    │   │       │   │   ├── GuidedTour.jsx
    │   │       │   │   ├── Header.jsx
    │   │       │   │   ├── InstallBanner.jsx
    │   │       │   │   ├── IntegrationsSection.jsx
    │   │       │   │   ├── LanguageSwitcher.jsx
    │   │       │   │   ├── NotifsAppareil.jsx
    │   │       │   │   ├── Ok.jsx
    │   │       │   │   ├── PoulsQonto.jsx
    │   │       │   │   ├── RadarAction.jsx
    │   │       │   │   ├── RadarSignaux.jsx
    │   │       │   │   ├── SensEquilibre.jsx
    │   │       │   │   ├── Sidebar.jsx
    │   │       │   │   ├── TheSustainInfo.jsx
    │   │       │   │   └── WhatsAppStatut.jsx
    │   │       │   ├── legal/
    │   │       │   │   └── ConfidentialiteContenu.jsx
    │   │       │   ├── marketing/
    │   │       │   │   └── MarketingLayout.jsx
    │   │       │   ├── mindset/
    │   │       │   │   ├── Exercice.jsx
    │   │       │   │   ├── MindsetAujourdhui.jsx
    │   │       │   │   ├── MindsetCarnet.jsx
    │   │       │   │   └── MindsetParcours.jsx
    │   │       │   ├── pricing/
    │   │       │   │   ├── Economies.jsx
    │   │       │   │   └── GrilleTarifs.jsx
    │   │       │   ├── pro/
    │   │       │   │   ├── PhotosProduit.jsx
    │   │       │   │   └── SideMenuPro.jsx
    │   │       │   ├── ui/
    │   │       │   │   ├── TexteIA.jsx
    │   │       │   │   ├── accordion.jsx
    │   │       │   │   ├── alert-dialog.jsx
    │   │       │   │   ├── alert.jsx
    │   │       │   │   ├── aspect-ratio.jsx
    │   │       │   │   ├── avatar.jsx
    │   │       │   │   ├── badge.jsx
    │   │       │   │   ├── breadcrumb.jsx
    │   │       │   │   ├── button.jsx
    │   │       │   │   ├── calendar.jsx
    │   │       │   │   ├── card.jsx
    │   │       │   │   ├── carousel.jsx
    │   │       │   │   ├── checkbox.jsx
    │   │       │   │   ├── collapsible.jsx
    │   │       │   │   ├── command.jsx
    │   │       │   │   ├── context-menu.jsx
    │   │       │   │   ├── dialog.jsx
    │   │       │   │   ├── drawer.jsx
    │   │       │   │   ├── dropdown-menu.jsx
    │   │       │   │   ├── form.jsx
    │   │       │   │   ├── hover-card.jsx
    │   │       │   │   ├── input-otp.jsx
    │   │       │   │   ├── input.jsx
    │   │       │   │   ├── label.jsx
    │   │       │   │   ├── menubar.jsx
    │   │       │   │   ├── navigation-menu.jsx
    │   │       │   │   ├── pagination.jsx
    │   │       │   │   ├── popover.jsx
    │   │       │   │   ├── progress.jsx
    │   │       │   │   ├── radio-group.jsx
    │   │       │   │   ├── resizable.jsx
    │   │       │   │   ├── scroll-area.jsx
    │   │       │   │   ├── select.jsx
    │   │       │   │   ├── separator.jsx
    │   │       │   │   ├── sheet.jsx
    │   │       │   │   ├── skeleton.jsx
    │   │       │   │   ├── slider.jsx
    │   │       │   │   ├── sonner.jsx
    │   │       │   │   ├── switch.jsx
    │   │       │   │   ├── table.jsx
    │   │       │   │   ├── tabs.jsx
    │   │       │   │   ├── textarea.jsx
    │   │       │   │   ├── toast.jsx
    │   │       │   │   ├── toaster.jsx
    │   │       │   │   ├── toggle-group.jsx
    │   │       │   │   ├── toggle.jsx
    │   │       │   │   └── tooltip.jsx
    │   │       │   ├── vendeur/
    │   │       │   │   └── VendeurDokan.jsx
    │   │       │   └── vision/
    │   │       │       ├── AiImageRow.jsx
    │   │       │       ├── BoardListe.jsx
    │   │       │       ├── BoardSwitcher.jsx
    │   │       │       ├── CardStyleMenu.jsx
    │   │       │       ├── CardToolbar.jsx
    │   │       │       ├── ElanMur.jsx
    │   │       │       ├── ElanPanneau.jsx
    │   │       │       ├── IdeesPanel.jsx
    │   │       │       ├── SfCards.jsx
    │   │       │       ├── VisionCanvas.jsx
    │   │       │       ├── VoiceCapture.jsx
    │   │       │       ├── cockpitTemplate.js
    │   │       │       └── sf.css
    │   │       ├── constants/
    │   │       │   └── testIds/
    │   │       │       ├── auth.js
    │   │       │       ├── home.js
    │   │       │       └── index.js
    │   │       ├── context/
    │   │       │   └── KairosContext.jsx
    │   │       ├── features/
    │   │       │   └── thesustain/
    │   │       │       ├── MaFoiApp.jsx
    │   │       │       ├── MaFoiHub.jsx
    │   │       │       ├── MemoireAide.jsx
    │   │       │       ├── MemoirePage.jsx
    │   │       │       ├── memoireLogic.js
    │   │       │       ├── memoireLogic.test.js
    │   │       │       ├── memoireStore.js
    │   │       │       ├── store.js
    │   │       │       └── thesustainData.js
    │   │       ├── hooks/
    │   │       │   ├── use-toast.js
    │   │       │   └── useChatScroll.js
    │   │       ├── i18n/
    │   │       │   ├── index.jsx
    │   │       │   └── translations.js
    │   │       ├── lib/
    │   │       │   ├── acces.js
    │   │       │   ├── actuCache.js
    │   │       │   ├── alertes.js
    │   │       │   ├── ambiance.js
    │   │       │   ├── analyseIdee.js
    │   │       │   ├── bilanPdf.js
    │   │       │   ├── carteMentale.js
    │   │       │   ├── charge.js
    │   │       │   ├── checkout.js
    │   │       │   ├── diagnostic.js
    │   │       │   ├── droits.js
    │   │       │   ├── espace.js
    │   │       │   ├── installPwa.js
    │   │       │   ├── invitationEquipe.js
    │   │       │   ├── kairosApi.js
    │   │       │   ├── marches.js
    │   │       │   ├── marque.js
    │   │       │   ├── noindex.js
    │   │       │   ├── part2Api.js
    │   │       │   ├── plans.js
    │   │       │   ├── push.js
    │   │       │   ├── sectionsEntreprise.js
    │   │       │   ├── texteSimple.js
    │   │       │   ├── theme.js
    │   │       │   ├── themePro.js
    │   │       │   ├── useSeo.js
    │   │       │   └── utils.js
    │   │       ├── mock/
    │   │       │   └── data.js
    │   │       ├── pages/
    │   │       │   ├── Achat.jsx
    │   │       │   ├── Activer.jsx
    │   │       │   ├── Admin.jsx
    │   │       │   ├── Agents.jsx
    │   │       │   ├── BienEtre.jsx
    │   │       │   ├── ChatbotB2B.jsx
    │   │       │   ├── Collaborateur.jsx
    │   │       │   ├── Confidentialite.jsx
    │   │       │   ├── ConfidentialiteEmbed.jsx
    │   │       │   ├── ConnexionExterne.jsx
    │   │       │   ├── Debloquer.jsx
    │   │       │   ├── Diagnostic.jsx
    │   │       │   ├── Elan.jsx
    │   │       │   ├── Entreprise.jsx
    │   │       │   ├── EntrepriseRejoindre.jsx
    │   │       │   ├── ExerciceEmbed.jsx
    │   │       │   ├── Ideas.jsx
    │   │       │   ├── Legal.jsx
    │   │       │   ├── LiaisonCompte.jsx
    │   │       │   ├── Login.jsx
    │   │       │   ├── MaFoi.jsx
    │   │       │   ├── Marketplace.jsx
    │   │       │   ├── MonCompte.jsx
    │   │       │   ├── Onboarding.jsx
    │   │       │   ├── Parametres.jsx
    │   │       │   ├── Partager.jsx
    │   │       │   ├── PartenariatTheSustain.jsx
    │   │       │   ├── Pricing.jsx
    │   │       │   ├── PricingSuccess.jsx
    │   │       │   ├── Processus.jsx
    │   │       │   ├── Programmes.jsx
    │   │       │   ├── PublicVision.jsx
    │   │       │   ├── Sources.jsx
    │   │       │   ├── TarifsEmbed.jsx
    │   │       │   ├── TemoignagePublic.jsx
    │   │       │   ├── VisionBoard.jsx
    │   │       │   └── WeeklyReview.jsx
    │   │       └── zayado.css
    │   ├── tsconfig.app.json
    │   ├── tsconfig.json
    │   ├── tsconfig.node.json
    │   └── vite.config.ts
    ├── memory/
    │   ├── .gitkeep
    │   ├── .tok_local
    │   ├── PRD.md
    │   └── SPEC.md
    ├── plan/
    │   └── plan.md
    ├── shopify/
    │   ├── README.md
    │   ├── aimants/
    │   │   ├── lumiere.html
    │   │   ├── rituel.html
    │   │   ├── style.css
    │   │   └── tresorerie.html
    │   ├── apercu/
    │   │   ├── journal-article.html
    │   │   ├── journal-liste.html
    │   │   ├── page-besoins.html
    │   │   ├── page-cockpit.html
    │   │   ├── page-liens.html
    │   │   ├── page-maison.html
    │   │   └── section-douleurs.html
    │   ├── journal/
    │   │   └── textes-a-coller.md
    │   ├── outils/
    │   │   ├── creer_theme_preparation.py
    │   │   ├── creer_vendeur_ocushield.py
    │   │   ├── generer_journal.py
    │   │   ├── generer_produits.py
    │   │   ├── installer_boutique.py
    │   │   ├── mega_menu.py
    │   │   ├── pages_hero_ocushield.py
    │   │   ├── pages_vitrine.py
    │   │   ├── pousser_preparation.py
    │   │   ├── pousser_theme_v2.py
    │   │   └── seo_collections.py
    │   ├── produits/
    │   │   └── produits-zayado.csv
    │   ├── theme/
    │   │   ├── assets/
    │   │   │   ├── zayado-caveat-600.woff2
    │   │   │   ├── zayado-poppins-400.woff2
    │   │   │   ├── zayado-poppins-500.woff2
    │   │   │   ├── zayado-poppins-600.woff2
    │   │   │   ├── zayado-poppins-700.woff2
    │   │   │   └── zayado.css
    │   │   ├── layout/
    │   │   │   └── zayado-liens.liquid
    │   │   ├── sections/
    │   │   │   ├── zayado-bandeau.liquid
    │   │   │   ├── zayado-cartes.liquid
    │   │   │   ├── zayado-contact.liquid
    │   │   │   ├── zayado-douleurs.liquid
    │   │   │   ├── zayado-entete.liquid
    │   │   │   ├── zayado-faq.liquid
    │   │   │   ├── zayado-fiche-produit.liquid
    │   │   │   ├── zayado-grille-produits.liquid
    │   │   │   ├── zayado-hero.liquid
    │   │   │   ├── zayado-journal-article.liquid
    │   │   │   ├── zayado-journal-liste.liquid
    │   │   │   ├── zayado-liens.liquid
    │   │   │   ├── zayado-services.liquid
    │   │   │   ├── zayado-tarifs.liquid
    │   │   │   └── zayado-univers.liquid
    │   │   ├── snippets/
    │   │   │   ├── zayado-carte-journal.liquid
    │   │   │   ├── zayado-carte-produit.liquid
    │   │   │   ├── zayado-date.liquid
    │   │   │   └── zayado-icone.liquid
    │   │   └── templates/
    │   │       ├── article.journal.json
    │   │       ├── blog.journal.json
    │   │       ├── collection.zayado.json
    │   │       ├── page.zayado-accueil.json
    │   │       ├── page.zayado-besoins.json
    │   │       ├── page.zayado-boutique.json
    │   │       ├── page.zayado-box.json
    │   │       ├── page.zayado-cockpit.json
    │   │       ├── page.zayado-contact.json
    │   │       ├── page.zayado-liens.json
    │   │       ├── page.zayado-maison.json
    │   │       ├── page.zayado-parcours.json
    │   │       ├── page.zayado-services.json
    │   │       ├── page.zayado-vision.json
    │   │       └── product.zayado.json
    │   └── theme-v2/
    │       ├── THEME_PREPARATION.txt
    │       ├── assets/
    │       │   ├── animations.js
    │       │   ├── base.css
    │       │   ├── cart-disclosure-modal.js
    │       │   ├── cart-disclosure-tooltip.js
    │       │   ├── cart-drawer.js
    │       │   ├── cart-notification.js
    │       │   ├── cart.js
    │       │   ├── collage.css
    │       │   ├── collapsible-content.css
    │       │   ├── component-accordion.css
    │       │   ├── component-article-card.css
    │       │   ├── component-card.css
    │       │   ├── component-cart-drawer.css
    │       │   ├── component-cart-items.css
    │       │   ├── component-cart-notification.css
    │       │   ├── component-cart.css
    │       │   ├── component-collection-hero.css
    │       │   ├── component-complementary-products.css
    │       │   ├── component-deferred-media.css
    │       │   ├── component-disclosures.css
    │       │   ├── component-discounts.css
    │       │   ├── component-facets.css
    │       │   ├── component-image-with-text.css
    │       │   ├── component-list-menu.css
    │       │   ├── component-list-payment.css
    │       │   ├── component-list-social.css
    │       │   ├── component-localization-form.css
    │       │   ├── component-mega-menu.css
    │       │   ├── component-menu-drawer.css
    │       │   ├── component-modal-video.css
    │       │   ├── component-model-viewer-ui.css
    │       │   ├── component-newsletter.css
    │       │   ├── component-pagination.css
    │       │   ├── component-pickup-availability.css
    │       │   ├── component-predictive-search.css
    │       │   ├── component-price.css
    │       │   ├── component-product-model.css
    │       │   ├── component-product-variant-picker.css
    │       │   ├── component-progress-bar.css
    │       │   ├── component-rating.css
    │       │   ├── component-search.css
    │       │   ├── component-show-more.css
    │       │   ├── component-slider.css
    │       │   ├── component-slideshow.css
    │       │   ├── component-swatch-input.css
    │       │   ├── component-swatch.css
    │       │   ├── component-totals.css
    │       │   ├── component-volume-pricing.css
    │       │   ├── constants.js
    │       │   ├── customer.js
    │       │   ├── details-disclosure.js
    │       │   ├── details-modal.js
    │       │   ├── disclosures.js
    │       │   ├── email-signup-banner-background-mobile.svg
    │       │   ├── email-signup-banner-background.svg
    │       │   ├── facets.js
    │       │   ├── global.js
    │       │   ├── icon-3d-model.svg
    │       │   ├── icon-account.svg
    │       │   ├── icon-apple.svg
    │       │   ├── icon-arrow.svg
    │       │   ├── icon-banana.svg
    │       │   ├── icon-bottle.svg
    │       │   ├── icon-box.svg
    │       │   ├── icon-caret.svg
    │       │   ├── icon-carrot.svg
    │       │   ├── icon-cart-empty.svg
    │       │   ├── icon-cart.svg
    │       │   ├── icon-chat-bubble.svg
    │       │   ├── icon-check-mark.svg
    │       │   ├── icon-checkmark.svg
    │       │   ├── icon-clipboard.svg
    │       │   ├── icon-close-small.svg
    │       │   ├── icon-close.svg
    │       │   ├── icon-copy.svg
    │       │   ├── icon-dairy-free.svg
    │       │   ├── icon-dairy.svg
    │       │   ├── icon-discount.svg
    │       │   ├── icon-dryer.svg
    │       │   ├── icon-error.svg
    │       │   ├── icon-eye.svg
    │       │   ├── icon-facebook.svg
    │       │   ├── icon-filter.svg
    │       │   ├── icon-fire.svg
    │       │   ├── icon-gluten-free.svg
    │       │   ├── icon-hamburger.svg
    │       │   ├── icon-heart.svg
    │       │   ├── icon-info.svg
    │       │   ├── icon-instagram.svg
    │       │   ├── icon-inventory-status.svg
    │       │   ├── icon-iron.svg
    │       │   ├── icon-leaf.svg
    │       │   ├── icon-leather.svg
    │       │   ├── icon-lightning-bolt.svg
    │       │   ├── icon-lipstick.svg
    │       │   ├── icon-lock.svg
    │       │   ├── icon-map-pin.svg
    │       │   ├── icon-minus.svg
    │       │   ├── icon-nut-free.svg
    │       │   ├── icon-padlock.svg
    │       │   ├── icon-pants.svg
    │       │   ├── icon-pause.svg
    │       │   ├── icon-paw-print.svg
    │       │   ├── icon-pepper.svg
    │       │   ├── icon-perfume.svg
    │       │   ├── icon-pinterest.svg
    │       │   ├── icon-plane.svg
    │       │   ├── icon-plant.svg
    │       │   ├── icon-play.svg
    │       │   ├── icon-plus.svg
    │       │   ├── icon-price-tag.svg
    │       │   ├── icon-question-mark.svg
    │       │   ├── icon-recycle.svg
    │       │   ├── icon-remove.svg
    │       │   ├── icon-reset.svg
    │       │   ├── icon-return.svg
    │       │   ├── icon-ruler.svg
    │       │   ├── icon-search.svg
    │       │   ├── icon-serving-dish.svg
    │       │   ├── icon-share.svg
    │       │   ├── icon-shirt.svg
    │       │   ├── icon-shoe.svg
    │       │   ├── icon-shopify.svg
    │       │   ├── icon-silhouette.svg
    │       │   ├── icon-snapchat.svg
    │       │   ├── icon-snowflake.svg
    │       │   ├── icon-star.svg
    │       │   ├── icon-stopwatch.svg
    │       │   ├── icon-success.svg
    │       │   ├── icon-tick.svg
    │       │   ├── icon-tiktok.svg
    │       │   ├── icon-truck.svg
    │       │   ├── icon-tumblr.svg
    │       │   ├── icon-twitter.svg
    │       │   ├── icon-unavailable.svg
    │       │   ├── icon-vimeo.svg
    │       │   ├── icon-warning.svg
    │       │   ├── icon-washing.svg
    │       │   ├── icon-youtube.svg
    │       │   ├── icon-zoom.svg
    │       │   ├── loading-spinner.svg
    │       │   ├── localization-form.js
    │       │   ├── magnify.js
    │       │   ├── main-search.js
    │       │   ├── mask-arch.svg
    │       │   ├── mask-blobs.css
    │       │   ├── media-gallery.js
    │       │   ├── newsletter-section.css
    │       │   ├── password-modal.js
    │       │   ├── pickup-availability.js
    │       │   ├── predictive-search.js
    │       │   ├── price-per-item.js
    │       │   ├── product-form.js
    │       │   ├── product-info.js
    │       │   ├── product-modal.js
    │       │   ├── product-model.js
    │       │   ├── pubsub.js
    │       │   ├── quantity-popover.css
    │       │   ├── quantity-popover.js
    │       │   ├── quick-add-bulk.js
    │       │   ├── quick-add.css
    │       │   ├── quick-add.js
    │       │   ├── quick-order-list.css
    │       │   ├── quick-order-list.js
    │       │   ├── recipient-form.js
    │       │   ├── search-form.js
    │       │   ├── section-blog-post.css
    │       │   ├── section-collection-list.css
    │       │   ├── section-contact-form.css
    │       │   ├── section-email-signup-banner.css
    │       │   ├── section-featured-blog.css
    │       │   ├── section-featured-product.css
    │       │   ├── section-footer.css
    │       │   ├── section-image-banner.css
    │       │   ├── section-main-blog.css
    │       │   ├── section-main-page.css
    │       │   ├── section-main-product.css
    │       │   ├── section-multicolumn.css
    │       │   ├── section-password.css
    │       │   ├── section-related-products.css
    │       │   ├── section-rich-text.css
    │       │   ├── share.js
    │       │   ├── show-more.js
    │       │   ├── sparkle.gif
    │       │   ├── square.svg
    │       │   ├── standard-actions-override.js
    │       │   ├── template-collection.css
    │       │   ├── template-giftcard.css
    │       │   ├── theme-editor.js
    │       │   ├── video-section.css
    │       │   ├── zayado-aimant-lumiere.pdf
    │       │   ├── zayado-aimant-rituel.pdf
    │       │   ├── zayado-aimant-tresorerie.pdf
    │       │   ├── zayado-caveat-600.woff2
    │       │   ├── zayado-favoris.js
    │       │   ├── zayado-poppins-400.woff2
    │       │   ├── zayado-poppins-500.woff2
    │       │   ├── zayado-poppins-600.woff2
    │       │   ├── zayado-poppins-700.woff2
    │       │   └── zayado.css
    │       ├── config/
    │       │   ├── settings_data.json
    │       │   └── settings_schema.json
    │       ├── layout/
    │       │   ├── password.liquid
    │       │   ├── theme.liquid
    │       │   └── zayado-liens.liquid
    │       ├── locales/
    │       │   ├── bg.json
    │       │   ├── cs.json
    │       │   ├── cs.schema.json
    │       │   ├── da.json
    │       │   ├── da.schema.json
    │       │   ├── de.json
    │       │   ├── de.schema.json
    │       │   ├── el.json
    │       │   ├── en.default.json
    │       │   ├── en.default.schema.json
    │       │   ├── es.json
    │       │   ├── es.schema.json
    │       │   ├── fi.json
    │       │   ├── fi.schema.json
    │       │   ├── fr.json
    │       │   ├── fr.schema.json
    │       │   ├── hr.json
    │       │   ├── hu.json
    │       │   ├── id.json
    │       │   ├── it.json
    │       │   ├── it.schema.json
    │       │   ├── ja.json
    │       │   ├── ja.schema.json
    │       │   ├── ko.json
    │       │   ├── ko.schema.json
    │       │   ├── lt.json
    │       │   ├── nb.json
    │       │   ├── nb.schema.json
    │       │   ├── nl.json
    │       │   ├── nl.schema.json
    │       │   ├── pl.json
    │       │   ├── pl.schema.json
    │       │   ├── pt-BR.json
    │       │   ├── pt-BR.schema.json
    │       │   ├── pt-PT.json
    │       │   ├── pt-PT.schema.json
    │       │   ├── ro.json
    │       │   ├── ru.json
    │       │   ├── sk.json
    │       │   ├── sl.json
    │       │   ├── sv.json
    │       │   ├── sv.schema.json
    │       │   ├── th.json
    │       │   ├── th.schema.json
    │       │   ├── tr.json
    │       │   ├── tr.schema.json
    │       │   ├── vi.json
    │       │   ├── zh-CN.json
    │       │   ├── zh-CN.schema.json
    │       │   ├── zh-TW.json
    │       │   └── zh-TW.schema.json
    │       ├── sections/
    │       │   ├── announcement-bar.liquid
    │       │   ├── apps.liquid
    │       │   ├── bulk-quick-order-list.liquid
    │       │   ├── cart-drawer.liquid
    │       │   ├── cart-icon-bubble.liquid
    │       │   ├── cart-live-region-text.liquid
    │       │   ├── cart-notification-button.liquid
    │       │   ├── cart-notification-product.liquid
    │       │   ├── collage.liquid
    │       │   ├── collapsible-content.liquid
    │       │   ├── collection-list.liquid
    │       │   ├── contact-form.liquid
    │       │   ├── custom-liquid.liquid
    │       │   ├── disclosures.liquid
    │       │   ├── email-signup-banner.liquid
    │       │   ├── featured-blog.liquid
    │       │   ├── featured-collection.liquid
    │       │   ├── featured-product.liquid
    │       │   ├── footer-group.json
    │       │   ├── footer.liquid
    │       │   ├── header-group.json
    │       │   ├── header.liquid
    │       │   ├── image-banner.liquid
    │       │   ├── image-with-text.liquid
    │       │   ├── main-404.liquid
    │       │   ├── main-article.liquid
    │       │   ├── main-blog.liquid
    │       │   ├── main-cart-footer.liquid
    │       │   ├── main-cart-items.liquid
    │       │   ├── main-collection-banner.liquid
    │       │   ├── main-collection-product-grid.liquid
    │       │   ├── main-list-collections.liquid
    │       │   ├── main-page.liquid
    │       │   ├── main-password-footer.liquid
    │       │   ├── main-password-header.liquid
    │       │   ├── main-product.liquid
    │       │   ├── main-search.liquid
    │       │   ├── multicolumn.liquid
    │       │   ├── multirow.liquid
    │       │   ├── newsletter.liquid
    │       │   ├── page.liquid
    │       │   ├── pickup-availability.liquid
    │       │   ├── predictive-search.liquid
    │       │   ├── quick-order-list.liquid
    │       │   ├── related-products.liquid
    │       │   ├── rich-text.liquid
    │       │   ├── slideshow.liquid
    │       │   ├── video.liquid
    │       │   ├── zayado-bandeau.liquid
    │       │   ├── zayado-box-v1.liquid
    │       │   ├── zayado-cartes.liquid
    │       │   ├── zayado-collection-seo.liquid
    │       │   ├── zayado-coming-soon.liquid
    │       │   ├── zayado-communaute.liquid
    │       │   ├── zayado-contact.liquid
    │       │   ├── zayado-douleurs.liquid
    │       │   ├── zayado-entete.liquid
    │       │   ├── zayado-faq.liquid
    │       │   ├── zayado-favoris.liquid
    │       │   ├── zayado-fiche-produit.liquid
    │       │   ├── zayado-garanties.liquid
    │       │   ├── zayado-grille-produits.liquid
    │       │   ├── zayado-hero-aiguillage.liquid
    │       │   ├── zayado-hero-anime.liquid
    │       │   ├── zayado-hero-choix.liquid
    │       │   ├── zayado-hero.liquid
    │       │   ├── zayado-journal-article.liquid
    │       │   ├── zayado-journal-liste.liquid
    │       │   ├── zayado-liens.liquid
    │       │   ├── zayado-marquee.liquid
    │       │   ├── zayado-meme-style.liquid
    │       │   ├── zayado-pied.liquid
    │       │   ├── zayado-recherche.liquid
    │       │   ├── zayado-services.liquid
    │       │   ├── zayado-tarifs.liquid
    │       │   ├── zayado-tunnel.liquid
    │       │   └── zayado-univers.liquid
    │       ├── snippets/
    │       │   ├── article-card.liquid
    │       │   ├── buy-buttons.liquid
    │       │   ├── card-collection.liquid
    │       │   ├── card-product.liquid
    │       │   ├── cart-disclosure-indicator.liquid
    │       │   ├── cart-drawer.liquid
    │       │   ├── cart-notification.liquid
    │       │   ├── country-localization.liquid
    │       │   ├── facets.liquid
    │       │   ├── gift-card-recipient-form.liquid
    │       │   ├── header-drawer.liquid
    │       │   ├── header-dropdown-menu.liquid
    │       │   ├── header-mega-menu.liquid
    │       │   ├── header-search.liquid
    │       │   ├── icon-accordion.liquid
    │       │   ├── icon-with-text.liquid
    │       │   ├── language-localization.liquid
    │       │   ├── loading-spinner.liquid
    │       │   ├── meta-tags.liquid
    │       │   ├── pagination.liquid
    │       │   ├── price-facet.liquid
    │       │   ├── price.liquid
    │       │   ├── product-disclosures.liquid
    │       │   ├── product-media-gallery.liquid
    │       │   ├── product-media-modal.liquid
    │       │   ├── product-media.liquid
    │       │   ├── product-thumbnail.liquid
    │       │   ├── product-variant-options.liquid
    │       │   ├── product-variant-picker.liquid
    │       │   ├── progress-bar.liquid
    │       │   ├── quantity-input.liquid
    │       │   ├── quick-order-list-row.liquid
    │       │   ├── quick-order-list.liquid
    │       │   ├── quick-order-product-row.liquid
    │       │   ├── share-button.liquid
    │       │   ├── social-icons.liquid
    │       │   ├── swatch-input.liquid
    │       │   ├── swatch.liquid
    │       │   ├── unit-price.liquid
    │       │   ├── zayado-aimant.liquid
    │       │   ├── zayado-carte-journal.liquid
    │       │   ├── zayado-carte-produit.liquid
    │       │   ├── zayado-date.liquid
    │       │   └── zayado-icone.liquid
    │       └── templates/
    │           ├── 404.json
    │           ├── article.journal.json
    │           ├── article.json
    │           ├── blog.journal.json
    │           ├── blog.json
    │           ├── cart.json
    │           ├── collection.json
    │           ├── collection.zayado.json
    │           ├── gift_card.liquid
    │           ├── index.json
    │           ├── list-collections.json
    │           ├── page.contact.json
    │           ├── page.json
    │           ├── page.zayado-accueil.json
    │           ├── page.zayado-besoins.json
    │           ├── page.zayado-box-v1.json
    │           ├── page.zayado-cockpit.json
    │           ├── page.zayado-coming-soon.json
    │           ├── page.zayado-contact.json
    │           ├── page.zayado-diagnostic.json
    │           ├── page.zayado-favoris.json
    │           ├── page.zayado-hero-choix.json
    │           ├── page.zayado-liens.json
    │           ├── page.zayado-maison.json
    │           ├── page.zayado-reprise.json
    │           ├── password.json
    │           ├── product.json
    │           ├── product.zayado.json
    │           └── search.json
    ├── test_reports/
    │   ├── .gitkeep
    │   ├── iteration_1.json
    │   ├── iteration_10.json
    │   ├── iteration_11.json
    │   ├── iteration_2.json
    │   ├── iteration_3.json
    │   ├── iteration_4.json
    │   ├── iteration_5.json
    │   ├── iteration_6.json
    │   ├── iteration_7.json
    │   ├── iteration_8.json
    │   ├── iteration_9.json
    │   └── pytest/
    │       ├── .gitkeep
    │       ├── leads_aimants.xml
    │       └── tunnel_iter3.xml
    ├── test_result.md
    ├── tests/
    │   ├── __init__.py
    │   ├── e2e/
    │   │   └── .gitkeep
    │   ├── fixtures/
    │   │   ├── helpers.ts
    │   │   └── releves/
    │   │       ├── FEC-exemple-6-mois.txt
    │   │       ├── credit-agricole.csv
    │   │       ├── invalide.csv
    │   │       └── qonto.csv
    │   ├── package.json
    │   └── playwright.config.ts
    └── vitrine-entreprise/
        ├── .gitignore
        ├── README.md
        ├── components.json
        ├── craco.config.js
        ├── jsconfig.json
        ├── package.json
        ├── plugins/
        │   └── health-check/
        │       ├── health-endpoints.js
        │       └── webpack-health-plugin.js
        ├── postcss.config.js
        ├── public/
        │   ├── favicon.svg
        │   └── index.html
        ├── src/
        │   ├── App.css
        │   ├── App.js
        │   ├── components/
        │   │   ├── AppHeader.jsx
        │   │   ├── Footer.jsx
        │   │   ├── FunnelHeader.jsx
        │   │   ├── Logo.jsx
        │   │   ├── MarketCard.jsx
        │   │   ├── Marquee.jsx
        │   │   ├── Nav.jsx
        │   │   ├── Reveal.jsx
        │   │   ├── ServiceForm.jsx
        │   │   └── ui/
        │   │       ├── accordion.jsx
        │   │       ├── alert-dialog.jsx
        │   │       ├── alert.jsx
        │   │       ├── aspect-ratio.jsx
        │   │       ├── avatar.jsx
        │   │       ├── badge.jsx
        │   │       ├── breadcrumb.jsx
        │   │       ├── button.jsx
        │   │       ├── calendar.jsx
        │   │       ├── card.jsx
        │   │       ├── carousel.jsx
        │   │       ├── checkbox.jsx
        │   │       ├── collapsible.jsx
        │   │       ├── command.jsx
        │   │       ├── context-menu.jsx
        │   │       ├── dialog.jsx
        │   │       ├── drawer.jsx
        │   │       ├── dropdown-menu.jsx
        │   │       ├── form.jsx
        │   │       ├── hover-card.jsx
        │   │       ├── input-otp.jsx
        │   │       ├── input.jsx
        │   │       ├── label.jsx
        │   │       ├── menubar.jsx
        │   │       ├── navigation-menu.jsx
        │   │       ├── pagination.jsx
        │   │       ├── popover.jsx
        │   │       ├── progress.jsx
        │   │       ├── radio-group.jsx
        │   │       ├── resizable.jsx
        │   │       ├── scroll-area.jsx
        │   │       ├── select.jsx
        │   │       ├── separator.jsx
        │   │       ├── sheet.jsx
        │   │       ├── skeleton.jsx
        │   │       ├── slider.jsx
        │   │       ├── sonner.jsx
        │   │       ├── switch.jsx
        │   │       ├── table.jsx
        │   │       ├── tabs.jsx
        │   │       ├── textarea.jsx
        │   │       ├── toast.jsx
        │   │       ├── toaster.jsx
        │   │       ├── toggle-group.jsx
        │   │       ├── toggle.jsx
        │   │       └── tooltip.jsx
        │   ├── constants/
        │   │   └── testIds/
        │   │       ├── auth.js
        │   │       ├── home.js
        │   │       └── index.js
        │   ├── context/
        │   │   └── CartContext.jsx
        │   ├── data/
        │   │   ├── catalogue.js
        │   │   ├── content.js
        │   │   ├── diagnosticLib.js
        │   │   ├── images.js
        │   │   └── quiz.js
        │   ├── hooks/
        │   │   ├── use-toast.js
        │   │   └── usePageMeta.js
        │   ├── index.css
        │   ├── index.js
        │   ├── lib/
        │   │   ├── api.js
        │   │   └── utils.js
        │   └── pages/
        │       ├── Besoins.jsx
        │       ├── BoxPage.jsx
        │       ├── BoxPreco.jsx
        │       ├── Checkout.jsx
        │       ├── Cockpit.jsx
        │       ├── ComingSoon.jsx
        │       ├── Diagnostic.jsx
        │       ├── Favoris.jsx
        │       ├── FichePage.jsx
        │       ├── HeroChoix.jsx
        │       ├── Home.jsx
        │       ├── Journal.jsx
        │       ├── JournalArticle.jsx
        │       ├── MaisonPage.jsx
        │       ├── Marketplace.jsx
        │       ├── Merci.jsx
        │       ├── Panier.jsx
        │       ├── PaymentResult.jsx
        │       ├── Services.jsx
        │       ├── TunnelHome.jsx
        │       ├── TunnelPage.jsx
        │       └── Vision.jsx
        └── tailwind.config.js



## 3. Mission confiée à l'IA

Agis comme un **architecte logiciel senior et ingénieur full-stack**,
avec une approche prudente, fondée sur les preuves du dépôt.

Tu dois :

1.  Cartographier l'architecture existante et les flux entre ses
    composants.
2.  Identifier les points d'entrée réellement utilisés, les applications
    actives, les dépendances et les configurations de déploiement.
3.  Repérer les responsabilités mal séparées, les duplications
    confirmées, les dépendances circulaires éventuelles et les sources
    de vérité concurrentes.
4.  Proposer une architecture cible cohérente avec les technologies et
    contraintes réellement utilisées.
5.  Définir une migration progressive, par lots petits et vérifiables.
6.  Appliquer les changements uniquement après avoir établi leur portée
    et leurs effets possibles.
7.  Vérifier les imports, les tests, les builds, les intégrations et les
    déploiements concernés après chaque lot.
8.  Documenter les changements réalisés, les risques restants et les
    décisions qui nécessitent une validation humaine.

Ne conclus pas qu'un élément est inutile simplement parce qu'il semble
ancien, similaire à un autre ou absent d'un chemin d'import direct.
Vérifie aussi les imports dynamiques, les routes, les scripts, les
configurations, les commandes de déploiement, les appels externes et les
usages opérationnels.

## 4. Principes impératifs de travail

### 4.1 Préserver le fonctionnement existant

-   Ne réalise aucune réécriture globale non justifiée.
-   Ne supprime aucun fichier avant d'avoir vérifié ses usages et
    dépendances.
-   Ne modifie pas le comportement fonctionnel d'un module dans le cadre
    d'une simple réorganisation, sauf si cette modification est
    explicitement demandée et isolée.
-   Préserve les contrats d'API, les noms de routes, les formats de
    données, les variables d'environnement et les intégrations
    existantes, sauf décision documentée et validée.
-   Évite les modifications sans rapport direct avec l'objectif du lot
    en cours.
-   Ne remplace pas une fonctionnalité existante par un exemple
    simplifié, un mock ou une implémentation provisoire.

### 4.2 Fonder les décisions sur le dépôt

Avant toute modification, inspecte les fichiers réellement présents et
lis leur contenu. Ne suppose pas qu'un fichier a le contenu habituel
associé à son nom.

Pour toute proposition de déplacement, suppression ou fusion, établis
: - les références et imports trouvés ; - les scripts ou configurations
concernés ; - les applications et environnements qui utilisent le
fichier ; - les impacts possibles sur les tests et le déploiement ; - la
stratégie de compatibilité et de retour arrière.

Si des informations essentielles manquent, pose une question précise ou
présente les vérifications nécessaires. Ne fabrique ni fichiers, ni
fonctions, ni routes, ni types, ni dépendances.

### 4.3 Sécurité et données sensibles

-   Ne publie et ne reproduis pas le contenu des bases de données,
    fichiers RH privés, jetons, secrets ou identifiants.
-   Vérifie leur présence dans Git, les règles `.gitignore`, les
    historiques et les mécanismes de déploiement.
-   Ne supprime, ne déplace et ne modifie pas une base de données sans
    comprendre son rôle, ses sauvegardes et ses consommateurs.
-   Si un secret semble avoir été exposé dans Git, signale le risque et
    propose une procédure de rotation adaptée. Le retrait du fichier
    seul ne suffit pas nécessairement.
-   Distingue les fichiers de données nécessaires au fonctionnement des
    artefacts locaux ou temporaires.

### 4.4 Tests et traçabilité

-   Établis un état de référence avant les changements.
-   Exécute les tests pertinents disponibles et enregistre les
    résultats, y compris les échecs préexistants.
-   Après chaque lot, lance les vérifications ciblées, puis les
    vérifications globales pertinentes.
-   Ne prétends jamais qu'un test ou un build a réussi s'il n'a pas
    réellement été exécuté.
-   Conserve un historique clair des fichiers modifiés, des raisons, des
    résultats et des limites de validation.
-   Prévois une possibilité de retour arrière pour les changements
    structurels.

## 5. Risques d'architecture à vérifier

Les points suivants sont des **hypothèses d'audit**, pas des défauts
confirmés.

### 5.1 Applications frontend multiples

Comparer `frontend/`, `vitrine-entreprise/` et
`exports/zayado-entreprise/Zayado-Entreprise-main/frontend/`.

Vérifier pour chacune : - son rôle fonctionnel ; - son point d'entrée
; - son `package.json` et ses scripts ; - ses dépendances et sa
configuration de build ; - ses routes et ses variables d'environnement
; - son usage dans Railway ou dans tout autre déploiement ; - ses
éventuelles dépendances avec les fichiers situés dans `exports/`.

Ne fusionner ni ne supprimer ces applications avant d'avoir établi si
elles sont indépendantes, actives, archivées ou utilisées comme source
d'export.

### 5.2 Backend Python

Le répertoire `backend/` contient de nombreux modules à la racine, des
modèles, des routeurs, des utilitaires et des tests. Vérifier si cette
organisation crée réellement des difficultés de maintenance.

Examiner notamment : - le rôle de `backend/server.py` ; - les imports
entre modules `*_ext.py`, `routers/`, `models/` et `lib/` ; -
l'enregistrement des routes et les dépendances communes ; - les accès à
la base de données ; - la configuration, les logs, la sécurité et les
tâches de fond ; - les frontières entre logique métier, transport HTTP
et persistance.

La séparation en couches doit clarifier les responsabilités sans créer
une abstraction inutile ni multiplier les fichiers artificiellement.

### 5.3 Sources de vérité concurrentes

Des fonctionnalités ou composants apparentés semblent présents dans
plusieurs emplacements, notamment `frontend/src/zy/`,
`frontend/src/pages/`, `frontend/src/components/`, `exports/` et
`shopify/`.

Pour chaque domaine fonctionnel, identifier explicitement : -
l'implémentation active ; - les éventuelles variantes historiques ou
spécifiques à un canal ; - les consommateurs ; - les données et contrats
partagés ; - la source officielle à maintenir à l'avenir.

Ne pas fusionner des composants simplement parce que leurs noms sont
proches : comparer leur rôle, leurs comportements et leurs
consommateurs.

### 5.4 Tests, archives et documentation

Les tests, rapports et documents sont répartis dans plusieurs
emplacements, notamment `backend/tests/`, `tests/`, `test_reports/`,
`exports/` et des archives de tests distants.

Distinguer : - les tests exécutés dans la CI ou le déploiement ; - les
tests unitaires, d'intégration et de bout en bout ; - les fixtures
nécessaires ; - les rapports historiques ; - les archives conservées
pour référence.

Ne déplace pas les tests sans mettre à jour les configurations, les
chemins, les commandes et les pipelines concernés.

### 5.5 Données locales et fichiers sensibles

Vérifier avec précaution : - `backend/kairos.db` ; -
`backend/assets/rh/prive.xlsx` ; - `memory/.tok_local` ; - les autres
fichiers de données, secrets ou artefacts détectés lors de l'audit.

Leur présence dans l'arborescence ne suffit pas à déterminer s'ils
doivent être conservés, exclus de Git ou migrés. Toute décision doit
être fondée sur leur usage et les besoins de déploiement.

## 6. Architecture cible indicative

La proposition ci-dessous est une **hypothèse de destination**, à
valider après l'audit. Elle ne doit pas être appliquée mécaniquement.

``` text
ReactZayado/
├── apps/
│   ├── web/                    # Application React principale, si confirmé
│   ├── vitrine/                # Site public, s’il est indépendant
│   └── whatsapp-service/       # Service Node.js existant
├── backend/
│   ├── app/
│   │   ├── main.py             # Point d’entrée, après vérification
│   │   ├── api/
│   │   │   ├── routers/
│   │   │   └── dependencies.py
│   │   ├── core/               # Configuration, sécurité, logs
│   │   ├── models/             # Modèles de données
│   │   ├── schemas/             # Contrats et validation
│   │   ├── services/            # Logique métier
│   │   ├── repositories/        # Accès aux données
│   │   ├── integrations/        # Shopify, Teams et autres intégrations
│   │   └── utils/
│   ├── tests/
│   ├── migrations/
│   ├── requirements.txt
│   └── Dockerfile
├── packages/
│   ├── ui/                      # Composants réellement partagés
│   ├── shared-types/            # Types communs justifiés
│   └── config/                  # Configuration partagée pertinente
├── shopify/
│   ├── theme/
│   ├── theme-v2/
│   ├── outils/
│   └── produits/
├── tests/
│   ├── e2e/
│   ├── fixtures/
│   └── playwright.config.ts
├── docs/
│   ├── architecture/
│   ├── deployment/
│   └── features/
├── scripts/
├── archives/                    # Uniquement après audit et validation
├── .gitignore
├── README.md
└── package.json                 # Workspace racine, uniquement si pertinent
```

### Conditions d'adoption de cette cible

-   `apps/web/` ne doit reprendre `frontend/` qu'après validation des
    scripts, imports et déploiements.
-   `apps/vitrine/` ne doit exister que si la vitrine constitue bien une
    application distincte et active.
-   Le service WhatsApp reste indépendant si ses contraintes de
    déploiement le nécessitent.
-   `exports/` ne doit pas être supprimé ou absorbé avant d'avoir
    identifié ses usages réels.
-   Shopify reste séparé des applications React : Liquid, templates
    JSON, configuration et ressources du thème suivent leur propre cycle
    de déploiement.
-   Le backend ne doit migrer vers `backend/app/` que par étapes, avec
    maintien des points d'entrée requis par les configurations
    existantes.
-   Un workspace racine ne doit être ajouté que si les outils, scripts
    et déploiements peuvent le prendre en charge sans régression.

## 7. Plan d'intervention obligatoire

### Phase 1 --- Établir l'état de référence

1.  Examiner le README et les documents d'architecture et de
    déploiement.
2.  Lire les fichiers `package.json`, `requirements.txt`, Dockerfiles,
    configurations Railway, fichiers Vite et commandes de démarrage.
3.  Identifier les points d'entrée frontend, backend et service
    WhatsApp.
4.  Repérer les workflows CI/CD et les environnements de déploiement.
5.  Exécuter les tests et builds réalisables sans modifier le code.
6.  Produire une synthèse des commandes exécutées, des résultats et des
    limites.

**Livrable :** carte de l'architecture actuelle et état initial des
tests.

### Phase 2 --- Cartographier les dépendances et les domaines

1.  Construire la carte des applications et des communications entre
    elles.
2.  Recenser les routes API, les intégrations externes et les principaux
    flux de données.
3.  Identifier les modules métier et leurs dépendances.
4.  Comparer les implémentations potentiellement dupliquées.
5.  Vérifier les usages des fichiers sensibles et locaux sans divulguer
    leur contenu.
6.  Distinguer les constats prouvés des hypothèses.

**Livrable :** registre des risques, des doublons confirmés, des sources
de vérité et des dépendances critiques.

### Phase 3 --- Définir et faire valider la cible

Pour chaque problème confirmé, présenter : - le problème et les preuves
; - la solution proposée ; - les fichiers et applications concernés ; -
les risques et la stratégie de compatibilité ; - les tests de validation
; - le plan de retour arrière ; - les bénéfices attendus et les coûts de
migration.

Prioriser les corrections selon leur impact, leur risque et leur
dépendance à d'autres travaux.

**Livrable :** plan de migration séquencé, avec les décisions bloquantes
clairement signalées.

### Phase 4 --- Réorganiser le backend par petits lots

1.  Commencer par un domaine bien délimité et compris.
2.  Séparer progressivement les responsabilités si l'audit confirme que
    cela est utile.
3.  Maintenir des interfaces compatibles pendant la transition lorsque
    nécessaire.
4.  Mettre à jour les imports et les tests dans le même lot.
5.  Vérifier le démarrage du backend et les routes concernées avant de
    poursuivre.

Ne pas déplacer tous les modules `*_ext.py` en une seule opération.

### Phase 5 --- Clarifier le frontend

1.  Déterminer la responsabilité de `pages/`, `zy/`, `components/`,
    `features/` et `lib/`.
2.  Identifier les composants réellement réutilisables et les
    fonctionnalités propriétaires à un domaine.
3.  Détecter les duplications confirmées et les dépendances croisées.
4.  Proposer une organisation par domaine fonctionnel si elle correspond
    au code réel.
5.  Conserver les URL, routes, parcours, contrats API et comportements
    actuels.
6.  Valider le build et les parcours fonctionnels après chaque lot.

### Phase 6 --- Shopify, exports et applications annexes

1.  Confirmer le mode de déploiement du thème Shopify et ses sources de
    publication.
2.  Vérifier les liens entre `shopify/`, les exports et les
    applications.
3.  Conserver distincts les artefacts nécessaires à la boutique et ceux
    qui sont uniquement des copies de travail.
4.  Ne modifier les thèmes, templates ou ressources publiés qu'avec une
    validation ciblée.

### Phase 7 --- Sécurité, documentation et nettoyage

1.  Vérifier `.gitignore`, le suivi Git des fichiers sensibles et les
    éventuels secrets exposés.
2.  Clarifier la gestion des bases locales, sauvegardes et données de
    test.
3.  Ranger les rapports et archives uniquement après validation de leur
    rôle.
4.  Mettre à jour la documentation d'installation, de développement, de
    test et de déploiement.
5.  Vérifier les pipelines et les déploiements concernés.

## 8. Périmètre de tests à protéger

Le plan de tests doit être adapté aux fonctionnalités réellement
présentes. À minima, vérifier les domaines pertinents suivants
lorsqu'ils sont concernés par les modifications :

-   démarrage et santé du backend ;
-   compilation et démarrage du frontend ;
-   authentification, autorisations et gestion des sessions ;
-   routes API et contrats de données ;
-   paiements, abonnements et tunnels publics ;
-   intégrations Shopify ;
-   intégrations Google, Microsoft Teams et WhatsApp, lorsqu'elles sont
    affectées ;
-   gestion des entreprises et des données ;
-   tests de sécurité et de configuration ;
-   tests de bout en bout déjà configurés.

La liste des fichiers de test visible dans l'arborescence ne garantit
pas que tous ces scénarios soient couverts. Il faut vérifier le contenu
des tests et leur exécution réelle.

## 9. Format attendu des comptes rendus de l'IA

À chaque phase, fournir un compte rendu concis et vérifiable selon ce
modèle :

### A. Constats confirmés

-   Problème :
-   Preuves observées dans le dépôt :
-   Conséquence :

### B. Hypothèses à vérifier

-   Hypothèse :
-   Vérification nécessaire :
-   Risque si elle est incorrecte :

### C. Décision proposée

-   Solution :
-   Fichiers concernés :
-   Compatibilité :
-   Risques :
-   Retour arrière :

### D. Exécution

-   Modifications effectuées :
-   Tests réellement exécutés :
-   Résultats :
-   Régressions ou échecs :
-   Points non vérifiés :

### E. Étape suivante

-   Prochaine action limitée :
-   Prérequis :
-   Validation requise :

Ne présente jamais une hypothèse comme un constat. Ne déclare pas une
migration terminée si les validations essentielles n'ont pas été
effectuées.

## 10. Critères d'acceptation de la refonte

La refonte est considérée comme satisfaisante lorsque :

-   chaque application active et son mode de déploiement sont identifiés
    ;
-   les responsabilités des principaux modules sont documentées ;
-   les sources de vérité des fonctionnalités importantes sont
    explicites ;
-   les duplications signalées sont confirmées et traitées sans
    supprimer d'usage valide ;
-   les dépendances entre applications et intégrations sont comprises ;
-   les changements sont réalisés par lots contrôlés et réversibles ;
-   les builds, tests et vérifications ciblés sont exécutés et leurs
    résultats documentés ;
-   les secrets et données sensibles sont traités avec prudence ;
-   les configurations Railway, Docker et autres environnements
    concernés restent cohérentes ;
-   les documents techniques permettent à un autre développeur de
    comprendre et maintenir l'architecture.

## 11. Première instruction à exécuter

**Ne commence pas par déplacer ou supprimer des fichiers.**

Commence par auditer le dépôt existant et livre :

1.  la liste des applications et services réellement actifs ;
2.  les points d'entrée et commandes de démarrage de chacun ;
3.  les configurations de build et de déploiement ;
4.  une carte des dépendances majeures ;
5.  les sources de vérité possibles par domaine fonctionnel ;
6.  les risques confirmés et les hypothèses à vérifier ;
7.  l'état initial des tests et builds ;
8.  un plan de refonte priorisé, avec les fichiers concernés et les
    validations nécessaires.

Après cette première restitution, attends la validation du plan avant
toute migration structurelle importante. Les corrections autonomes ne
doivent commencer que lorsqu'elles sont limitées, justifiées, testables
et réversibles.


## 12.Contrainte impérative : préserver le fonctionnement du système après la refonte
La refonte de l’architecture ne doit, en aucun cas, casser le système existant ni provoquer une régression fonctionnelle, technique ou opérationnelle. L’objectif est d’améliorer progressivement l’architecture du SaaS, sans compromettre les fonctionnalités déjà opérationnelles, les données, les intégrations ou les déploiements.

L’IA doit respecter les règles suivantes :

1. Préserver l’existant. Avant toute modification, identifier les fonctionnalités opérationnelles, les points d’entrée, les dépendances, les contrats d’API, les variables d’environnement, les intégrations externes et les mécanismes de déploiement concernés.

2. Ne jamais effectuer de refonte destructive. Aucun fichier, module, composant, endpoint, modèle de données, service ou configuration ne doit être supprimé, remplacé ou déplacé sans avoir vérifié ses dépendances et son rôle réel dans le système.

3. Procéder par étapes contrôlées. Réaliser les modifications par petits lots cohérents, indépendants autant que possible, afin de pouvoir identifier précisément l’origine d’une éventuelle régression et revenir sur les changements concernés.

4. Maintenir la compatibilité. Toute modification doit préserver les contrats existants utilisés par les autres modules, le frontend, le backend, les services externes et les clients de l’API. Si une incompatibilité est inévitable, prévoir une transition explicite et contrôlée avant de supprimer l’ancien fonctionnement.

5. Établir un état de référence avant chaque intervention. Examiner les tests disponibles, les commandes de démarrage, les procédures de compilation, les configurations de déploiement et les fonctionnalités critiques. Lorsque cela est possible, exécuter les vérifications initiales et consigner les erreurs préexistantes pour ne pas les confondre avec celles introduites par la refonte.

6. Valider chaque modification avant de poursuivre. Après chaque lot, exécuter les tests pertinents, vérifier les imports, les types, la compilation, le démarrage des services et les intégrations concernées. Une modification ne doit pas être considérée comme validée uniquement parce que le code semble correct.

7. Protéger les données et les configurations. Ne jamais réinitialiser, supprimer, migrer de manière irréversible ou écraser une base de données, un fichier métier, un secret, une configuration ou un environnement de production sans procédure de sauvegarde, de migration et de restauration adaptée.

8. Prévoir un retour arrière. Chaque étape significative doit être réversible à l’aide du contrôle de version ou d’une procédure documentée. Les migrations de données et les changements de configuration doivent également disposer d’une stratégie de récupération adaptée.

9. Ne pas masquer les problèmes. Ne pas désactiver des tests, supprimer des fonctionnalités, contourner des contrôles, introduire des doublons temporaires non maîtrisés ou modifier les résultats attendus simplement pour faire passer la compilation ou les tests.

10. Respecter les limites de validation. Si les tests nécessaires ne peuvent pas être exécutés, si une dépendance est inconnue ou si le risque d’une modification ne peut pas être évalué, l’IA doit le signaler clairement et suspendre l’étape risquée jusqu’à obtention des informations ou validations nécessaires.
Règle de décision
En cas de conflit entre une amélioration architecturale et la stabilité du système, la stabilité du système est prioritaire.

L’IA doit privilégier une évolution progressive, compatible et vérifiable plutôt qu’une réorganisation globale immédiate. Elle ne doit jamais prétendre qu’une refonte est sans risque ni déclarer le système stable sans vérifications suffisantes.

Condition de passage à l’étape suivante : chaque lot de modifications doit avoir un périmètre identifié, un résultat attendu, des vérifications adaptées et une solution de retour arrière. Toute anomalie nouvelle doit être analysée et corrigée avant de poursuivre la refonte sur les éléments concernés.
------------------------------------------------------------------------

**Note de portée :** ce guide est construit à partir de l'arborescence
et des observations fournies. Il ne constitue pas un audit technique du
code source complet. Toute conclusion sur l'usage réel d'un fichier, la
qualité d'une implémentation ou le fonctionnement d'un déploiement doit
être confirmée par l'inspection du dépôt et l'exécution des
vérifications adaptées.
