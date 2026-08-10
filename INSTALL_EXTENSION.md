# 🧩 Installer l'extension navigateur « MyExtension AI »

L'extension affiche un **panneau latéral** qui lit le contexte Gmail/Agenda/Outlook et reflète ton cockpit **en temps réel**.

Dossier de l'extension : `backend/chrome-extension/`

---

## A. Chrome / Edge / Brave (mode développeur — pour tester)
1. Récupérer le dossier `chrome-extension` (le décompresser s'il est en `.zip`).
2. Ouvrir le navigateur → aller sur :
   - Chrome : `chrome://extensions`
   - Edge : `edge://extensions`
   - Brave : `brave://extensions`
3. Activer en haut à droite le **« Mode développeur »**.
4. Cliquer **« Charger l'extension non empaquetée »** (Load unpacked).
5. Sélectionner le dossier `chrome-extension`.
6. L'icône **MyExtension AI** apparaît dans la barre d'outils → l'épingler.

## B. Utilisation
1. Cliquer sur l'icône → le **panneau latéral** s'ouvre.
2. **Se connecter** : bouton de connexion (utilise la même session que l'app ; en dev, un lien est proposé).
3. Ouvrir **Gmail** ou **Google Agenda** : le panneau affiche le **contexte** de la page.
4. La carte **« Cockpit en direct »** se met à jour automatiquement (SSE) quand ton cockpit change.
5. Actions contextuelles : créer une tâche / un lead / une note depuis l'email affiché.

## C. Firefox (temporaire)
1. `about:debugging#/runtime/this-firefox`.
2. **« Charger un module complémentaire temporaire »** → choisir le fichier `manifest.json` du dossier.
> Firefox recharge à chaque redémarrage (installation temporaire).

---

## Passage en production (publication)
Pour distribuer publiquement (au lieu du mode développeur) :
1. **Chrome Web Store** : créer un compte développeur (5 $ une fois), zipper le dossier `chrome-extension`, téléverser, remplir la fiche + **politique de confidentialité**, soumettre à la review Google.
2. **Edge Add-ons** / **Firefox AMO** : même principe, comptes séparés.
3. Vérifier le `manifest.json` : les domaines de prod (`app.zayado.net`, `zayado.net`) doivent y être, et **pas** d'URL de preview.
4. Justifier les permissions demandées (Google refuse les permissions trop larges).

## En cas de souci
- Panneau vide : vérifier la connexion (bouton), et que le domaine backend est autorisé dans `manifest.json` (`host_permissions`).
- « Cockpit en direct » ne bouge pas : vérifier que tu es connecté (le flux SSE nécessite un token).
