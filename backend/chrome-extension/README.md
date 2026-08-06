# MyExtension AI — Extension navigateur (Chrome / Edge, Manifest V3)

Capture rapide d'un prospect / note / page vers votre cockpit **app.zayado.net**.

## Installation (mode développeur)
1. Téléchargez et décompressez `zayado-extension.zip` (bouton "Télécharger l'extension" dans l'app,
   ou endpoint `/api/extension/download`).
2. Ouvrez `chrome://extensions` (ou `edge://extensions`).
3. Activez le **Mode développeur** (en haut à droite).
4. Cliquez **Charger l'extension non empaquetée** et sélectionnez le dossier décompressé.

## Fonctionnalités
- **Popup** : pré-remplit nom (titre de page), note (texte sélectionné) et URL ; boutons *Ajouter au CRM* / *Ouvrir l'app*.
- **Clic droit** → *Envoyer à MyExtension AI* (sur une sélection, un lien ou la page).
- Ouvre la page **Croissance** avec les champs pré-remplis (`?capture_name=&capture_url=&capture_note=`).

## Publication (store)
Pour une distribution grand public, empaqueter et publier sur le Chrome Web Store / Edge Add-ons
(compte développeur requis).
