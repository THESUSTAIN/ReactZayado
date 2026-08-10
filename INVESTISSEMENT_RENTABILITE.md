# MyExtension AI — Investissement & Rentabilité (mise en production)

> Hypothèse : SaaS B2B/B2C premium. Cibles : entrepreneurs solo, freelances, investisseurs, cabinets.
> Le moat = **Vision Board vivant + IA agentique** (rétention élevée si les cartes bougent seules).

---

## 1. Pricing (par palier, marge pilotée par le coût IA)
| Plan | Prix | Contenu | Rôle |
|---|---|---|---|
| **Free** | 0 € | Board limité, IA basique, 1 pack | Acquisition / activation |
| **Pro** | ~29 €/mois | Board complet, Analyse IA (SWOT/incohérences), cartes live | Cœur de revenu B2C |
| **Business** | ~79 €/mois | Agents agentiques (Prospection), intégrations (WhatsApp/Email/Bank), multi-board | Upsell B2B |
| **Enterprise / M&A** | 299 €+/mois | Agents avancés débloqués par le **Passeport** (Négociateur, Stratège M&A), SSO, support | Cabinets/investisseurs |

Leviers : annuel −2 mois (rétention + trésorerie), add-on "crédits IA", place de marché de Packs.

---

## 2. Structure de coûts (le poste n°1 = l'IA)
- **Coût IA / requête** : router les tâches simples (scoring, résumé) vers modèles **low-cost/rapides**
  (Gemini 3 Flash / Haiku) ; réserver le raisonnement lourd (SWOT, stratégie) à Claude Sonnet / GPT.
  Ajouter **cache** (résultats SWOT/scores) + **débounce** (recalcul seulement sur changement de données).
- **Infra temps réel** : WebSocket/SSE pour l'event engine (léger si push ciblé, pas de polling agressif — actuellement polling 60 s côté cartes, OK au départ).
- **Agent de sourcing/data** : coût variable (API B2B licites) → **quotas par plan** + opt-in.
- **Conformité RGPD** : purge programmée (déjà un cron `_gdpr_purge_loop`), traçabilité des sources.

### Cible de marge brute
- **> 75 %** visée. Clé = **coût IA par utilisateur maîtrisé** (routing + cache + quotas par plan).
- Règle d'or : chaque plan a un **budget IA mensuel** ; au-delà → dégradation vers modèle low-cost ou add-on crédits.

---

## 3. Unit economics (modèle indicatif — à instrumenter)
| Métrique | Hypothèse prudente | Commentaire |
|---|---|---|
| ARPU mixte | ~35 €/mois | mix Free→Pro→Business |
| Coût IA / user actif | 3–6 €/mois | après routing + cache |
| Coût infra / user | ~1 €/mois | SSE + stockage médias |
| Marge brute | 78–82 % | si coût IA tenu |
| Churn mensuel visé | < 4 % | board vivant + notifs proactives |
| CAC | à mesurer | acquisition via Free + contenu |
| LTV/CAC cible | > 3 | condition de scale |

---

## 4. Ordre de priorité pour convaincre l'investissement
1. **Démo "board qui se met à jour tout seul"** (Bloc A) — carte CA passe de 0 → 21 600 € en live (déjà corrigé).
2. **Démo "agent qui source une vraie opportunité"** (Bloc D) — pastilles d'entreprises réelles + sources.
3. **Métriques d'activation + coût IA maîtrisé** avant d'ouvrir le scale.

---

## 5. Risques & mitigations
- **Explosion du coût IA** → routing multi-modèles + cache + quotas par plan (priorité technique n°1).
- **Conformité prospection (RGPD)** → opt-in, sources whitelistées et traçables, pas de scraping opaque.
- **Sur-scope produit** → séquencer (voir AUDIT_VISION.md, blocs A→E) au lieu de tout livrer en v1.
- **Segmentation B2B via Kairos** → 100 % opt-in, désactivé par défaut.

---

## 6. Prochaine action recommandée
Construire **Bloc A (Board vivant)** : panneau IA persistant à droite + auto-pose de 6–8 cartes
intelligentes reliées + badges IA. C'est le plus court chemin vers l'"aha" investisseur.
