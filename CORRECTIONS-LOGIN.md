# Corrections appliquées — page Login (`frontend/src/pages/Login.jsx`)

## 0. 🔴 CRITIQUE — "Erreur de chargement V1" / "Cannot access before initialization" (cause du "impossible d'accéder à l'appli")
Trouvé et corrigé — c'était bien un bug de code, pas un problème d'infra. J'ai reconstruit le bundle en local avec les sourcemaps pour décoder la trace d'erreur minifiée, et reproduit le crash exact que vous avez rencontré sur app.zayado.net.

**Cause réelle :** dans `frontend/src/components/Layout.jsx`, un `useEffect` (ligne ~333) utilisait les variables `latestNewsId` et `markNewsSeen` alors qu'elles n'étaient déclarées que ~50 lignes plus bas dans le même composant (`useState` ligne 380, fonction ligne 390). En JavaScript, une variable `const`/`useState` ne peut pas être lue avant sa ligne de déclaration dans la même fonction — cela lève une `ReferenceError` à chaque rendu du composant `Layout` (donc sur quasiment toutes les pages de l'app, d'où l'app inaccessible).

**Correction :** le `useEffect` fautif a été déplacé juste après la déclaration de `latestNewsId`/`markNewsSeen`, sans changer son comportement (toujours déclenché sur `[hideChromeForMobileChat, latestNewsId]`).

**Vérifié :** build de production relancé et exécuté en simulation navigateur — l'app se charge et affiche la sidebar, le header et le contenu au lieu de l'écran "Erreur de chargement V1".

*(Le fait qu'une longue trace d'erreur en texte brut s'affichait probablement expliquait aussi le "pourquoi scroller je comprends pas" — c'était la page d'erreur qui débordait, pas un bug de mise en page. À vérifier une fois ce correctif déployé.)*

## 1. Bouton "Continuer avec thesustain.net" sans cadre
Le bouton avait une bordure dorée (`border border-[#DEC2A3]/40`) qui n'était pas prévue. Retirée : c'est maintenant un lien discret sans cadre (`border-0`), cohérent avec l'intention d'origine.

## 2. Bleu trop sombre / sans dégradé / différent du bleu principal
La page login recopiait à la main le dégradé de fond au lieu de réutiliser la classe `.sky-bg` (définie une fois dans `index.css` et utilisée partout ailleurs dans l'app). Corrigé : la page login utilise maintenant exactement la même classe `.sky-bg` que le reste de l'application, donc **le même bleu, avec le même dégradé** — plus aucun risque de divergence entre les pages.

## 3. Le mot "preview" affiché à l'utilisateur — pas professionnel
Trouvé : quand l'envoi d'email échoue (pas de fournisseur email configuré côté serveur), l'app affichait littéralement **"Mode preview — l'email n'est pas envoyé, cliquez sur le lien"** à l'utilisateur — un terme de développeur qui n'a rien à faire dans l'interface finale. Reformulé en :
> "Envoi d'email momentanément indisponible — utilisez ce lien pour vous connecter :"
Le toast de confirmation associé a été aligné de la même façon (suppression de "Mode preview").

## 4. Nom de l'application + "by Zayado" — repris du modèle final-main
Première correction trop libre (je l'ai réajustée) : au lieu d'un label "by Zayado" séparé au-dessus du logo, la structure d'origine de final-main a été reprise à l'identique — logo seul au-dessus, puis un titre unique **"Bienvenue sur MyExtension Business"** avec **"by Zayado"** accolé en petit, en retrait, juste à côté (comme dans `final-main/frontend/src/pages/Login.jsx`, ligne 230-235), au lieu d'une ligne à part.

## 5. "Impossible d'accéder à l'application" — voir point 0 ci-dessus
Ma précédente hypothèse (identifiants MySQL refusés) reste un point réel documenté dans `AUDIT-FONCTIONNEL.md`, mais après reproduction du crash, **la cause immédiate de l'inaccessibilité était bien le bug JavaScript du point 0**, qui empêchait l'app de se charger indépendamment de tout accès base de données. Les deux méritent d'être vérifiés, mais le point 0 était bloquant en premier.

