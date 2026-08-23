# Corrections appliquées — page Login (`frontend/src/pages/Login.jsx`)

## 1. Bouton "Continuer avec thesustain.net" sans cadre
Le bouton avait une bordure dorée (`border border-[#DEC2A3]/40`) qui n'était pas prévue. Retirée : c'est maintenant un lien discret sans cadre (`border-0`), cohérent avec l'intention d'origine.

## 2. Bleu trop sombre / sans dégradé / différent du bleu principal
La page login recopiait à la main le dégradé de fond au lieu de réutiliser la classe `.sky-bg` (définie une fois dans `index.css` et utilisée partout ailleurs dans l'app). Corrigé : la page login utilise maintenant exactement la même classe `.sky-bg` que le reste de l'application, donc **le même bleu, avec le même dégradé** — plus aucun risque de divergence entre les pages.

## 3. Le mot "preview" affiché à l'utilisateur — pas professionnel
Trouvé : quand l'envoi d'email échoue (pas de fournisseur email configuré côté serveur), l'app affichait littéralement **"Mode preview — l'email n'est pas envoyé, cliquez sur le lien"** à l'utilisateur — un terme de développeur qui n'a rien à faire dans l'interface finale. Reformulé en :
> "Envoi d'email momentanément indisponible — utilisez ce lien pour vous connecter :"
Le toast de confirmation associé a été aligné de la même façon (suppression de "Mode preview").
*(Si le "bouton Thomas" que vous visiez est différent de ce texte, dites-moi précisément où le mot "preview" apparaît — je ne l'ai trouvé nulle part ailleurs dans le code du login, du bouton Thomas ou de la bannière de l'app.)*

## 4. Nom de l'application manquant ("MyExtension Business" + petit "by Zayado")
Le titre affichait seulement "Bienvenue sur Zayado", sans le nom réel de l'application. Ajouté au-dessus du logo :
- un petit label discret **"by Zayado"** (comme demandé, en haut, en petit)
- le titre de bienvenue affiche maintenant **"Bienvenue sur MyExtension Business"**

## 5. "Impossible d'accéder à l'application" — cause identifiée, action requise de votre côté
Ce n'est **pas un bug de code** : le rapport d'audit déjà présent dans le projet (`AUDIT-FONCTIONNEL.md`, section "Validation technique finale") documente que **les identifiants MySQL de l'environnement distant sont refusés par le serveur (`1045 Access denied`)**. Tant que la base de données n'accepte pas les identifiants fournis (à vérifier/mettre à jour dans les variables d'environnement Railway du backend), toutes les routes protégées — y compris la connexion — resteront inaccessibles, quel que soit le code frontend.
→ Action à faire : vérifier dans Railway que l'utilisateur/mot de passe MySQL configurés côté backend correspondent bien à ceux de la base de production, et que l'IP du service backend est autorisée à s'y connecter.
