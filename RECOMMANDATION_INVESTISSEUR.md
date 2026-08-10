# Recommandation d'investisseur / dev senior — sans langue de bois

## Ce que je ferais, et pourquoi

**Priorité : bundle a + c + b (dans cet ordre), en une Tranche 1 cohérente.**

Le seul « aha » qui débloque un chèque, c'est : « le board se met à jour tout seul, avec de vraies données ». Aujourd'hui le socle existe (panneau IA, score, cartes vivantes CA/prospects) mais deux failles cassent la démo devant un investisseur qui creuse :

1. **Les cartes du canvas sont un état front isolé** → dès qu'on demande « clique sur cette carte, montre-moi le vrai deal derrière », il n'y a rien. C'est le trou dans la coque. *(option a)*
2. **Le "live" est un polling 60s** → en démo ça ne « respire » pas ; on ne voit jamais la carte bouger en direct. *(option b)*

## Séquence recommandée

- **Étape 1 — Modèle de données unifié (a)** *[fondation, non négociable]*
  Chaque carte = entité réelle référencée (clientId/dealId/invoiceId/projectId). Sans ça, tout le reste est cosmétique. C'est ce qui rend « vivant » réel et pas scénarisé.

- **Étape 2 — Auto-pose + connecteurs (c)** *[le visuel qui vend]*
  Le canvas se construit seul : Vision → Objectif → CA → Impact → Clients, relié. C'est l'image qui fait dire « waouh » en 3 secondes.

- **Étape 3 — Moteur temps réel SSE (b)** *[le mouvement qui prouve]*
  Un changement CRM/Finance fait bouger la carte + le score + le panneau IA **sans refresh**. SSE suffit (plus simple/robuste que WebSocket pour ce besoin unidirectionnel serveur → client).

## Ce que je repousse volontairement

- **(d) onglets Timeline/KPI/Partage** : jolis mais secondaires tant que le board n'est pas branché aux vraies entités. Après.
- **(e) flux news réel** : quick win isolé, à caser plus tard (1 demi-journée).
- **(f) Postgres prod** : à valider au moment du déploiement réel, pas maintenant.

## Mon plan concret si tu valides

Je commence par **l'étape 1 (modèle unifié)** seule, testée de bout en bout (backend + un clic carte → vraie entité), puis j'enchaîne étape 2, puis étape 3. Chaque étape est livrée testée avant la suivante — pas de big-bang.
