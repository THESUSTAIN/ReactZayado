# Zayado — Fonctionnalités par offre

État au 13 octobre 2026 (version v7). Ce document sert de référence interne : ce que chaque offre débloque réellement dans le code, et où la règle est écrite. Quand une règle change, il faut modifier le code **et** ce document.

## 1. Les offres et leurs prix

| Offre | Code interne | Prix mensuel | Prix fondateur | Annuel | Essai |
|---|---|---|---|---|---|
| Rêveur | `reveur` | 15 € TTC | — | 150 € TTC | 1 mois offert, sans carte |
| Solo | `serenite` | 29 € | 24 € | 288 € (fondateur 228 €) | 2 mois pour 1 € (une fois par compte) |
| Pro | `pro` | 69 € | 49 € | 708 € (fondateur 468 €) | — |
| Équipe | `business` | 99 € pour 3 personnes (toi en Pro + 2 Solo) | — | 990 € | — |
| Entreprise | `entreprise` | Sur devis, à partir de 299 € | — | — | — |
| Sans offre | `essentielle` | Accès bloqué (page « Débloquer ») | | | |

- Tous les prix sont affichés TTC (entreprise non assujettie à la TVA, art. 293 B du CGI).
- Le tarif fondateur est réservé aux 100 premiers clients. Il reste acquis tant que l'abonnement n'est pas résilié.
- Où sont écrits ces prix :
  - `backend/server.py` → `PRICING` (montants encaissés par Mollie) ;
  - `frontend/src/zy/lib/plans.js` → `PLANS`, `ESSAI`, `COMPARATIF` (affichage) ;
  - `frontend/src/zayado/droits.ts` → `DROITS` (rappel affiché dans le Copilote).
- Variables Railway liées : `ESSAI_PRIX=1`, `ESSAI_JOURS=60`, `ESSAI_REVEUR_JOURS=30`.

## 2. Tableau des fonctionnalités

✓ = inclus · — = non inclus · un chiffre = limite.

### Rêver et clarifier

| Fonction | Rêveur | Solo | Pro | Équipe | Entreprise |
|---|---|---|---|---|---|
| Vision Boards illimités, lien public, Vision Book PDF | ✓ | ✓ | ✓ | ✓ | ✓ |
| Images IA pour le Vision Board | 3 / jour | 10 / jour | 10 / jour | 10 / jour | 10 / jour |
| Idées : capture, tri, développement par l'IA (tiroir Élan) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Chat IA qui connaît ton projet (bulle en bas à droite, toutes les pages) | ✓ (usage équitable) | ✓ | ✓ | ✓ | ✓ |
| Ma foi (lecture, mémoire, parcours) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bien-être & Mindset (carte du jour, parcours 7 jours, carnet) | ✓ | ✓ | ✓ | ✓ | ✓ |

### Piloter et vendre (le cercle)

| Fonction | Rêveur | Solo | Pro | Équipe | Entreprise |
|---|---|---|---|---|---|
| Accueil « Ton cercle » + prochaine étape en un clic | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pilotage : import FEC / banque, point mort, objectif « N clients ce mois » | ✓ | ✓ | ✓ | ✓ | ✓ |
| Plan d'action : objectifs, actions datées, processus | Objectifs & idées | ✓ | ✓ | ✓ | ✓ |
| Cockpit du jour (ancien `/app`), revue hebdo, check-in énergie | — | ✓ | ✓ | ✓ | ✓ |
| Radar Copilote : signaux par jour | 5 | illimité | illimité | illimité | illimité |
| Radar Copilote : modes (entreprises / particuliers) | 1 | 2 | 2 | 2 | 2 |
| Radar Copilote : prospects suivis | 10 | illimité | illimité | illimité | illimité |
| Radar : vrais prospects nommés (Apollo) par mois | — | 30 | 90 | 150 | 300 |
| Radar local : recherches Google, pub prête, ventes immobilières | — | ✓ | ✓ | ✓ | ✓ |
| Enrichissement des contacts (Dropcontact) | — | — | ✓ | ✓ | ✓ |
| Pouls business (Qonto), e-mail du lundi | — | ✓ | ✓ | ✓ | ✓ |
| Tunnels de vente (création en un clic, rédigés par l'IA) | 1 | 3 | 3 | 3 | 3 |
| Publication du tunnel : adresse `/t/…`, mentions légales de l'utilisateur, référencement + image de partage | ✓ | ✓ | ✓ | ✓ | ✓ |
| Campagne publicitaire prête à coller | — | ✓ | ✓ | ✓ | ✓ |
| Séquence de lancement (contenus J-7 → J+3) | — | — | ✓ | ✓ | ✓ |
| Commission prélevée sur les ventes des tunnels (paiement Mollie) | 10 % (max 49 €) | 5 % (max 29 €) | 0 % | 0 % | 0 % |

**Commission.** Prélevée sur chaque paiement en ligne d'un tunnel (`routers/paiements_tunnels.py`). Le créateur active « Encaisser directement dans le tunnel » (Tunnels › Paiements). Mollie Connect (compte Mollie du créateur relié, commission via `applicationFee`) si `MOLLIE_CLIENT_ID/SECRET` sont posés ; sinon encaissement centralisé sur le compte Zayado (`MOLLIE_API_KEY`) et reversement du net sur IBAN (Admin › Tunnels : paiements & commission). Barème réglable : `COMMISSION_TUNNELS`. Sans paiement activé, chaque « oui » reste une demande dans le Radar.

### Copilote IA et automatisation

| Fonction | Rêveur | Solo | Pro | Équipe | Entreprise |
|---|---|---|---|---|---|
| Missions de l'agent (tâches IA en plusieurs étapes) par jour | 2 | 5 | 20 | 50 | 200 |
| Mes agents personnels (agents avec mission récurrente) | — | 1 | 3 | 10 | illimité |
| Documents IA (brief, plan 30 jours, SWOT, export Word/Excel) | — | — | ✓ | ✓ | ✓ |
| Agent Business : chatbot client à ta marque | — | — | 1 | 3 | illimité |
| Chatbot qui répond avec tes documents | — | — | — | ✓ | ✓ |
| Alertes WhatsApp & Telegram | — | — | ✓ | ✓ | ✓ |

Documents IA : réservés à Pro et au-delà, dans l'interface (`MODULES_MIN.documents = pro`) comme sur le serveur (`POST /api/documents/generer` renvoie 402 en dessous de Pro).

### Équipe et entreprise

| Fonction | Rêveur | Solo | Pro | Équipe | Entreprise |
|---|---|---|---|---|---|
| Comptes inclus | 1 | 1 | 1 | 3 (toi + 2 Solo) | illimité |
| Espace « Ton entreprise » (`/entreprise`) : pièces dans le Drive, planning, absences, chrono, décompte | — | — | — | jusqu'à 5 personnes | illimité |
| Bases Google Sheets / Excel / Microsoft Lists (SheetFlow) | — | — | — | ✓ | ✓ |
| Installation SharePoint complète, Teams, droits par personne | — | — | — | — | ✓ |
| Ton domaine et ta propre clé IA | — | — | — | — | ✓ |
| Support | E-mail | E-mail | Prioritaire | Prioritaire | Dédié |

## 3. Ce qui est gratuit, sans compte

Ces pages publiques sont référençables, et leur lien de partage affiche un aperçu avec image :

| Page | Adresse | Lien de partage |
|---|---|---|
| Diagnostic Zayado | `/public/tunnel` (+ `/diagnostic`) | `/api/public/partage/diagnostic` |
| Créer ou reprendre une entreprise | `/public/reprise` | `/api/public/partage/reprise` |
| Vendre son entreprise | `/public/cession` | `/api/public/partage/cession` |
| Tunnels publiés par les utilisateurs | `/t/{adresse}` | `/api/public/t/{adresse}/partage` |
| Tarifs | `/pricing` | |
| Pages légales | `/legal/*` | |

Seuls deux éléments sont payants dans ces parcours : le Kit Diagnostic Flash (27 €) et son option Fast-Track (97 €). Le tunnel Reprise et le tunnel Cession n'affichent **aucun prix d'accompagnement**. Le prix se discute pendant l'appel stratégique gratuit.

## 4. Où sont appliquées les règles

| Règle | Fichier |
|---|---|
| Offre minimale par page ou module (verrou « Inclus dès … ») | `frontend/src/zy/lib/droits.js` → `MODULES_MIN` |
| Limites du Copilote (tunnels, prospects, séquences) | `backend/routers/copilote.py` → `DROITS` ; affichage dans `frontend/src/zayado/droits.ts` |
| Correspondance offre payée → droits Copilote | `backend/routers/copilote.py` → `_OFFRE_DROITS` (Équipe et Entreprise = droits Pro) |
| Missions IA par jour | `backend/agent_missions_ext.py` → `QUOTA_JOUR` |
| Agents personnels | `backend/agents_perso_ext.py` → `QUOTA` |
| Prospects Apollo par mois | `backend/apollo_ext.py` → `QUOTAS_DEFAUT` |
| Alertes WhatsApp / Telegram | `backend/canaux_ext.py` (offres pro, business, entreprise) |
| Espace entreprise | `backend/entreprise_ext.py` (offres business, entreprise, ou admin) |
| Aperçu d'une autre offre (administrateurs uniquement) | `PATCH /api/copilote/profil/offre` → `offre_test` |

## 5. Décisions prises (13 octobre 2026)

- **Rêveur = un avant-goût du cercle.** Rêveur garde :
  - le Pilotage ;
  - le Plan d'action (objectifs et idées) ;
  - le Radar découverte (5 signaux par jour, 10 prospects suivis) ;
  - 1 tunnel publié ;
  - Bien-être et Ma foi.

  La grille Tarifs l'annonce désormais clairement (« … et goûter au cercle »). Tout le reste pousse vers Solo : prospects nommés, 3 tunnels, campagne, cockpit du jour.
- **Documents IA dès Pro**, comme annoncé sur la grille. L'interface et le serveur sont alignés.
- **Commission sur les tunnels :** affichée, avec la mention « prélevée seulement quand le paiement en ligne sera actif ». Rien n'est prélevé tant que le paiement intégré (phase 2) n'existe pas.
