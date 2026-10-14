# Zayado — Toutes les notifications

État au 13 octobre 2026 (v7). Ce document recense chaque message que Zayado peut envoyer : quand il part, sur quel canal, et vers quelle page il mène.

## 1. Les trois canaux et leurs règles

| Canal | Ce que c'est | Quand ça part |
|---|---|---|
| **Cloche** (dans l'app) | Tout ce que le serveur envoie y est rangé, même si le téléphone n'a rien reçu. | Toujours, en même temps que l'événement. Gardé 30 jours. |
| **Push** (téléphone / ordinateur) | Notification système, même app fermée. | Sur chaque appareil abonné, entre **8 h et 21 h** (heure de l'utilisateur), pour les rappels. Les événements urgents (nouveau contact, réponse) partent tout de suite. |
| **E-mail** | Récapitulatif et messages de compte. | **Une fois par semaine** : le lundi à 7 h (heure de Paris). Plus les e-mails de compte (bienvenue, connexion, fin d'essai). |

Règles de calme :
- **Rappels :** au plus 1 par jour, jamais la nuit.
- **Dédoublonnage :**
  - une même information ne part qu'une fois (clé d'unicité) ;
  - un même lien et le même texte sont utilisés sur tous les canaux.
- **Désactivation :**
  - tout se coupe dans Paramètres › Notifications ;
  - l'e-mail du lundi a son propre interrupteur.

### Abonnement au push et installation de l'application
- **Demande d'autorisation :** à l'onboarding (étape « rappel du check-in ») et dans Paramètres › Notifications.
- **Abonnement automatique :** si l'autorisation est déjà donnée, l'appareil s'abonne tout seul à chaque ouverture de l'app.
- **Invitation à installer l'app** (bandeau en bas d'écran, pages connectées seulement) :
  - **Android et ordinateur :** bouton « Installer l'application ».
  - **iPhone :** la consigne « Partager → Sur l'écran d'accueil ». Sur iPhone, **les notifications n'arrivent qu'avec l'app installée**.
  - **Si l'utilisateur ferme le bandeau :** il revient après 7 jours. Au bout de 3 refus, on n'insiste plus : l'installation reste possible dans Paramètres.
- **Rappel par e-mail :** si l'utilisateur n'a aucun appareil abonné, l'e-mail du lundi l'invite à installer l'app.
- **Jamais sur les pages publiques** (tunnels, tarifs, pages légales) : les visiteurs ne sont pas des utilisateurs.

## 2. La liste complète

Légende du statut :
- **✓** = existait déjà et fonctionne ;
- **corrigé** = existait mais était cassé ou mal relié ;
- **nouveau** = ajouté en v7.

### Le quotidien (moteur de rappels, 1 par jour au plus)

| Notification | Quand | Canal | Lien | Statut |
|---|---|---|---|---|
| « Ton point du jour est prêt ☀️ » + **les relances prospects du jour** | Chaque jour d'activité choisi, après l'heure du check-in, s'il n'est pas fait | Cloche + push | Accueil, ou le Plan d'action s'il y a des relances | corrigé + nouveau |
| « Ta lettre t'attend ce matin ✉️ » | Le matin où l'énergie est basse (dernier check-in ≤ 2) et qu'une lettre au futur toi est arrivée | Cloche + push | Élan › Lettres | ✓ |
| « Relis ta vision 🧭 » | Lundi après 9 h (toutes les 2 semaines, ou chaque semaine si la vision est vide) | Cloche + push | Vision Board | corrigé (lien) |
| « Un mot pour toi 🙏 » / « Tu m'avais dit pourquoi 🙏 » | **Mercredi après 12 h**, si Ma foi est activée. Reprend la motivation de foi écrite par la personne. | Cloche + push | **Ma foi** | corrigé (ouvrait l'accueil) |
| « Ta victoire de la semaine 🏆 » | Vendredi après 16 h, si aucune victoire notée | Cloche + push | **Revue de la semaine** | corrigé (ouvrait l'accueil) |
| « Un souvenir de toi 🌅 » | Samedi après 10 h, au plus tous les 10 jours (une image ou une phrase écrite par la personne) | Cloche + push | Vision Board | corrigé (lien) |
| « Tes idées attendent d'être rangées 💡 » | Dimanche après 17 h, s'il reste au moins 3 idées en attente | Cloche + push | Élan › Idées | ✓ |
| « Complète ton profil » (pourquoi, vision, valeurs, lettre, foi) | Mardi ou jeudi, 1 fois par semaine, 6 fois en tout | Cloche + push | Paramètres / Élan | ✓ |
| « Ton cockpit t'attend 🌿 » | Après 3 jours sans check-in, 1 fois par semaine au plus | Cloche + push | Accueil | ✓ |
| « Zayado dans Teams » | Une seule fois, à partir du 2ᵉ jour, si la personne a une équipe | Cloche + push | Paramètres | ✓ |
| « Ton actualité du jour » | Chaque matin à l'heure choisie (veille de l'actualité de son secteur) | Cloche + push (e-mail le jeudi si choisi) | Actualités du chat | ✓ |

### Le cercle : vendre (événements, envoyés tout de suite)

| Notification | Quand | Canal | Lien | Statut |
|---|---|---|---|---|
| « Nouveau contact sur « tunnel » 🎯 » | Quelqu'un s'inscrit sur un tunnel publié | Cloche + push | Le tunnel | **nouveau** |
| « Marc : veut commander l'offre principale 🔥 » (ou l'option, la version allégée, un rendez-vous) | Un visiteur dit « oui » dans le tunnel | Cloche + push | Le tunnel | **nouveau** |
| « Objectif du mois atteint 🎉 » | Le client signé qui couvre l'objectif du Pilotage | Cloche + push | Accueil | **nouveau** |
| « Ton Copilote t'a répondu 💬 » | Une réponse de l'IA arrive alors que le chat est fermé | Cloche + push | Chat | ✓ |
| « Agent : mission terminée / à valider » | Un agent personnel a fini sa mission | Cloche + push | Agents | ✓ |

### Ma foi

| Notification | Quand | Canal | Lien | Statut |
|---|---|---|---|---|
| Encouragement de la semaine | Mercredi (voir plus haut) | Cloche + push | Ma foi | corrigé |
| « Prénom t'a répondu 🙏 » | Quelqu'un répond à ta publication dans le Cercle | Cloche + push | Ma foi › Cercle | **nouveau** |
| « Ta publication est soutenue 🙏 » | Quelqu'un te soutient (au plus 1 par publication et par jour) | **Cloche seulement** (un soutien ne doit pas faire vibrer le téléphone) | Ma foi › Cercle | **nouveau** |

### Équipe (« Ton entreprise »)

| Notification | Quand | Canal | Lien |
|---|---|---|---|
| « Nouveau dans ton planning » / « Ton planning a été vu » | Un créneau est ajouté ou consulté | Cloche + push (et compte perso si relié) | Entreprise › Planning |
| « Pièce validée » / « Pièce à refaire » | Le responsable traite une pièce | Cloche + push | Entreprise › Pièces |
| « Commentaire sur… » | Un commentaire sur une ligne, un objet, une base | Cloche + push | La vue concernée |
| « Relier ton compte pro » | Demande de liaison du compte perso | Cloche + push | Paramètres |
| Idées partagées par l'équipe | Un membre partage une idée | Cloche + push | Plan d'action › Idées |
| « Ton dossier de reprise est disponible » | L'assistant a terminé le dossier | Cloche + push | Entreprise |

### Vendeurs (boutique)

| Notification | Quand | Canal | Lien |
|---|---|---|---|
| « Nouvelle vente » | Commande payée | Cloche + push | Espace vendeur |
| « Stock bas » | Sous le seuil choisi (1 fois par niveau) | Cloche + push | Espace vendeur |
| « Reversement payé » / « refusé » | Décision de l'admin | Cloche + push | Espace vendeur |

### Administrateurs Zayado

| Notification | Quand | Canal | Lien | Statut |
|---|---|---|---|---|
| « Appel à rappeler : Prénom ☎ » | Demande d'appel stratégique (tunnel Reprise ou Cession) | Cloche + push | Admin › Pages & Traductions › Inscrits | **nouveau** |

### E-mails

| E-mail | Quand | Statut |
|---|---|---|
| **Ton lundi Zayado**, le récapitulatif de la semaine. Contenu :<br>• ton pourquoi ;<br>• le % de vision réalisée ;<br>• le CA du mois face à l'objectif ;<br>• **le cercle** : clients signés / visés, nouvelles demandes sur tes tunnels, relances à faire ;<br>• tes 3 actions ;<br>• le nombre de **notifications non lues** ;<br>• **l'invitation à installer l'app** s'il n'y a aucun appareil abonné. | Lundi 7 h, 1 fois par semaine | enrichi |
| Actualité de ton secteur | Jeudi, **seulement si l'utilisateur l'a choisi** (par défaut : push seulement) | ✓ |
| Bienvenue | À l'inscription | ✓ |
| Lien de connexion / mot de passe oublié | À la demande | ✓ |
| Rappel de fin d'essai | 7 jours avant le premier prélèvement (15 jours avant un renouvellement annuel) | ✓ |
| Invitation à un Vision Board partagé | Quand quelqu'un t'invite | ✓ |

## 3. Ce qui a été réparé en v7 (bloquant)

- **Le service worker n'était plus enregistré** depuis le passage à Vite. Conséquences : aucune notification push ne pouvait arriver, l'app n'était pas installable et le partage depuis le téléphone ne marchait pas. Il est de nouveau enregistré au chargement.
- **L'abonnement au push partait sans compte** (refus 401). Les appels `fetch` vers `/api` reçoivent de nouveau automatiquement le jeton de connexion.
- **L'abonnement automatique et l'ouverture de la bonne page au clic** (composant AutoPush) n'étaient montés nulle part. Ils sont montés sur toutes les pages connectées.
- **Le bandeau d'installation** n'était affiché que sur 4 pages et seulement sur mobile, avec un refus définitif. Il est maintenant global (mobile et ordinateur), revient après 7 jours, et s'arrête après 3 refus.
- **Liens corrigés :**
  - foi → Ma foi ;
  - victoire → Revue ;
  - vision et souvenir → Vision Board ;
  - point du jour → Accueil ou Plan d'action.

## 4. Pistes suivantes (non faites)

- Fusionner l'actualité du matin dans le « point du jour », pour ne faire vibrer le téléphone qu'une fois le matin.
- Un résumé « tunnels » dans la cloche quand plusieurs contacts arrivent le même jour (au-delà de 5).
- Paramètres › Notifications : un interrupteur par famille (quotidien, ventes, foi, équipe).
