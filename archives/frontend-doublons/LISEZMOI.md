# Doublons frontend archivés (audit d'architecture)

Fichiers retirés de `frontend/` car prouvés inutilisés. Conservés ici pour retour arrière.

| Ancien emplacement | Preuve |
|---|---|
| `frontend/src/features/thesustain/` | Copie octet par octet de `frontend/src/zy/features/thesustain/` (`diff -rq` vide). Aucun import (seul `@/zy/features/thesustain` est importé, par `zy/pages/MaFoi.jsx`). |
| `frontend/App.tsx` | Ancienne version de `frontend/src/App.tsx` (sans la redirection `VITE_SHOP_URL`). Hors `tsconfig.app.json` (`include: ["src"]`) ; `index.html` charge `/src/main.tsx`. |
| `frontend/index.css` | Ancienne version de `frontend/src/index.css`, importé seulement depuis `src/main.tsx`. |

Retour arrière : `git mv archives/frontend-doublons/<fichier> frontend/<emplacement>`.
