# Correction du déploiement cassé (24/08)

## Contexte important
Mon environnement de travail a été réinitialisé entre nos échanges — je
n'avais plus accès à la version précédemment corrigée ("ReactZayado le
plus récent"). Ce zip (`v12`) a donc été traité comme la seule base
disponible, auditée intégralement de A à Z plutôt que fusionnée avec un
travail antérieur devenu inaccessible.

## Cause principale trouvée et corrigée — confirmée par un vrai test
`backend/requirements.txt` référençait `litellm` depuis une URL
**privée** (`customer-assets.emergentagent.com/internal-asset/...`) qui
renvoie **403 Forbidden**, testé directement. Contrairement à
`emergentintegrations` (déjà protégée par un `|| echo` dans le
Dockerfile), cette ligne fait échouer **tout** `pip install -r
requirements.txt` dès le début — donc tout le build Docker, avant même
d'atteindre le frontend. Vérifié que `litellm` n'est importé nulle part
dans le code : retiré purement et simplement.

**Avant correction** : `pip install` échoue immédiatement (403).
**Après correction** : l'installation progresse normalement, bien plus
loin dans la liste des dépendances (vérifié par un vrai test dans mon
environnement).

## Deuxième vrai piège trouvé et supprimé
`backend/Dockerfile` existait en double du Dockerfile racine, mais
**obsolète** : il copiait depuis `frontend/build/*` — un dossier qui
n'existe plus depuis la migration vers Vite (qui produit `frontend/dist/`
désormais, confirmé par un vrai build réussi dans mon environnement).
Ce fichier n'avait aucun `railway.json` propre à côté de lui
(contrairement aux 3 vrais services : racine, frontend/, WhatsApp-service/),
confirmant que c'est un résidu non censé être utilisé — mais un vrai
risque si jamais un service Railway pointait dessus par erreur.
**Supprimé.** Le Dockerfile racine (correct, `dist/`, bonnes variables
Vite) reste la seule référence pour le service backend.

## Vérifié directement dans mon environnement (pas supposé)
- **Build frontend réel réussi** : `npm install` + `npm run build`
  (Vite) exécutés en conditions réelles, aboutissent sans erreur
- **Aucun résidu CRA incompatible** : zéro `process.env.REACT_APP_*`
  dans tout le code source
- Tous les fichiers backend compilent (syntaxe Python)
- Tous les fichiers frontend compilent (syntaxe JS/JSX)
- Vérification approfondie des imports (fichiers + noms exportés,
  y compris l'alias `@/` de Vite) : zéro import réellement cassé — les
  4 résultats initiaux étaient des commentaires de documentation
  contenant des exemples d'import, pas du vrai code
- Aucune base de données committée

## Non vérifiable dans mon environnement
Une erreur `PyJWT` est apparue en fin d'installation, mais elle vient
d'un conflit avec un paquet système pré-installé propre à mon bac à
sable (Debian), pas du projet lui-même — l'image Docker réelle
(`python:3.11-bullseye` propre) ne devrait pas avoir ce conflit. Je ne
peux pas le garantir à 100% sans un vrai test sur Railway.
