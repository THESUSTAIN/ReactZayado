# Corrections du site public autonome (25/08)

## Contexte
Repris tel quel depuis final-main/public-site — la vraie base autonome,
séparée de l'application (confirmé : architecture à 2 projets distincts,
comme le modèle final d'origine).

## Bug de déploiement trouvé et corrigé
`nixpacks.toml` exigeait `yarn install --frozen-lockfile`, mais **aucun
`yarn.lock` n'existe dans le projet** (seulement un `package-lock.json`,
généré par npm) — cette commande aurait fait échouer le déploiement dès
l'installation. Corrigé : `nixpacks.toml` et `railway.json` basculés sur
npm, cohérent avec ce que j'ai testé avec succès.

## Header incohérent corrigé (même bug que trouvé sur ReactZayado)
`ZayadoLayout.jsx` avait sa propre identité visuelle ("aubergine"),
différente du reste du site — utilisé sur 5 pages (Vision, AntiBurnout,
Echeances, InstanceDediee, TesterSonProjet). Corrigé pour réutiliser le
vrai header/footer du site (`PublicHeader`/`UnifiedFooter` de
LandingHub.jsx).

## Vérifié réellement
- `npm install` + `npm run build` exécutés en conditions réelles à deux
  reprises (avant et après suppression de package-lock.json pour
  simuler un environnement propre) : réussi les deux fois, 1707 modules
  transformés
- `dist/index.html` généré, titre correct vérifié
- `serve` (utilisé par `npm start`) confirmé présent dans les
  dépendances
- Aucune base de données committée

## Ce dossier est autonome
Ne contient AUCUNE page de l'application (Vision Board réel, Croissance,
Pilotage, Travail, Login, chat) — uniquement les pages marketing/vitrine
(Landing, Boutique, Blog, Tarifs, FAQ, Contact, tunnels de conversion,
pages légales). Correspond au modèle "2 projets séparés" confirmé.
