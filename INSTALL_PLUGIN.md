# 🔌 Installer le plugin WordPress « Zayado Admin »

## Pré-requis
- Un site WordPress (ex : Hostinger) avec accès administrateur.
- Le fichier `zayado-admin-v2.zip` (fourni).
- L'URL de ton backend (ex : `https://app.zayado.net/api`) + un **token admin**.

## Étapes
1. **Se connecter à WordPress** → `https://ton-site/wp-admin`.
2. Menu **Extensions → Ajouter une extension**.
3. Bouton **« Téléverser une extension »** (en haut).
4. **Choisir le fichier** → sélectionner `zayado-admin-v2.zip` → **Installer maintenant**.
5. Cliquer **Activer l'extension**.
6. Un menu **« MyExtension AI »** apparaît dans la barre latérale gauche de l'admin.

## Configuration (obligatoire)
1. Aller dans **MyExtension AI → Configuration**.
2. Renseigner :
   - **URL API** : `https://app.zayado.net/api`
   - **Token admin** : voir ci-dessous pour l'obtenir.
   - **Secret connecteur (HeyGen)** : la même valeur que `WP_CONNECTOR_SECRET` côté backend.
3. Cliquer **Tester la connexion** → doit afficher « Connexion FastAPI OK ».

### Obtenir le token admin
Depuis un terminal (ou Postman) :
```bash
curl -X POST https://app.zayado.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@zayado.net","password":"TON_MOT_DE_PASSE"}'
```
Copier la valeur `access_token` de la réponse et la coller dans le champ **Token admin**.

## Rôles (accès restreint)
- Un rôle **« Zayado — Commercial / Communication »** est créé automatiquement.
- Ce rôle ne voit que : **Génération IA, Vidéo HeyGen, Emails IA, News-Reprise, Citations**.
- Le reste (Utilisateurs, Revenus, CRM, Configuration…) reste réservé aux **administrateurs**.
- Pour attribuer ce rôle : **Utilisateurs → (modifier un utilisateur) → Rôle → Zayado — Commercial / Communication**.

## Mettre à jour le plugin
1. Extensions → désactiver puis supprimer l'ancienne version « Zayado Admin ».
2. Réinstaller le nouveau `.zip` (les réglages Configuration sont conservés).

## En cas de souci
- « Éditeur de plugins désactivé » : normal (sécurité Hostinger), passe par Extensions → Téléverser.
- Page vide / « Accès refusé » : vérifier le rôle de l'utilisateur et le token admin dans Configuration.
