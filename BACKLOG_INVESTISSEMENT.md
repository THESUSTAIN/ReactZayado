# Backlog complet — conditions d'investissement (MyExtension AI)

> Livré ce tour (✅) : Panneau IA persistant, Accueil Vision (Score Business 6 piliers),
> cartes intelligentes reliées + badges IA, Analyse IA (SWOT/incohérences via Claude),
> Notification ↔ Chat + sources conditionnelles (URSSAF/barèmes). Tests 100% backend & frontend.

---

## TRANCHE 1 — "Board vivant" prouvé (débloque le 1er financement)
Objectif : la démo « le board se met à jour tout seul » est irréfutable.

1. **Modèle de données unifié** — chaque carte référence une entité réelle (`clientId/dealId/invoiceId/projectId`). *(point technique n°1)*
2. **Moteur d'événements temps réel (SSE/WebSocket)** — un changement CRM/Finance met à jour carte + score + panneau IA sans refresh (aujourd'hui : polling 60 s).
3. **Auto-pose des cartes intelligentes sur le canvas** (pas seulement l'Accueil) : Vision→Objectif→CA→Impact→Clients avec connecteurs.
4. **Score Business unique & documenté** — figer la formule des 6 piliers (aujourd'hui heuristique), enlever le "delta plancher" de démo.
5. **Onglets Vision restants** : Timeline (Aujourd'hui→10 ans), KPI Vision (graphes + prévisions), Historique/versioning, Partage (lecture/commentaire/lien public/export PDF & image/plein écran).

## TRANCHE 2 — IA agentique + Hub IA (débloque le 2e financement)
Objectif : la démo « l'agent source une vraie opportunité ».

6. **Agent Prospection (Proactive Discovery)** — post-it "cible" → pastilles d'entreprises réelles sur le board, **sources traçables + opt-in RGPD** + quotas par plan.
7. **Agent Livraison (Hub IA)** — messages proactifs contextualisés ("tu vises 1 M€, voici un partenariat…").
8. **Notifications PWA réelles (Web Push)** — service worker + VAPID (clés déjà présentes) ; tap → ouvre le Hub IA (le routage chat est déjà branché).
9. **Analyse IA complète** — brancher réellement le LLM en sortie JSON stable (fallback déjà OK), + questions IA ("Pourquoi 1 M€ ?").
10. **Digest sectoriel avec sources** — flux d'actualité (URSSAF, barèmes, veille) alimenté par une vraie source, pas curé.

## TRANCHE 3 — Rétention, monétisation, conformité, scale (débloque le scale)
11. **Kairos (dimension valeurs)** — 100% opt-in : filtre de valeurs sur le board, alerte douce si action CRM contredit une valeur, ancres (versets/stoïcisme/citations business/valeurs perso) configurables.
12. **Passeport / Gamification** — paliers de score débloquant des agents avancés (Négociateur, Stratège M&A) ; **score = KPI réels** uniquement.
13. **Bibliothèque de 3 Packs IA phares** — Startup, Investisseur 360°, Freelance (l'IA enrichit le canvas sans le remplacer).
14. **Paiements & abonnements** — **Mollie** (Free/Pro 29€/Business 79€/Enterprise 299€), gestion crédits/quota IA. *(Mollie, pas Stripe — préférence produit confirmée ; `mollie-api-python` déjà présent côté backend)*
15. **Intégrations B2B** — Email (Brevo/Resend), WhatsApp (relances), connexions bancaires (CA réel), CRM externes.
16. **Maîtrise du coût IA** — routing multi-modèles (scoring→low-cost, raisonnement→Claude/GPT), cache SWOT/scores, budget IA/plan. *(condition n°1 de marge >75%)*
17. **Conformité RGPD prospection** — sources whitelistées/traçables, opt-in, journal, purge (cron déjà présent).
18. **Métriques d'activation & rétention** — instrumentation (activation, churn, LTV/CAC) avant d'ouvrir le robinet du scale.

---

## Dettes techniques à traiter (relevées en test)
- `vision_brain.py` : SQL avec backticks `key` (MySQL) — passe en SQLite mais quoter en `"key"` pour portabilité.
- Retirer le "delta hebdo = 4 quand 0" (concession démo) avant prod.
- Lien magique consommé 2× via React.StrictMode → `?error=link_failed` (bouton démo fiable en attendant).

---

## Conditions de décaissement (rappel)
- **T1** : board vivant + panneau IA + Analyse IA en démo réelle → ✅ socle livré, reste 1-5.
- **T2** : agent Prospection + sources conformes + Hub IA/notifs PWA.
- **T3** : coût IA/user prouvé < seuil + activation/rétention mesurées → scale (Kairos, Passeport, packs, intégrations).

---

## MàJ 2026-08-08 — Déploiement Railway
- ✅ **`public-site`** : dossier + `railway.json` (NIXPACKS) + `nixpacks.toml` + `serve -s dist` fournis → **blocage résolu** (configurer Root Directory = `public-site` dans Railway).
- ✅ **`WhatsApp-service`** : dossier + `railway.json` (Dockerfile) + `Dockerfile` (Chromium/Puppeteer) + healthcheck `/health` → **blocage résolu** (Root Directory = `_legacy/app-main/WhatsApp-service`, monter un volume sur `/data/wa-sessions`, définir les env vars).
- ⏳ Restant côté déploiement : migration SQLite→Postgres, variables d'env prod (OAuth/VAPID/Mollie), monitoring.
