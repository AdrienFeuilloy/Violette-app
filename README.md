# Gestion quotidien : v2.14.0

Le hub de la maison, hébergé sur **GitHub Pages**. Chaque appli range ses données dans son propre fichier JSON, dans **ton dépôt privé de données**, via l'API GitHub. Le jeton GitHub et le lien du tri 🛠️ restent sur le téléphone : ils ne sont jamais écrits dans ce dépôt. Aucune donnée ne part chez un service extérieur, à part GitHub.

## Les applis

| Page | Appli | Fichier de données |
|---|---|---|
| `index.html` | Accueil : tuiles, quête du jour, résumé de chaque appli | `JSON_HUB.json` |
| `violette.html` | Violette (diversification) | `JSON_VIOLETTE.json` |
| `habits.html` | Habits : quoi mettre à Violette selon la météo et la température de la chambre | `JSON_HABITS.json` |
| `animaux.html` | Animaux : pesées, vétérinaire, vermifuges et vaccins | `JSON_ANIMAUX.json` |
| `plantes.html` | Plantes : tailles et engrais | `JSON_PLANTES.json` |
| `budget.html` | Cha-cha le compteur : budget, catégories automatiques, liste d'achats selon le solde | `JSON_BUDGET.json` |
| `paperasse.html` | Paperasse : documents, échéances, garanties (scan lu sur le téléphone) | `JSON_PAPERASSE.json` |
| `garage.html` | Garage : entretien de la voiture | `JSON_GARAGE.json` |
| `colis.html` | Colis : suivi des commandes | `JSON_COLIS.json` |
| `collections.html` | Collections : objets, envies, prêts (ajout par photo) | `JSON_COLLECTIONS.json` |

Fichiers communs : `ui/kit.css` et `ui/kit.js` (style, synchro, réglages, Rocket), `passerelle-budget.js` (Paperasse → Cha-cha), `sw.js` (hors ligne), `manifest.webmanifest` et les icônes.

## Réglages (une seule fois par téléphone)

Ouvre n'importe quelle appli, touche ⚙️, puis renseigne **Propriétaire**, **Dépôt** (le dépôt privé de données), **Branche** et **Jeton**. Ces réglages sont partagés par toutes les applis du hub, et seulement par elles : Cerveau et Phant ont chacun leur propre connexion.

**Login simple.** ⚙️ de l'accueil → « Activer le login » (depuis un appareil déjà relié) : on choisit un identifiant et un mot de passe propres au hub (12 caractères ou plus). Le jeton est chiffré avec eux (PBKDF2 600 000 itérations + AES-GCM) et publié dans `acces.json`, à la racine de ce dépôt ; seul le chiffré est public. Le jeton doit avoir accès en écriture au dépôt `violette-app` pour publier ce fichier. Sur un nouvel appareil, l'écran de connexion s'ouvre tout seul. En cas de nouveau jeton, réactiver le login.

Lien du tri 🛠️ : dans ⚙️ de l'accueil, « Lien de ma session de travail ». Il reste sur l'appareil.

Thème clair / sombre / automatique et prénom affiché sur l'accueil : dans ⚙️ de l'accueil.

### Visite guidée et remarques
En bas de chaque appli, deux liens discrets : **✦ Visite guidée** (une série de bulles qui montre comment s'en servir) et **✎ Remarque** (pour noter un bug, une idée, un souci de design ou de texte). Les remarques sont rangées dans `JSON_FEEDBACK.json` : sur demande, elles sont relues, corrigées, puis passées à « faite » avec un mot d’explication.

### Ce qui est synchronisé, et ce qui reste sur l'appareil
- **Dans le dépôt privé** : toutes les données de chaque appli, leurs réglages, et `JSON_HUB.json` (prénom, thème, sons, résumés affichés sur l'accueil). Un nouvel appareil retrouve tout après la saisie du jeton.
- **Sur chaque appareil seulement** : le jeton GitHub (il sert à ouvrir le dépôt, à saisir une fois par appareil, dans n'importe quelle appli), le lien du tri 🛠️ et l'état d'affichage (onglet ouvert, filtres).

## Tri 🛠️ : ce qui est « à traiter »

Les applis ne devinent plus rien seules au-delà de leurs règles : elles marquent ce qui reste à faire, et une session de travail ouverte sur le dépôt privé de données s'en charge.

- **Paperasse** : un scan est lu sur le téléphone, le texte est masqué (dates → `[DATE1]`, montants → `[MONTANT1]`, autres nombres → `###`, noms → `[PERSONNE]`, adresses → `[ADRESSE]`), puis la fiche est rangée avec `"tri": "à classer"`.
- **Collections** : une photo ajoutée crée l'objet avec la photo et `"tri": "à identifier"`. La barre de sélection permet aussi de marquer des objets existants.
- **Cha-cha** : les règles et ce que l'appli a appris classent ce qu'elles reconnaissent ; le reste garde la catégorie ou le tag `"Non défini"` (« à classer »).

Le compteur « N à traiter » est en bas de l'accueil, et chaque appli concernée affiche le sien. Le bouton 🛠️ copie ce message, puis ouvre le lien réglé dans ⚙️ :

> Traite mes demandes du hub : les fiches Paperasse à classer, les objets Collections à identifier et les opérations Cha-cha à classer, puis retire leur statut.

### Marche à suivre pour la session

Règles communes aux trois fichiers (dépôt privé de données, branche `main`) :
- Ne modifier **que** les éléments marqués et **que** les champs listés ci-dessous. Les éléments déjà classés ne changent pas.
- Garder le format exact : JSON indenté d'**un** espace (`JSON.stringify(data, null, 1)`), mêmes noms de champs, valeurs vides en `""`.
- Sur chaque élément modifié, mettre `updatedAt` à l'heure actuelle en millisecondes (`Date.now()`), plus grande que l'ancienne : c'est elle qui fait gagner la nouvelle version quand les applis fusionnent. Mettre aussi à jour le `updatedAt` du fichier.
- Ne rien inventer : laisser `""` ce qu'on ne peut pas savoir. Si un élément reste impossible à traiter, laisser son statut et le dire.
- Un commit par fichier, message simple (ex. « Tri : 4 fiches Paperasse classées »).

**Paperasse, `JSON_PAPERASSE.json`** : éléments de `docs` avec `"tri": "à classer"`.
- À lire : `text` (texte masqué) et les fichiers de `files` (`path` dans `paperasse-media/`, photo JPEG ou PDF) pour retrouver les vraies dates et les vrais montants.
- À remplir : `category` (`facture`, `garantie`, `contrat`, `sante`, `admin`, `banque`, `logement`, `vehicule`, `famille`, `travail`, `autre`), `title` (court, sans montant), `issuer` (même orthographe que les fiches existantes si c'est le même), `docDate`, `dueDate`, `endDate`, `warrantyEnd` (dates `AAAA-MM-JJ`), `amount` (nombre en texte, point décimal, ex. `"42.90"`), `reference`, `renewal` (`""`, `mensuel`, `trimestriel`, `semestriel`, `annuel`), `action`, `person`, `summary`, `tags` (liste), `status` (`a_traiter` s'il y a une échéance ou une action, sinon `fait`).
- Pour finir : supprimer le champ `tri`, ajouter `{ "at": <Date.now()>, "txt": "Classé (tri 🛠️)" }` à la fin de `history`.

**Collections, `JSON_COLLECTIONS.json`** : éléments de `items` avec `"tri": "à identifier"`.
- À lire : la photo de `cover` (`{"type": "repo", "path": "collections-media/…"}`) et la liste `collections` (id, nom, type).
- À remplir : `title`, `subtitle`, `creators`, `series`, `volume` (chiffres), `publisher`, `year` (4 chiffres), `isbn`, `format`, `genre`, `language`, `description`. Si l'objet est dans une collection qui ne lui correspond pas, changer `collectionId` vers l'`id` d'une collection existante du bon type (ne pas en créer). Garder la photo comme `cover`.
- Pour finir : supprimer le champ `tri`.

**Cha-cha, `JSON_BUDGET.json`** : éléments de `transactions` dont `category` ou `tag` vaut `"Non défini"` (ou est vide).
- À lire : `label`, `amount`, `date`, et les opérations déjà classées au libellé proche (pour faire pareil).
- À remplir : `category` (une valeur de `settings.categories`), `tag` (`Inévitable`, `Évitable` ou `Non applicable` pour les revenus et virements internes), et `"auto": "tri"` (l'appli l'affiche « Classée automatiquement (tri 🛠️) » et la propose dans « les vérifier »).
- Ne jamais toucher à `amount`, `date`, `label` ni à `settings`.

## Jeton GitHub

**Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token** : accès au seul dépôt de données, permission **Contents : Read and write**, expiration 1 an au plus (note la date).

## Fonctionnement de la synchro

- À l'ouverture, au retour sur l'appli, quelques secondes après chaque modification. La pastille en haut indique l'état.
- Si deux téléphones écrivent en même temps, l'appli fusionne élément par élément (le plus récent gagne) puis réécrit. Les suppressions se propagent.
- Hors ligne, tout fonctionne ; les modifications partent au retour du réseau.
- Chaque sauvegarde est un commit : l'historique de chaque JSON sur GitHub permet de revenir en arrière.

## Historique

### v2.14.0
- Plus aucun service extérieur d'analyse : le champ de clé, le choix du modèle et tous les appels sont retirés (Paperasse, Collections, Cha-cha, réglages). L'ancienne clé est effacée de l'appareil et de `JSON_HUB.json` au premier chargement.
- Nouveau tri 🛠️ : Paperasse range les scans « à classer » (texte lu et masqué sur le téléphone), Collections crée les objets photographiés « à identifier », Cha-cha laisse « à classer » ce que ses règles ne reconnaissent pas.
- Accueil : compteur « N à traiter » et bouton 🛠️ en bas (copie la demande, ouvre la session de travail). Le lien se règle dans ⚙️ et reste sur l'appareil.
- Marche à suivre de la session décrite ci-dessus, section « Tri 🛠️ ».

### v2.13.0
- Violette : bouton « 📜 Historique » en haut à droite des Menus. Tableau des repas pris, une ligne par jour, une colonne par repas, rempli à chaque « ✓ Repas pris » (annulé avec ↶). Enregistré dans `history` du JSON.

### v2.12.0
- Connexion propre au hub : écran identifiant + mot de passe sur un nouvel appareil, sans dépendre de Cerveau.
- La déconnexion et les mises à jour ne touchent plus aux autres applis du même site (Cerveau, Phant).

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
