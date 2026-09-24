#!/usr/bin/env bash
#
# Purge de l'historique git — secrets exposés dans ReactZayado
# ============================================================
#
# CE QUI ÉTAIT EXPOSÉ (constaté lors de l'audit d'installation) :
#   • backend/kairos.db   → 26 comptes réels : emails + hash bcrypt
#                           (dont admin@zayado.fr) + données personnelles
#                           dans 8 tables vision_*
#   • .token_sara         → JWT réel
#   • .token_vendeur      → JWT réel
#   • .token_test         → JWT réel
#
# `git rm --cached` (déjà fait) empêche les FUTURS commits de les inclure,
# mais ne touche pas au passé : les blobs restent lisibles dans l'historique
# via `git show <sha>`. Ce script les supprime de TOUS les commits.
#
# ⚠️  RÉÉCRITURE D'HISTORIQUE : tous les SHA de commits changent.
#     - Préviens tes collaborateurs (ils devront re-cloner).
#     - Un push force est nécessaire.
#     - Fais une sauvegarde AVANT (le script en crée une).
#
# USAGE :
#   cd /chemin/vers/ton/clone-ReactZayado
#   bash purge-historique-secrets.sh
#
# (Optionnel) purger d'autres chemins — utile si le projet est dans un
# sous-dossier du dépôt :
#   bash purge-historique-secrets.sh zayado/backend/kairos.db zayado/.token_sara
#
set -euo pipefail

if [ "$#" -gt 0 ]; then
  CHEMINS=("$@")
else
  CHEMINS=(
    "backend/kairos.db"
    ".token_sara"
    ".token_vendeur"
    ".token_test"
  )
fi

if [ ! -d .git ]; then
  echo "❌ Ce dossier n'est pas un dépôt git. Place-toi à la racine de ton clone." >&2
  exit 1
fi

echo "▸ Dépôt : $(git rev-parse --show-toplevel)"
echo "▸ Commits actuels : $(git rev-list --count HEAD)"
echo

echo "▸ Présence des secrets dans l'historique AVANT purge :"
for f in "${CHEMINS[@]}"; do
  n=$(git log --oneline --all -- "$f" | wc -l | tr -d ' ')
  echo "   - $f : $n commit(s)"
done
echo

# ── Sauvegarde ────────────────────────────────────────────────
SAUVEGARDE="../$(basename "$PWD")-sauvegarde-$(date +%Y%m%d-%H%M%S).bundle"
git bundle create "$SAUVEGARDE" --all >/dev/null 2>&1
echo "▸ Sauvegarde complète : $SAUVEGARDE"
echo "  (restauration : git clone $SAUVEGARDE dossier-restaure)"
echo

# ── Purge ─────────────────────────────────────────────────────
# git-filter-repo est l'outil recommandé. Repli sur filter-branch
# (livré avec git) s'il n'est pas installé.
if command -v git-filter-repo >/dev/null 2>&1; then
  echo "▸ Purge via git-filter-repo…"
  ARGS=()
  for f in "${CHEMINS[@]}"; do ARGS+=(--path "$f"); done
  git filter-repo --invert-paths "${ARGS[@]}" --force
else
  echo "▸ git-filter-repo absent → repli sur git filter-branch."
  echo "  (installation conseillée : pip install git-filter-repo)"
  LISTE=$(printf "'%s' " "${CHEMINS[@]}")
  FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force --index-filter \
    "git rm -r --cached --ignore-unmatch $LISTE" \
    --prune-empty --tag-name-filter cat -- --all

  # Nettoyage des références laissées par filter-branch
  rm -rf .git/refs/original
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive >/dev/null 2>&1 || git gc --prune=now
fi
echo

# ── Vérification ──────────────────────────────────────────────
echo "▸ Vérification APRÈS purge :"
ECHEC=0
for f in "${CHEMINS[@]}"; do
  n=$(git log --oneline --all -- "$f" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$n" = "0" ]; then
    echo "   ✅ $f : absent de l'historique"
  else
    echo "   ❌ $f : encore présent dans $n commit(s)"
    ECHEC=1
  fi
done

# Le blob lui-même ne doit plus être atteignable
if git rev-list --objects --all 2>/dev/null | grep -qE "kairos\.db|\.token_"; then
  echo "   ❌ Des objets sensibles restent atteignables."
  ECHEC=1
else
  echo "   ✅ Aucun objet sensible atteignable."
fi
echo

if [ "$ECHEC" != "0" ]; then
  echo "❌ Purge incomplète — ne pousse pas. Restaure la sauvegarde et réessaie." >&2
  exit 1
fi

cat <<'FIN'
✅ Historique purgé.

IL RESTE 3 ACTIONS INDISPENSABLES :

1) Pousser l'historique réécrit (préviens l'équipe avant) :
      git push --force --all
      git push --force --tags

2) Les données ont été PUBLIQUES : considère-les comme compromises.
   - Change le mot de passe du compte admin@zayado.fr.
   - Invite les 26 comptes concernés à changer leur mot de passe.
   - Fais tourner JWT_SECRET (déconnecte tout le monde, mais invalide
     les jetons volés) et FERNET_KEY.

3) Sur GitHub, l'historique peut rester en cache côté forks et vues web :
   ouvre un ticket au support GitHub pour purger le cache, et supprime
   les forks éventuels.
FIN
