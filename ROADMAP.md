# 🗺️ ROADMAP — MyExtension AI (outil) × Zayado (écosystème) × TheSustain (spirituel)

> **Produit (1 phrase) :** *MyExtension AI est le copilote IA qui transforme votre vision en actions quotidiennes pour développer votre entreprise sans vous épuiser.*
> **Hiérarchie marque :** Zayado = entreprise/écosystème · MyExtension AI = l'outil · TheSustain = la profondeur spirituelle.
> Statut : plan validé avec le fondateur (conversations d'audit). Réutilise l'existant au maximum.

---

## Principes directeurs
- **Un seul fil narratif** (pas 8 modules en silo) : Vision → Action → Énergie.
- **Sobriété UX** : navigation réduite, quota crédits caché sauf près de la limite.
- **Sécurité/RGPD d'abord** (secrets, données santé, données foi = sensibles).
- **Réutiliser** : WhatsApp Cloud API, notifications, agent chat, crons, image studio, gdrive/onedrive, seedChristianHabits, affiliation (base) existent déjà.

---

## P0 — Fondations & récit (bloquant investisseur)

### 0.1 Sécurité prod (déjà fait en local, à répliquer en prod)
- [prod] Rotation secrets JWT/FERNET · purge historique git (secrets + zayado.db) · CORS strict + headers sécurité.
- [fait local] env.example assaini, .gitignore durci, 2FA login, magic-link usage unique, CI gitleaks.

### 0.2 Onboarding narratif (réécriture de Onboarding.jsx)
Parcours : **Vision/Pourquoi → Analyse (SWOT) → Ancrage/rappels → Bien-être → Action (pilotage + tâches/clients) → 1er document créé & rangé dans le Drive.**
- L'IA **propose** 3 tâches prioritaires (déduites Vision+SWOT), puis **sync** Agenda/Drive optionnelle.
- Mettre en avant **UNE « prochaine action »** (anti-surcharge).
- Bifurcation **Sens/Foi** : Semence (tous, citations sagesse/nature) + Explicite chrétien opt-in (versets sans commentaire + « i » → thesustain.net/bible).
- Fin d'onboarding = vision scellée + 1er plan + 1er doc rangé.

### 0.3 Navigation & marque
- Nav réduite : **Cockpit · Vision · Travail · Pilotage · Bien-être · Brief**. Fusionner Croissance→Travail. Automatisations→Paramètres. Simulation = laissé de côté (chantier étudiants ultérieur).
- Marque : outil = « MyExtension AI » (emails transactionnels, tagline *by Zayado*) ; commerce/espace/boutique = « Zayado ». Footer app : *MyExtension AI est un produit Zayado.*

### 0.4 Indice d'Alignement (différenciateur mesurable)
- Score visible en continu : alignement actions ↔ vision ↔ énergie. North Star produit.

---

## P1 — Engagement quotidien & monétisation

### 1.1 « Le Point du jour » (notifications → chat proactif)
- Moteur **Signals** (cron hors process web) → écrit des insights par user ; le chat s'ouvre pré-rempli ; icône notif animée.
- Onglet **« Échéances & Obligations »** : moteur de **règles fiscales/sociales** (profil + pays + année), seuils/lois versionnés (SMIC, plafonds), « i » → source officielle, appel rapide URSSAF/impôts contextuel.
- Contenus : actu Zayado (interne) + rappels fiscaux (règles) + actu légale sourcée (LLM+RSS, avec disclaimer).
- Diffusion multicanale (réutilise l'existant) : **Email (Brevo) → Telegram → WhatsApp (Cloud API, templates Meta)**. Réponses two-way dans le même fil agent.
- Monétisation : gratuit = brief hebdo ; payant = quotidien + rappels fiscaux + canaux.

### 1.2 Pricing unifié — MyExtension Business (corriger l'incohérence)
- **Supprimer** l'ancienne double grille + les packs de crédits en façade. **Crédits cachés** (métrage interne), vente par **capacités + usage équitable**.
- UNE grille, 3 niveaux : **Essentiel 29 € (1er mois 1 €) · Croissance 79 € (1er mois 9 €) · Sérénité 149 € (jusqu'à 3 sièges)**. Annuel -2 mois. Option **BYOK** (~9 €/mois ou incluse en Sérénité).

### 1.3 Landing pages + SEO (Google Ads)
- Créer **LP1 Accueil · LP2 Sans vous épuiser · LP3 Vision→Action · LP4 Échéances fiscales** (structure : Accroche→Douleur→Promesse→Preuve→Sécurité→CTA).
- Supprimer les **21 pages legacy** + .bak. Boutique → marque Zayado. Garder Simulation (later).
- OG images SEO par LP (fond généré, titre en overlay HTML), balises title/meta/OpenGraph propres.

### 1.4 Vision Board façon CapCut
- **Refactor** de la page (2292 lignes) en modules. Templates esthétiques + création assistée (Studio image/vidéo existant). L'user tape un objectif → board motivant éditable. Modèles de départ (« entreprise rentable », « cotée en bourse 2026 »…). Notifications d'encouragement.

### 1.5 Mindset (léger, 3-4 au lancement)
- Intention du jour · Micro-gratitude · Victoire du jour (AlignmentCelebration) · Recadrage IA d'un échec. (Reste : rituels, respiration, focus timer — plus tard.)
- Copy « pourquoi les citations marchent » (auto-affirmation / amorçage positif).

### 1.6 Mode Repos/Sabbat (honnête vs limites OS)
- Coupe **nos** notifications + plein écran doux à l'ouverture + **guide** vers le Focus/Ne-pas-déranger natif. ⚠️ Pas de blocage forcé des autres apps (impossible en PWA).

---

## P2 — Écosystème & extension

### 2.1 espace.zayado.net (hub type MyKandbaz)
- Accueil · Services · **Marketplace/Store** · Factures · Entreprise (conformité) · **Suivi affiliation**.
- SSO Zayado unifie MyExtension + espace + boutique. MyExtension = un outil du hub.

### 2.2 Marketplace Zayado (modèle Kiabi/Kandbaz)
- **Produits** : lunettes lumière bleue, thé, plantes/déco bureau, agenda, accessoires ergonomiques, livres…
- **Services** : domiciliation, compta, paie, banque pro, assurance, juridique, logiciels mutualisés (Zayado + partenaires triés).
- Templates premium/partenaires (vision boards, business plans, audits) = monétisation + rétention.

### 2.3 Affiliation
- Pas de page dédiée : **badge « Entreprise partenaire »** sur le profil. Commissions gérées **côté admin WordPress** ; **suivi user** (filleuls, gains) dans l'espace Zayado via API lecture.

### 2.4 Intégration Drive (OAuth)
- Google Drive/OneDrive scope **drive.file**, jeton chiffré (Fernet) révocable, dossier dédié, lien signé éphémère pour le très sensible.

### 2.5 Extension navigateur MV3 (MVP)
- Capteur de contexte (LinkedIn/email/page) → envoie au cockpit qui prépare l'action. Permissions minimales, token dédié révocable, CSP stricte.

### 2.6 Admin citations
- File des citations à venir (30 j), éditer/régénérer/planifier, 1/jour, mode Semence vs versets.

---

## Dette technique transverse (en continu)
- Alembic (supprimer ALTER TABLE au boot) · nettoyer requirements (motor/pymongo) · crons hors web + Redis (rate-limit/quotas) · refactor pages géantes (VisionBoard, Croissance, Settings) · stabiliser contrats API · chiffrement données santé + foi (RGPD art.9) · Sentry/observabilité · light theme brandé (ivoire/or/navy) + tokens couleur.

---

## P3 — MyExtension Campus (piste ultérieure — ~70 % réutilisable)
> `campus.myextension-ai.com` — simulateur d'entreprise IA pour étudiants & salariés en reconversion.
> **Séquencer APRÈS Business.** L'effort réel est GO-TO-MARKET (écoles + entreprises partenaires), pas le code.
- **Réutilise l'existant** : page Simulation, agents IA jeu de rôle (client/DRH/fournisseur), coach socratique (agent), SSO, UI shell, Drive.
- Écrans MVP : Dashboard (« que faire aujourd'hui ? ») · **Mon Entreprise** (IA génère l'entreprise virtuelle vivante) · Missions + **IA Coach** (questionne, ne donne pas la réponse) · Progression (compétences) · **Portfolio** partageable · **Alternance** (offres des entreprises partenaires via espace Zayado) · Profil.
- Rôles : Étudiant · École partenaire (crée parcours, suit) · Entreprise partenaire (publie offres, recrute).
- **Boucle écosystème** : Campus → Portfolio → Entreprise partenaire → Alternance → **MyExtension Business** (même environnement) = moat difficile à copier.

## Ordre de démarrage proposé
1. **Onboarding narratif + couche Sens** (0.2) — le récit d'abord.
2. **Brief « Le Point du jour »** (1.1) — l'engagement quotidien.
3. **Nav + light theme + pricing unifié** (0.3 / 1.2 / dette).
4. **espace.zayado.net + marketplace** (2.1/2.2).
