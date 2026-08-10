# Audit senior — MyExtension AI (Zayado) · page Vision + app globale

> Casquette : dev + design + commercial senior, décision d'investissement 5 Md.
> Verdict : le socle est **réel et impressionnant** (≈80 routes backend, auth passwordless,
> Vision Board canvas, Cockpit, Pilotage, Croissance, Bien-être, Studio, IA multi-provider).
> Ce n'est PAS un prototype. Le travail restant est du **cadrage produit**, pas de la reconstruction.

---

## 0. État à l'installation (fait)
- ✅ Projet exporté (stack SQLAlchemy async + SQLite fallback + client IA Mammouth/Emergent)
  réinstallé et **opérationnel** dans l'environnement Emergent (backend `:8001` via supervisor,
  frontend CRA/craco `:3000`, SQLite local).
- ✅ IA basculée sur `AI_PROVIDER=emergent` + `EMERGENT_LLM_KEY` (Claude Sonnet 4.6) — plus besoin
  de la clé Mammouth pour la démo.
- ✅ Compte démo Thomas peuplé (finance 30, wellness 25, conversations 30, leads, habitudes…).

### 🐛 Bug corrigé (impact démo n°1 "board vivant")
`/api/vision/board/live-data` calculait le **CA du mois depuis `bank_transactions`** (table vide
en démo) → carte affichait **0 €** alors que 21 600 € de revenus existaient dans `finance_entries`.
C'est précisément le "auto-update fake" redouté. **Fix** : fallback sur `finance_entries` (revenu,
mois courant), cohérent avec `/api/dashboard`. La carte affiche désormais **21 600 € (100%)**.

---

## 1. Jugement sur les notes du collègue (validation investisseur)

### ✅ À GARDER — c'est l'ADN / le moat
- **Vision Board = cockpit vivant** (cartes recalculées via données CRM/Finance). C'est le
  différenciateur vs Miro/Canva. Le socle existe (cartes live CA/Bien-être/Prospects) → à amplifier.
- **Cartes intelligentes auto-alimentées** : preuve de valeur en 5 s. Prioritaire.
- **Panneau IA persistant à droite** : présent sur le Cockpit, **absent/masqué sur le Board** → à rendre persistant partout.
- **IA agentique / Proactive Discovery** (pastilles d'entreprises réelles depuis un post-it cible) : le "wow" investisseur. À encapsuler dans un agent avec **sources traçables + opt-in** (RGPD).
- **Notif PWA → ouvre le Chat → l'IA explique** avec icône de source (style Perplexity) : excellent pour rétention/confiance.

### 🟠 À GARDER MAIS CADRER
- **Kairos (valeurs/versets)** : fort émotionnellement → **100% opt-in, désactivé par défaut**, sources configurables (versets / stoïcisme / citations business / valeurs perso). Sinon segmentation B2B.
- **Gamification "Passeport"** (score débloque agents avancés) : bonne mécanique d'upsell → le score doit refléter des **KPI réels** (Vision/Exécution/Finance/Impact/Énergie/Croissance), pas du vanity.
- **Prospection web** : conformité RGPD, opt-in, sources whitelistées (registres publics, API tierces licites), jamais de scraping opaque.

### 🔴 À SIMPLIFIER / SÉQUENCER (dette de scope)
- **8 sous-pages Vision d'un coup** → livrer d'abord Accueil Vision + Board + Analyse IA. Timeline/KPI/Packs/Historique/Partage en itérations.
- **20+ types de cartes** → démarrer avec 8–10 types à haute valeur (Vision, Objectif, KPI, CA, Impact, Client, Projet, Post-it, Valeurs).
- **Canvas infini pleine puissance** (dessin libre, mindmap, connecteurs complexes) → canvas performant d'abord (déjà en place), outils avancés ensuite.
- **Trop de Packs IA verticaux** → 3 packs phares : **Startup, Investisseur 360°, Freelance**.

---

## 2. Ce que j'ai vu dans l'app (constats concrets)
| Zone | État | Action |
|---|---|---|
| Login passwordless + démo Thomas | ✅ Fonctionne | Corriger double-consommation StrictMode du lien magique |
| Cockpit (hero, énergie, score) | ✅ Beau | Résoudre la course "cartes vides au 1er chargement" (seed à la volée) |
| Vision Board — canvas | ✅ Présent (node "MA VISION", toolbar Texte/Image/Liste/Lien/Couleur/IA/AI Doc, zoom, save SQL) | Enrichir : auto-poser 6–8 cartes intelligentes reliées |
| Cartes live (CA/Bien-être/Prospects) | ✅ **Corrigé** | Ajouter cartes Objectif principal, Impact, Priorité IA |
| Panneau IA à droite (Board) | ⚠️ Non persistant | Rendre persistant : score d'alignement, opportunités (avec sources), actions, modules suggérés |
| Analyse IA (SWOT/incohérences) | ⚠️ Onglet "Analyse & Validation" présent | Brancher SWOT auto + détection d'incohérences (ex : vision=Liberté / agenda=80h) |
| Notif ↔ Chat | ⚠️ Chat co-pilote présent | Router les notifs PWA vers l'ouverture du Chat + explication IA + sources |
| Kairos / Passeport / Discovery | ❌ Non exposés | À construire (opt-in, sources, paliers) |

---

## 3. Roadmap de correction séquencée (recommandée)
- **Bloc A — Board vivant (démo n°1)** : panneau IA persistant à droite + auto-poser 6–8 cartes intelligentes reliées (Vision→Objectif→CA→Impact→Clients) + badges IA. *(1–2 itérations)*
- **Bloc B — Analyse IA réelle** : SWOT auto + score par pilier + détection d'incohérences via Claude. *(1 itération)*
- **Bloc C — Notif ↔ Chat + sources** : tap notif → Chat → explication IA + icônes de source (Perplexity-style). *(1 itération)*
- **Bloc D — Agent Prospection (démo n°2)** : post-it "cible" → pastilles d'entreprises réelles avec sources + opt-in RGPD. *(1–2 itérations)*
- **Bloc E — Rétention/monétisation** : Kairos (opt-in), Passeport/gamification KPI-réels, 3 Packs IA phares. *(1–2 itérations)*

> Ordre pour convaincre l'investissement : A (board qui bouge seul) → D (agent qui source une vraie opportunité) → métriques d'activation + coût IA maîtrisé avant scale.
