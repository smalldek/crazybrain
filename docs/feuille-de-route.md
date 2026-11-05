# Feuille de route

Des étapes courtes. Chacune livre quelque chose qu'on peut essayer, et dit à quoi on reconnaît
qu'elle est faite. L'interface se construit au fil des étapes : chacune ajoute l'écran dont elle a
besoin, simple, amélioré ensuite à l'usage.

Chaque étape est découpée en **tâches**, numérotées `<étape>.<n>`. Une tâche tient dans une PR (ou
deux) et se vérifie seule. Seules les tâches de l'étape en cours sont détaillées ; celles des
étapes suivantes sont en grosse maille et se détaillent au moment de commencer l'étape.

L'état d'avancement (étape en cours, ce qui est fait) est tenu dans le vault d'Adrien,
`informatique/crazybrain.md`. Ce fichier dit ce que contient chaque étape.

**Qui fait quoi.** Claude construit (code, tests, doc, PR) et **vérifie lui-même**, par des tests
automatiques : unitaires, d'acceptation sur l'API, et la page jouée dans un vrai navigateur à la
taille d'un téléphone (consigne d'Adrien du 05/11 : « tu fais du test auto et tu vérifies toi
même »). Adrien n'intervient que pour ce qu'aucun test ne peut faire à sa place (un réglage de son
compte claude.ai, par exemple). La configuration du compte Cloudflare (Access, pare-feu,
DNS, Email Routing) vit en code dans un autre dépôt, géré par le projet « Cloudflare » : quand une
tâche en a besoin, elle le dit (« Il faut du projet Cloudflare »), et Adrien fait la demande là-bas.

## Vue d'ensemble

| Étape | Ce qu'elle apporte | État |
|---|---|---|
| 0. Cadrage | Vision, fonctionnalités, architecture, cette feuille de route | Fait le 03/11 |
| 1. Socle | Le site, la connexion Google, la base, l'API, le connecteur testé, modifier une tâche, le modèle complet | Fait le 05/11 |
| 2. Connecteur Claude | Claude lit, crée et modifie les tâches depuis une conversation | Fait le 05/11 |
| 3. Kanban, détail, tags, filtres | Le premier vrai écran de travail | — |
| 4. Requêtes enregistrées, tableaux de bord | Claude écrit des requêtes, l'outil les rejoue | — |
| 5. L'appli sur le téléphone | Icône, partage, rappels, tâches récurrentes | — |
| 6. Calendrier et mode journée | Planifier sa journée à la Sunsama | — |
| 7. Horizons et objectifs | Timestripe et Goalscape | — |
| 8. Mail → tâche | Un mail envoyé à une adresse devient une tâche | — |

## Étape 0 — Cadrage

- **Livre** : la vision, la liste des fonctionnalités, l'architecture, cette feuille de route, la
  décision sur le socle ; le projet dans le vault.
- **Fait quand** : la PR de cadrage est fusionnée. **Fait le 03/11/2026.**

## Étape 1 — Socle

Ordre revu par Adrien le 03/11 : d'abord un site vide en ligne, puis la connexion Google, puis le
connecteur. Plan revu le 05/11 : on finit le socle avant d'ouvrir l'étape 2.

### Déjà fait

- **1a. Un site vide en ligne** (03/11) : une page d'accueil servie par un Worker sur
  `crazybrain.dekermadec.net`, déployée par GitHub Actions à chaque fusion dans `main`.
- **1b. La connexion Google devant le site** (03/11) : Cloudflare Access avec Google seul ; le
  déploiement vérifie qu'Access est en place. Testé par Adrien.
- **1c. Le connecteur MCP, construit** (04/11, [décision 003](decisions/003-connecteur-claude.md)) :
  le Worker est le serveur OAuth, `/authorize` reste derrière Access avec une page de consentement,
  seules les adresses du connecteur sont ouvertes ; l'outil `bonjour` répond avec le nombre de
  tâches. L'exception au pare-feu « hors de France » est posée en code par le projet Cloudflare
  depuis le 05/11. **Vérifié le 05/11** (tâche 1.1).
- **1d. Le squelette** (03/11, vérifié par Adrien sur son téléphone) : décision 002, base D1
  (`elements`, `evenements`), API créer et lister, page liste avec saisie rapide, tests
  unitaires et d'acceptation lancés avant chaque déploiement.

### Reste à faire

| Tâche | Ce qu'elle livre | Il faut d'Adrien |
|---|---|---|
| 1.1 | Le connecteur testé pour de vrai dans claude.ai | **Fait le 05/11** |
| 1.2 | Modifier une tâche : la cocher, la renommer, lui donner une échéance | **Fait le 05/11** |
| 1.3 | Le modèle de données complet en base : types, parent, projets, liens, tags, commentaires | **Fait le 05/11** |
| 1.4 | Le déploiement ne pose plus rien dans Cloudflare, il vérifie seulement | **Fait le 05/11** |
| 1.5 | Supprimer (archiver) une tâche | **Fait le 05/11** |

**Fait quand (étape 1)** : le connecteur répond dans une conversation d'Adrien ; sur la page, à la
taille d'un téléphone, on crée, coche, renomme et date une tâche, et tout survit au rechargement
(tests dans le navigateur) ; la base a toutes les tables dont l'étape 2 a besoin.

### 1.1 Vérifier le connecteur dans claude.ai

**Fait le 05/11.** Adrien a ajouté le connecteur dans claude.ai ; depuis une session de son projet,
Claude a appelé `bonjour` et reçu « Bonjour depuis Crazybrain ! 2 tâches en base ». L'appel sans
jeton est refusé (401), vérifié par les tests d'acceptation (`features/connecteur.feature`).

**Pourquoi d'abord** : c'est le pari dont dépendent les étapes 2 et 4 ([architecture](architecture.md),
« Hypothèses à vérifier »). Tant qu'il n'est pas vérifié, construire les outils du connecteur
serait construire sur du sable.

**Où on en est** : tout est en ligne (déploiement du 04/11 vert) ; l'exception au pare-feu, qui
laisse les serveurs d'Anthropic atteindre le connecteur depuis les États-Unis, est posée depuis
le 05/11. Il ne manque que le test, qui ne peut se faire que depuis le compte claude.ai d'Adrien.

**Le test, par Adrien** (une dizaine de minutes) :

1. Dans claude.ai : Réglages, Connecteurs, « Ajouter un connecteur personnalisé » ; nom
   `Crazybrain`, adresse `https://crazybrain.dekermadec.net/mcp`.
2. claude.ai ouvre une fenêtre : se connecter avec Google, puis cliquer « Autoriser » sur la page
   de consentement de Crazybrain.
3. Dans une nouvelle conversation : « appelle l'outil bonjour de Crazybrain ». Réponse attendue :
   « Bonjour depuis Crazybrain ! N tâches en base », avec N le nombre de tâches de la liste.
4. Le contre-test : en navigation privée, ouvrir `https://crazybrain.dekermadec.net/mcp`. On doit
   voir un refus (erreur 401, « non autorisé »), pas une réponse de l'outil.

**Si ça bloque** : noter à quel écran (ajout refusé, fenêtre Google qui boucle, page de
consentement, outil qui ne répond pas) et faire une capture du message d'erreur. Chaque écran
pointe vers une pièce différente :

| Où ça bloque | Pièce en cause | Qui corrige |
|---|---|---|
| L'ajout du connecteur échoue tout de suite | Le pare-feu ou l'ouverture d'Access sur `/.well-known/…` et `/register` | Projet Cloudflare si c'est le pare-feu, Claude sinon |
| La connexion Google boucle ou refuse | Access devant `/authorize` | Claude, avec le projet Cloudflare si une règle Access manque |
| Consentement accepté, mais l'outil ne répond pas | Le jeton OAuth ou la route `/mcp` du Worker | Claude |

Si rien ne passe, on essaie les replis prévus (décision 003) avant d'aller plus loin.

**Quand ça marche, Claude** : marque l'hypothèse vérifiée dans `docs/architecture.md` et la
décision 003, coche 1c ici, et met l'état à jour dans le vault.

**Fait quand** : Claude reçoit la réponse de `bonjour` dans une conversation d'Adrien, et l'appel
sans connexion est refusé.

### 1.2 Modifier une tâche

**Fait le 05/11**, vérifié par les tests : unitaires du domaine (échéance, statuts, modification),
neuf scénarios d'API (`features/taches.feature`) et cinq scénarios de la page dans Chromium à la
taille d'un téléphone (`features/page.feature`). Ce qui suit est le détail prévu, tel que construit.

**Pourquoi** : aujourd'hui l'API sait seulement créer et lister. On ne peut ni cocher une tâche
faite, ni corriger une faute de frappe. Le connecteur de l'étape 2 en aura besoin (« passe cette
tâche en fait »), et Adrien aussi, tout de suite, pour se servir de la liste.

**Ce qui change, couche par couche** :

- **Base** : une migration `0002` ajoute à `elements` deux colonnes, `echeance` (une date sans
  heure, facultative) et `fait_le` (la date où la tâche est passée à « fait »). Une migration est
  un script qui fait évoluer la base ; on n'en modifie jamais une ancienne, on en ajoute une
  nouvelle, appliquée par le déploiement.
- **Domaine** (`src/domaine/`, sans Cloudflare ni HTTP) : trois statuts au lieu d'un,
  `a_faire`, `en_cours`, `fait` (provisoires : les statuts par type arrivent en 1.3) ; une
  échéance (objet-valeur `Echeance`, qui refuse une date invalide) ; sur l'entité `Element`, des
  méthodes `renommer`, `changerStatut` (qui pose ou retire `fait_le`) et `changerEcheance` ; un
  cas d'usage `modifierElement` qui applique les changements demandés et rend l'élément et
  l'événement `element_modifie`, avec l'avant et l'après.
- **API** : `GET /api/elements/:id` (lire une tâche) et `PATCH /api/elements/:id` (modifier
  seulement les champs envoyés : `titre`, `statut`, `echeance`). Réponses : 200 avec la tâche, 404
  si elle n'existe pas, 400 si une valeur est invalide. L'état et l'événement s'écrivent dans la
  même transaction, comme pour la création. Si deux modifications se croisent, la dernière gagne
  (Adrien est seul utilisateur).
- **Page** : une case à cocher devant chaque tâche (cochée : la tâche passe à « fait », grisée
  en bas de la liste) ; toucher le titre pour le corriger ; un petit champ date pour l'échéance,
  avec l'échéance dépassée en rouge.

**Comment on le vérifie** :

- tests unitaires du domaine, écrits avant le code (TDD) : renommer avec un titre vide est
  refusé, passer à « fait » pose `fait_le`, revenir à « à faire » l'efface, une modification sans
  changement n'écrit pas d'événement ;
- scénarios d'acceptation en français dans `features/taches.feature` : cocher une tâche et la
  retrouver faite ; renommer ; poser une échéance ; une tâche inconnue répond 404 ; chaque
  modification écrit un événement avec l'avant, l'après et l'auteur ;
- puis le test d'Adrien.

**Il faut d'Adrien** : rien (les tests de la page remplacent le test sur le téléphone). Rien du projet Cloudflare (la migration est
appliquée par le déploiement, qui a déjà le droit sur la base).

**Fait quand** : sur la page, à la taille d'un téléphone, on coche une tâche, en renomme une autre, donne une
échéance à une troisième, recharge la page, et retrouve tout.

### 1.3 Le modèle de données complet

**Fait le 05/11**, en deux migrations, vérifié par les tests (unitaires et 13 scénarios d'API,
`features/modele.feature` et `features/relations.feature`) :

- **`0003`** : la table `types` (projet, initiative, objectif, epic, feature, tache ; on en ajoute
  une ligne pour un nouveau type), et sur l'élément `type`, `parent`, `description` (Markdown),
  `priorite` (basse, normale, haute, urgente), `jour_planifie` et `heure_planifiee`,
  `estimation` (minutes), `rang`. Un parent qui ferait une boucle (ranger un projet dans sa propre
  tâche) est refusé.
- **`0004`** : les tables `liens` (`appartient_a`, `bloque`, `duplique`, `lie_a`), `tags`
  (clé:valeur, ou clé seule) et `commentaires` (auteur Adrien ou Claude).
- **API** : créer un élément avec tous ses champs dès le départ, les modifier, `GET /api/types` ;
  lire un élément rend aussi ses liens, tags et commentaires ; poser et retirer liens et tags,
  commenter. Chaque ajout ou retrait s'écrit dans le journal.

La page ne change pas : les écrans de ces champs viennent à l'étape 3. Restent pour plus tard,
comme prévu : `recurrence` (étape 5) et `poids` (étape 7) ; modifier ou supprimer un commentaire.
Les statuts restent communs à tous les types ; des statuts par type viendront si le kanban en a
besoin.

### 1.4 Le déploiement vérifie, il ne pose plus (grosse maille)

Depuis le 05/11, les portes Access et l'exception au pare-feu de Crazybrain sont décrites en code
dans le dépôt du projet Cloudflare. Les scripts du déploiement de Crazybrain qui les posent
(`outils/poser_access.py`, `poser_ouverture_connecteur.py`, `poser_pare_feu.py`) font doublon :
deux mains sur le même réglage finissent par se contredire. **Fait le 05/11** : les trois scripts sont
retirés, le déploiement ne fait plus que vérifier ; le garde-fou (refuser une mise en ligne sans
Access) reste. Vérifié avant : tout ce qu'ils posaient (l'application Access « crazybrain »,
« crazybrain-connecteur » et ses cinq chemins, l'exception au pare-feu) est dans le code du projet
Cloudflare.

### 1.5 Supprimer une tâche

**Fait le 05/11**, vérifié par les tests (unitaires, deux scénarios d'API, un scénario de la page
dans le navigateur). Supprimer une tâche l'**archive** (migration `0005`, colonne `archive_le`) :
elle sort de la liste mais reste en base avec son histoire. Sur la page, une croix au bout de la
ligne ; pas de question « êtes-vous sûr ? », mais un bouton « Annuler » qui la restaure aussitôt.
Une tâche supprimée ne se modifie plus tant qu'elle n'est pas restaurée. API :
`DELETE /api/elements/:id` et `POST /api/elements/:id/restaurer`. Une suppression définitive
viendra seulement si le besoin s'en fait sentir.

Au passage, la page réduit le champ d'échéance vide à son icône de calendrier, pour laisser la place
au titre sur un téléphone.

## Étape 2 — Connecteur Claude

- **Livre** : les outils du connecteur. C'est aussi la saisie rapide par l'IA.
- **Finie le 05/11** : construite, puis essayée pour de vrai depuis une session du projet (2.6).
- **Tâches** :
  - 2.1 Lire : `chercher_elements` (texte, statut, type, projet avec ses sous-projets, parent, tags,
    en retard, aujourd'hui, échéance, jour planifié ; les faits exclus par défaut) et
    `lire_element` (avec ses liens, tags et commentaires). **Fait.**
  - 2.2 Créer : `creer_elements`, jusqu'à 50 d'un coup, avec projets (id ou titre exact), parent,
    tags, échéance… **Fait.**
  - 2.3 Modifier : `modifier_element`, `supprimer_element`, `restaurer_element` ; Claude est
    l'auteur dans le journal. **Fait.**
  - 2.4 Commenter, lier, tagger : `commenter_element`, `lier_elements`, `retirer_lien`,
    `tagger_element`, `retirer_tag`, `lister_types`. **Fait.**
  - 2.5 Des descriptions d'outils et des consignes de serveur écrites pour Claude (le modèle, les
    valeurs permises, « en retard » compté au jour de Paris), et 8 scénarios d'acceptation qui
    jouent OAuth puis les appels MCP (`features/connecteur-outils.feature`). **Fait.**
  - 2.6 Le test réel : Claude appelle les outils depuis une session du projet d'Adrien. **Fait le
    05/11**, sur la base de production, avec des éléments de test marqués `ESSAI-2.6` (un projet,
    quatre tâches), tous archivés à la fin ; les deux tâches d'Adrien n'ont pas été touchées. Les 13
    outils répondent. Vérifié : une tâche rattachée au projet par son titre exact puis par son id ;
    une sous-tâche rangée dans le projet par `parent` ; « en retard », « aujourd'hui » (comptés au
    5 novembre, jour de Paris), échéance au plus tard, jour planifié, tag par clé seule ou
    `cle:valeur`, texte, statut, type, parent ; les faites exclues par défaut ; modifier (titre,
    statut fait avec sa date, champ vidé par `null`, description Markdown) ; commentaire signé
    `claude` ; lien `bloque` posé puis retiré ; tag posé puis retiré ; supprimer, l'élément sort des
    listes, restaurer le remet. Les refus disent pourquoi : projet inconnu (les éléments d'avant
    restent créés, la réponse donne le rang refusé et s'arrête là), jour impossible (`2026-13-45`),
    id inconnu.
    Une remarque, sans correction pour l'instant : commenter, tagger ou lier ne change pas la date
    de modification de l'élément (`modifieLe`) ; seul un changement de ses champs la change. À
    trancher quand l'écran trie par « modifié récemment » (étape 3).
- **Au passage** : l'API de la page et le connecteur passent par le même service d'application
  (`src/application/service-elements.ts`) ; une règle n'est écrite qu'une fois.
- **Fait quand** : dans une conversation, « crée trois tâches pour le projet X » les fait
  apparaître dans la liste ; « qu'est-ce qui est en retard ? » donne la bonne réponse.

## Étape 3 — Kanban, détail, tags, filtres

- **Livre** : le premier vrai écran de travail.
- **Tâches** :
  - 3.1 ✓ Choisir l'outil d'interface : React, construit par Vite
    ([décision 004](decisions/004-outil-interface.md)) ; la page actuelle y est portée, ses six
    scénarios dans le navigateur passent à l'identique (05/11).
  - 3.2 ✓ Une adresse par élément (`/e/<id>`), qui ouvre son panneau de détail : à droite sur un
    grand écran, en plein écran sur le téléphone ; tous les champs s'y modifient (statut, type,
    priorité, parent, description, échéance, jour et heure prévus, estimation). Une flèche sur
    chaque ligne l'ouvre ; la croix, Échap ou le bouton Retour le ferment (05/11).
  - 3.3 ✓ Commentaires et liens dans le panneau : la liste des commentaires (auteur, date, retours à
    la ligne gardés) et un champ pour commenter ; les liens lus dans le bon sens (« bloque » depuis
    la source, « bloqué par » depuis la cible), un lien mène à l'autre élément, une croix le retire,
    et on en pose un en choisissant sa sorte et l'élément (05/11). La date « modifié le » ne bouge
    toujours pas pour un commentaire ou un lien (remarque de 2.6) : à trancher avec le tri
    « modifié récemment », qui n'existe pas encore.
  - 3.4 ✓ Le kanban (`/kanban`) : colonnes par statut, glisser une carte change son statut, la
    glisser dans sa colonne change son ordre (`rang`, posé de 1000 en 1000). À la souris, au doigt
    après un appui long (un glissement court fait défiler), au clavier. Toucher une carte ouvre son
    détail (`/kanban/e/<id>`). Glisser-déposer par la bibliothèque dnd-kit (05/11).
  - 3.5 Les couloirs : par parent, par priorité, ou par une clé de tag au choix.
  - 3.6 Les tags clé:valeur à l'écran, avec complétion ; `projet:<nom>` comme lien vers le projet.
  - 3.7 Les filtres (type, statut, priorité, tag, parent, dates) et le backlog.
  - 3.8 Les projets et sous-projets à l'écran ; les releases par le tag `release:<nom>`.
- **Fait quand** : glisser une carte d'une colonne à l'autre change son statut ; les couloirs se
  font par une clé de tag au choix ; cliquer une carte ouvre son panneau ; le filtre
  `composant:pxe` ne montre que ces éléments ; l'adresse d'un élément l'ouvre directement.

## Étape 4 — Requêtes enregistrées, tableaux de bord

- **Tâches** :
  - 4.1 Vérifier l'hypothèse « lecture seule » : des vues (`v_elements`, `v_tags`…), un vrai
    analyseur SQL qui n'accepte qu'un `SELECT`, et le test des écritures déguisées, toutes refusées.
  - 4.2 La table `requetes` et les outils du connecteur pour tester et enregistrer une requête.
  - 4.3 Les requêtes enregistrées comme filtres dans l'interface.
  - 4.4 Les premiers tableaux de bord, codés.
- **Fait quand** : le test de lecture seule passe ; Claude écrit, teste et enregistre une requête
  depuis une conversation, et Adrien la retrouve comme filtre dans l'outil.

## Étape 5 — L'appli sur le téléphone

- **Tâches** :
  - 5.1 L'appli installable : manifeste, icône, service worker.
  - 5.2 La reprise après expiration de la connexion Access (l'appli se reconnecte au lieu de
    rester vide).
  - 5.3 Le partage sortant d'une tâche (menu de partage d'Android).
  - 5.4 Le partage entrant : depuis WhatsApp ou toute appli, la saisie rapide s'ouvre pré-remplie.
  - 5.5 Les rappels : abonnement Web Push, tâche planifiée (Cron Trigger) qui envoie les rappels,
    mesure du retard sur plusieurs jours.
  - 5.6 Les tâches récurrentes : la règle de récurrence ; cocher crée l'occurrence suivante.
  - 5.7 La décision de fin d'étape : si les rappels arrivent trop en retard, on envisage l'appli
    native.
- **Fait quand** : l'icône est sur l'écran d'accueil ; un message WhatsApp partagé vers
  Crazybrain devient une tâche ; un rappel fixé à cinq minutes arrive téléphone en veille, et son
  retard est mesuré sur plusieurs jours ; cocher une tâche récurrente crée la suivante à la bonne
  date ; après expiration de la session, l'appli se reconnecte au lieu de rester vide.

## Étape 6 — Calendrier et mode journée

- **Tâches** :
  - 6.1 Le calendrier, semaine et mois, par échéance ou jour planifié.
  - 6.2 Le mode journée, le matin : choisir ses tâches du jour dans le backlog.
  - 6.3 Les caser dans des créneaux, et voir le temps prévu face au temps disponible.
- **Fait quand** : les éléments apparaissent à leur échéance ou à leur jour planifié ; le matin,
  Adrien choisit ses tâches du jour dans le backlog, les case dans des créneaux, et voit le temps
  prévu face au temps disponible.

## Étape 7 — Horizons et objectifs

- **Tâches** :
  - 7.1 Décider comment on note un horizon : un champ dédié ou un tag `horizon:2026-11`.
  - 7.2 La vue horizons à la Timestripe : jour, semaine, mois, année et au-delà.
  - 7.3 Le poids des objectifs et la vue Goalscape en cercles.
- **Fait quand** : un objectif se place sur « 2027 », une tâche sur « semaine 45 », et chacun
  apparaît dans son horizon ; la vue Goalscape montre les objectifs en cercles, et changer un poids
  change la taille de la part.

## Étape 8 — Mail → tâche

- **Tâches** :
  - 8.1 Vérifier l'hypothèse : le domaine peut-il recevoir ce courrier sans casser l'existant
    (lire ses serveurs de courrier) ; sinon, un sous-domaine.
  - 8.2 L'adresse dédiée et Email Routing vers le Worker. **Il faut du projet Cloudflare.**
  - 8.3 Le gestionnaire de mail du Worker : sujet en titre, corps en description ; seuls les mails
    d'Adrien qui passent SPF et DKIM sont acceptés.
- **Fait quand** : un mail envoyé par Adrien à l'adresse devient une tâche (sujet en titre, corps
  en description) ; un mail d'une autre adresse est rejeté.

## Plus tard

- Le site en lecture pour l'extérieur, filtré par projet.
- Plusieurs utilisateurs, d'autres qu'Adrien limités à un projet.
- La timeline ; le hors-ligne.
