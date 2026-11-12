# Gestion quotidien : v2.0.0

Le hub de la maison, hébergé sur **GitHub Pages**. Chaque appli range ses données dans son propre fichier JSON, dans **ton dépôt privé de données**, via l'API GitHub. Le jeton GitHub et la clé IA restent sur le téléphone : ils ne sont jamais écrits dans ce dépôt.

## Les applis

| Page | Appli | Fichier de données |
|---|---|---|
| `index.html` | Accueil : tuiles, quête du jour, résumé de chaque appli | `JSON_HUB.json` |
| `violette.html` | Violette (diversification) | `JSON_VIOLETTE.json` |
| `habits.html` | Habits : quoi mettre à Violette selon la météo et la température de la chambre | `JSON_HABITS.json` |
| `animaux.html` | Animaux : pesées, vétérinaire, vermifuges et vaccins | `JSON_ANIMAUX.json` |
| `plantes.html` | Plantes : tailles et engrais | `JSON_PLANTES.json` |
| `budget.html` | Cha-cha le compteur : budget, catégories automatiques, liste d'achats selon le solde | `JSON_BUDGET.json` |
| `paperasse.html` | Paperasse : documents, échéances, garanties (scan IA) | `JSON_PAPERASSE.json` |
| `garage.html` | Garage : entretien de la voiture | `JSON_GARAGE.json` |
| `colis.html` | Colis : suivi des commandes | `JSON_COLIS.json` |
| `collections.html` | Collections : objets, envies, prêts (ajout par photo IA) | `JSON_COLLECTIONS.json` |

Fichiers communs : `ui/kit.css` et `ui/kit.js` (style, synchro, réglages, Rocket), `passerelle-budget.js` (Paperasse → Cha-cha), `sw.js` (hors ligne), `manifest.webmanifest` et les icônes.

## Réglages (une seule fois par téléphone)

Ouvre n'importe quelle appli, touche ⚙️, puis renseigne **Propriétaire**, **Dépôt** (le dépôt privé de données), **Branche** et **Jeton**. Ces réglages sont partagés par toutes les applis. Un téléphone déjà réglé pour Violette n'a rien à refaire : les applis reprennent ses réglages.

La clé IA (Anthropic) est facultative : elle sert au scan de Paperasse, à l'ajout par photo de Collections et au classement IA de Cha-cha.

Thème clair / sombre / automatique et prénom affiché sur l'accueil : dans ⚙️ de l'accueil.

### Visite guidée et remarques
En bas de chaque appli, deux liens discrets : **✦ Visite guidée** (une série de bulles qui montre comment s'en servir) et **✎ Remarque** (pour noter un bug, une idée, un souci de design ou de texte). Les remarques sont rangées dans `JSON_FEEDBACK.json` ; Claude les lit sur demande, applique les correctifs et passe chaque remarque à « faite » avec un mot d'explication.

### Ce qui est synchronisé, et ce qui reste sur l'appareil
- **Dans le dépôt privé** : toutes les données de chaque appli, leurs réglages, et `JSON_HUB.json` (prénom, thème, sons, modèle IA, résumés affichés sur l'accueil). Un nouvel appareil retrouve tout après la saisie du jeton.
- **Sur chaque appareil seulement** : le jeton GitHub (il sert à ouvrir le dépôt), la clé Gemini, et l'état d'affichage (onglet ouvert, filtres).

## Jeton GitHub

**Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** : accès au seul dépôt de données, permission **Contents : Read and write**, expiration 1 an au plus (note la date).

## Fonctionnement de la synchro

- À l'ouverture, au retour sur l'appli, quelques secondes après chaque modification. La pastille en haut indique l'état.
- Si deux téléphones écrivent en même temps, l'appli fusionne élément par élément (le plus récent gagne) puis réécrit. Les suppressions se propagent.
- Hors ligne, tout fonctionne ; les modifications partent au retour du réseau.
- Chaque sauvegarde est un commit : l'historique de chaque JSON sur GitHub permet de revenir en arrière.

## Historique

### v2.0.0
- L'accueil devient un hub ; Violette passe sur `violette.html` (aucune donnée ne change).
- Nouvelles applis : Habits, Animaux, Plantes, Cha-cha le compteur, Garage, Colis ; Paperasse et Collections rejoignent le hub.
- Nouvelle direction artistique commune : base claire avec mode sombre, une couleur par appli, paysages et Rocket.
- Le service worker range chaque page sous sa propre adresse (avant, toute navigation écrasait `index.html` en cache).

### Violette v1.6.1
- « ✨ Remplir les vides » remplit **tous** les repas affichés : quand les aliments « idéaux » manquent, il accepte de répéter un aliment plus de 2 fois dans la semaine ou de proposer un aliment hors saison (à cuisiner).
- **Fruits à coque** : ajoutés automatiquement en complément d'un repas de fruit (goûter ou p'tit déj), **1 cc, 2 fois par semaine** comme le dit la frise, répartis dans la semaine et en alternant (le moins récemment donné d'abord). Affichés « ➕ Complément : 1 cc » ; ceux que tu ajoutes à la main comptent dans les 2.

### Violette v1.6.0
- **Frise de diversification intégrée** (onglet Violette → 📖 Repères) : ce qui est autorisé maintenant, les prochaines étapes datées, la texture et la frise complète. La frise **pilote les propositions** : un aliment n'est proposé que si l'âge de sa fiche *et* celui de sa famille sont atteints (ex. Radis cru → 12 mois, fruits crus → 9 mois). La famille est devinée automatiquement et modifiable dans la fiche.
- **Cru / cuit** : une fiche par préparation (« Kaki (cuit) » / « Kaki (cru) »). Bouton 🔥/🥕 dans Stocks pour basculer une fiche (avec « Annuler »), filtre Cru/Cuit, champ Préparation dans la fiche, et « ⇄ servir cru/cuit » dans un repas (crée la fiche jumelle si besoin).
- **Frais du jour** : un aliment 🍳 à cuisiner frais par jour, à tour de rôle sur **tous** les repas affichés (midi, goûter, et p'tit déj / dîner quand ils sont affichés). D'autres 🍳 peuvent s'ajouter uniquement quand le stock ne suffit pas.
- **Repas affichés** : boutons P'tit déj / Déjeuner / Goûter / Dîner en haut de l'onglet Menus, enregistrés et synchronisés entre les téléphones. Rien à redévelopper le jour où le p'tit déj ou le dîner démarrent.
- **Protéines selon la frise** (⚙️, activé par défaut) : uniquement le midi, 10 g puis 20 g automatiquement à 9 mois. Décocher pour reprendre la main sur les grammages.
- Légumineuses : 2 fois par semaine maximum.
- Les repas sont reliés aux fiches par identifiant : plus d'ambiguïté entre deux fiches du même nom.
- « Prochaines découvertes » : aliments autorisés pas encore goûtés, puis prochain palier (âge fiche + frise).

### Violette v1.5.1
- Le fichier par défaut s'appelle `JSON_VIOLETTE.json`, pour cohabiter avec un autre JSON dans le même dépôt.
- « Importer JSON » accepte l'export brut de la console Firebase (racine `violette_data`).

### Violette par rapport à la v1.4.12

- Firebase est remplacé par la synchro GitHub, et l'appli devient installable avec un vrai mode hors ligne.
- **Import CSV** : un stock de 1 pot (ou une cellule « 0 ») n'est plus transformé en OUI/NON, ce qui le faisait passer à 0. Une colonne « Nombre restant » n'est plus prise pour la colonne du nom.
- **Composeur de repas** : les aliments dont le nom contient une apostrophe (« Courge d'hiver ») sont de nouveau sélectionnables.
- **« ✓ Repas pris »** : un aliment cuisiné frais ne retire plus de pots du stock.
- **Liste « à cuisiner frais »** : le marquage disparaissait à chaque rechargement, à cause d'un bug de lecture des données. C'est corrigé.
- **Export JSON** : il inclut maintenant les réglages, et un **Import JSON** a été ajouté.
- Petites corrections : l'affichage « Risque : Aucune » erroné, la modification d'une fiche qui changeait le type de son identifiant, du code inutilisé.
