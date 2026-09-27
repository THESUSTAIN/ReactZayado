# Logs applicatifs — Changelog

## Différent des lots précédents : rien à vérifier avant de porter

Contrairement à Connexions et Affiliation, il n'existait ici aucun
équivalent à comparer avant de construire quoi que ce soit — juste le
logging Python standard (`logger.info(...)`), qui va dans la console/les
fichiers serveur mais n'est ni persistant, ni consultable depuis l'admin.
Le portage depuis `app-main/backend/routes/app_logs.py` avait donc du sens
tel quel.

### Ajouté

- **`backend/app_logs_ext.py`** (nouveau) — nouvelle table `app_logs`
  (niveau, fonctionnalité, message, utilisateur, détails, durée, IP),
  déclarée dans `install_app_logs` exactement comme `RituelFait` dans
  `rituels_ext.py` — pas de migration manuelle, `Base.metadata.create_all`
  la crée au démarrage.
  - `log_event(...)` — helper async fire-and-forget, exporté dans les
    globals du serveur (`log_event`) pour un usage futur par d'autres
    modules.
  - **Seule instrumentation automatique ajoutée** : un middleware additif
    qui journalise toute exception non interceptée (CRITICAL) et les
    réponses 5xx (ERROR) sur les routes `/api`. Volontairement, je n'ai
    touché à AUCUNE route existante (auth, paiements, affiliation…) pour
    y insérer des appels à `log_event` — ça aurait voulu dire modifier du
    code métier déjà en prod pour un lot qui devait rester un ajout pur.
    Le helper est prêt si tu veux brancher un suivi plus fin quelque part
    en particulier.
  - Routes admin : `GET /app-logs` (filtres niveau/fonctionnalité/
    recherche/période, pagination), `GET /app-logs/summary` (résumé 24h
    par fonctionnalité et niveau + 5 dernières erreurs), `DELETE
    /app-logs/purge` (purge des logs de plus de N jours, 30 par défaut).
  - `backend/server.py` — 2 lignes de branchement après Connexions, même
    patron que les autres modules `_ext.py`. Rien d'autre touché.
- **`frontend/src/lib/kairosApi.js`** — 3 fonctions ajoutées
  (`fetchAppLogs`, `fetchAppLogsSummary`, `purgerAppLogs`).
- **`frontend/src/components/admin/AdminAppLogs.jsx`** (nouveau) — onglet
  admin « Logs applicatifs » : KPI (volume 24h, erreurs/critiques 24h),
  dernières erreurs, table avec filtres (niveau, fonctionnalité,
  recherche) et purge manuelle.
- **`frontend/src/pages/Admin.jsx`** — entrée d'onglet, icône
  (`ScrollText`), import et rendu conditionnel — même patron que
  Connexions.

### Vérifié
- `py_compile` sur `app_logs_ext.py` et `server.py` (syntaxe correcte).
- Aucune collision de route (`grep` sur `/app-logs` avant ajout).
- Équilibre des accolades/parenthèses/crochets sur les 3 fichiers front
  modifiés.

### Pas fait — à décider
Aucun point précis (chat, échec de connexion, paiement, affiliation) ne
journalise encore explicitement dans `app_logs` — seules les erreurs
serveur non gérées le font automatiquement. Si tu veux un vrai suivi par
fonctionnalité (ex. échecs de connexion répétés, webhooks de paiement en
échec), dis-moi lesquelles compte en priorité et je branche `log_event(...)`
aux bons endroits dans un lot dédié, plutôt que de deviner et modifier du
code métier sans validation.
