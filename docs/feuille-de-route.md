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
| 3. Kanban, détail, tags, filtres | Le premier vrai écran de travail | Construite le 05/11 |
| 3b. Objectifs en cercles | Le découpage pondéré en cercles, avancement qui remonte (avancé depuis l'étape 7 le 08/11) | Construite le 08/11 ; le cercle comme outil principal (3b.8 à 3b.12) le 09/11 ; essai d'Adrien quand il voudra |
| 4. Requêtes enregistrées, tableaux de bord | Claude écrit des requêtes, l'outil les rejoue | — |
| 5. L'appli sur le téléphone | Icône, partage, rappels, tâches récurrentes | — |
| 6. Calendrier et mode journée | Planifier sa journée à la Sunsama | — |
| 7. Horizons | Timestripe | — |
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
    et on en pose un en choisissant sa sorte et l'élément (05/11). La date « modifié le » qui ne
    bougeait pas pour un commentaire ou un lien (remarque de 2.6) : réglé en 3.9.
  - 3.4 ✓ Le kanban (`/kanban`) : colonnes par statut, glisser une carte change son statut, la
    glisser dans sa colonne change son ordre (`rang`, posé de 1000 en 1000). À la souris, au doigt
    après un appui long (un glissement court fait défiler), au clavier. Toucher une carte ouvre son
    détail (`/kanban/e/<id>`). Glisser-déposer par la bibliothèque dnd-kit (05/11).
  - 3.5 ✓ Les couloirs : par parent, par priorité, ou par une clé de tag au choix (une liste au-dessus
    du kanban, retenue dans l'adresse : `/kanban?couloirs=tag:composant`). Chaque couloir a ses trois
    colonnes ; une carte change de colonne, pas de couloir (changer de couloir se fait dans le
    détail). Un élément qui porte plusieurs valeurs de la clé va dans le couloir de la première
    (05/11).
  - 3.6 ✓ Les tags clé:valeur à l'écran, avec complétion ; `projet:<nom>` comme lien vers le projet.
    Dans le détail : chaque tag avec sa croix, un champ qui propose les tags déjà utilisés (les plus
    fréquents d'abord) et les projets ; taper `projet:<nom>` range l'élément dans ce projet, montré
    en tête des tags comme un lien. Les cartes du kanban montrent projet et tags. API :
    `GET /api/tags` rend tous les tags posés (05/11).
  - 3.7 ✓ Les filtres et le backlog. Au-dessus de chaque vue, une recherche (sans tenir compte des
    majuscules ni des accents) et un bouton « Filtres (n) » qui ouvre les critères : type, statut,
    priorité (ou sans), « Dans » un élément (tout ce qu'il contient, sous-projets compris),
    échéance (en retard, d'ici 7 jours, sans) et tag (`composant` pour toutes ses valeurs,
    `composant:pxe` pour une seule). Tout est dans l'adresse (`/kanban?tag=composant:pxe`) et reste
    quand on change de vue. Le backlog (`/backlog`) : ce qui n'est ni fait ni planifié, par
    priorité, puis échéance, puis du plus ancien (05/11). Reste : sur un kanban filtré, réordonner
    une carte renumérote les cartes visibles seulement ; à revoir si l'ordre des cartes cachées
    en souffre à l'usage.
  - 3.8 ✓ Les projets et sous-projets à l'écran ; les releases par le tag `release:<nom>`. Un onglet
    Projets (`/projets`) : l'arbre des projets, les sous-projets en retrait, chacun avec son
    avancement (éléments faits sur le total, à toute profondeur, sans compter les sous-projets) ;
    toucher un projet ouvre son détail, « Voir » montre son contenu dans la liste (filtre
    « Dans ») ; un champ y crée un projet. Dessous, les releases : une par valeur du tag
    `release`, les ouvertes d'abord, avec leur avancement ; toucher une release ouvre le kanban
    filtré sur son tag (05/11).
  - 3.9 ✓ La date « modifié le » et le tri « modifié récemment » (10/11). Poser ou retirer un
    commentaire, un tag ou un lien avance « modifié le » de l'élément (des deux éléments pour un
    lien), dans la même transaction que la donnée et son événement ; elle ne recule jamais. Choix
    pris sans attendre Adrien (règle du 10/11 : on avance sur la recommandation, on change après) :
    un commentaire compte comme une modification, parce que « sur quoi ai-je travaillé ? » doit le
    voir. Dans les filtres, « Ordre (liste et backlog) » : « Habituel » ou « Modifié récemment »,
    gardé dans l'adresse (`?tri=modifie`), sans compter comme un filtre. Le connecteur :
    `chercher_elements` prend `tri: "modifie"`.
- **Fait quand** : glisser une carte d'une colonne à l'autre change son statut ; les couloirs se
  font par une clé de tag au choix ; cliquer une carte ouvre son panneau ; le filtre
  `composant:pxe` ne montre que ces éléments ; l'adresse d'un élément l'ouvre directement.
  ✓ Tenu le 05/11 : chaque critère a son scénario joué dans le navigateur (`features/kanban.feature`,
  `detail.feature`, `filtres.feature`, `projets.feature`). Reste à l'usage d'Adrien sur la vraie base.

## Étape 3b — Les objectifs en cercles

Demandée par Adrien le 08/11 (« Fais comme Goalscape. Gestion des cercles etc. Fais toutes les
fonctionnalités sauf le partage ») : la vue en cercles prévue en 7.3 passe ici, avant l'étape 4. On
reprend la **mécanique** d'un découpage d'objectifs en cercles, dans le style de Crazybrain, sans le
nom, l'aspect ni les visuels de l'outil qui l'a inspirée.

**Le principe.** Un élément au centre ; autour, un anneau par niveau de sous-éléments. Chaque part a
un **poids** dans son parent : les parts sœurs font toujours 100 % de leur parent, et l'angle d'une
part est sa part de l'angle de son parent. Chaque part se **remplit** du centre vers l'extérieur
selon son **avancement** ; l'avancement d'un parent se calcule à partir de ses enfants, pondéré par
leurs poids, et remonte ainsi jusqu'au centre. On **zoome** en touchant une part (elle devient le
centre) et on remonte en touchant le centre.

**Ce qui est laissé de côté** : tout le partage (inviter, droits, commentaires à plusieurs) et les
responsables (une personne par part), qui n'ont de sens qu'à plusieurs.

**Les règles, une fois pour toutes** (dans le domaine, `src/domaine/`, testées seules) :

- **Poids** : un nombre plus grand que zéro, facultatif ; sans poids, une part compte pour 1. La
  part d'un élément = son poids divisé par la somme des poids de ses frères (non supprimés). On
  garde des poids bruts, pas des pourcentages : changer la part d'un élément ne réécrit que lui
  (pour qu'il pèse `p %`, son poids devient `p / (100 − p) ×` la somme des poids de ses frères), et
  les frères gardent leurs proportions entre eux.
- **Avancement** : un entier de 0 à 100, facultatif. Une **feuille** (sans enfant) vaut 100 si elle
  est « fait », sinon son avancement saisi, sinon 0. Un élément **avec enfants** vaut la somme des
  avancements de ses enfants pondérés par leurs parts, et 100 s'il est lui-même « fait ». Son
  avancement saisi est alors ignoré (il revient s'il perd ses enfants).
- **Ce qui est dans les cercles** : les sous-éléments par `parent`, à toute profondeur, sans les
  supprimés. Au centre de la vue d'ensemble, « Tout » : les éléments sans parent qui ne sont pas
  des tâches seules (projets, objectifs…, ou tout élément qui a des enfants). Une tâche seule, sans
  parent, n'y apparaît pas. Le lien « appartient_a » ne compte pas : une part a un seul parent.

**Tâches** :

| Tâche | Ce qu'elle livre | Il faut d'Adrien |
|---|---|---|
| 3b.1 | Le poids et l'avancement : en base, dans l'API, le connecteur et le panneau de détail ; les calculs (parts, avancement qui remonte) dans le domaine | **Fait le 08/11** |
| 3b.2 | La vue Cercles : centre, anneaux, couleurs par branche, remplissage, zoom, fil d'Ariane | **Fait le 08/11** |
| 3b.3 | Travailler dans les cercles : la fiche de la part, son importance et son avancement au curseur, ajouter, renommer, supprimer | **Fait le 08/11** |
| 3b.4 | Le plan : la même arborescence en liste, à replier, à réordonner et réorganiser en glissant | **Fait le 08/11** |
| 3b.5 | Les repères : les filtres éclairent les parts qui correspondent, les retards se voient, l'image s'enregistre | **Fait le 08/11** |
| 3b.6 | L'essai d'Adrien sur son téléphone | Le test, gestes donnés à la fin |
| 3b.7 | Ce que le site de Goalscape montre en plus : égaliser, importance absolue, couleur choisie, indicateur de notes, coller une liste indentée, export CSV, plan grisé par les filtres, estomper pendant un réglage | **Fait le 08/11** |
| 3b.8 | Les tâches rattachées à un projet (lien « appartient à ») sont des parts de ce projet | **Fait le 09/11** |
| 3b.9 | Le zoom et la remontée animés : la part grandit jusqu'au tour entier, on voit d'où l'on vient | **Fait le 09/11** |
| 3b.10 | Des libellés lisibles : le long de l'arc, ou dans le sens du rayon pour une part fine ; le survol | **Fait le 09/11** |
| 3b.11 | Les gestes directs sur le cercle : tirer le bord d'une part règle son importance, tirer son remplissage règle son avancement | **Fait le 09/11** |
| 3b.12 | Glisser une part sur le cercle pour la ranger dans une autre ou la réordonner ; les flèches du clavier | **Fait le 09/11** |

### 3b.1 Poids et avancement

- **Base** : migration `0006`, deux colonnes sur `elements` : `poids` (nombre, plus de 0, au plus
  1 000 000) et `avancement` (entier de 0 à 100), toutes deux facultatives.
- **Domaine** : objets-valeurs `Poids` et `Avancement` (refusent zéro, un négatif, 101…) ; les deux
  champs se modifient comme les autres (`modifierElement`, avec événement avant/après). Un module
  `cercles.ts` : `parts(freres)` rend la part de chacun (somme 100 %), `avancementCalcule(arbre)`
  l'avancement de chaque élément, `poidsPourPart(p, freres)` le poids à écrire pour qu'un élément
  pèse `p %`.
- **API et connecteur** : `poids` et `avancement` dans `POST` et `PATCH /api/elements`, et dans
  `creer_elements` et `modifier_element` ; les consignes du connecteur expliquent les deux règles.
- **Panneau de détail** : deux champs, « Poids » et « Avancement (%) » ; pour un élément qui a des
  enfants, l'avancement affiché est le calculé, avec la mention « calculé ».
- **Vérifié par** : tests unitaires des calculs (trois sœurs sans poids font 33,3 % chacune ; un
  poids 2 contre deux poids 1 fait 50 % ; l'avancement d'un parent à deux enfants de poids 3 et 1,
  faits à 100 % et 0 %, vaut 75 % ; un parent « fait » vaut 100 ; un arbre à trois niveaux remonte ;
  `poidsPourPart(50, …)` rend bien 50 %) ; scénarios d'API (poser, vider, refuser 0 et 101, l'événement).

### 3b.2 La vue Cercles

- **Adresse** : un onglet « Cercles », `/cercles` ; `?centre=<id>` dit l'élément au centre (sans lui,
  « Tout ») et `?anneaux=<n>` le nombre d'anneaux montrés (3 par défaut, de 1 à 6). Retour arrière
  du téléphone = revenir au centre d'avant. Le détail d'un élément s'ouvre par `/cercles/e/<id>`,
  comme dans les autres vues.
- **Dessin** : un SVG (un dessin vectoriel que le navigateur trace, net à toute taille) calculé par
  un module sans React (`ui/cercles.ts`, testé seul) : pour chaque part, son anneau, son angle de
  départ et d'arrivée. Chaque branche du premier anneau a sa couleur, ses descendants des teintes
  de la même couleur ; la part est claire, et sa portion « faite » (de son bord intérieur vers
  l'extérieur, au prorata de l'avancement) est foncée. Le titre s'écrit dans la part quand il y
  tient, sinon il apparaît en la touchant. Au centre : le titre et l'avancement du centre.
  Un élément « fait » a sa part pleine ; une part trop fine pour être touchée reste dessinée.
- **Navigation** : toucher une part la choisit (contour, et sa fiche en dessous) ; la toucher une
  deuxième fois, ou « Zoomer », la met au centre ; toucher le centre remonte d'un niveau ; le fil
  d'Ariane au-dessus (Tout › Maison › Travaux) ramène à n'importe quel niveau. Au clavier : Tab
  passe de part en part, Entrée zoome, Échap remonte.
- **Vérifié par** : tests unitaires des angles (les parts sœurs couvrent exactement l'angle du
  parent, dans l'ordre du rang) ; scénarios dans le navigateur à la taille d'un téléphone : trois
  objectifs de poids 2, 1, 1 donnent des parts de 180°, 90°, 90° ; zoomer, remonter, le fil
  d'Ariane, et l'adresse qui rouvre le même centre.

### 3b.3 Travailler dans les cercles

- **La fiche de la part choisie**, sous les cercles : titre, type, part dans son parent (%),
  avancement (et s'il est calculé), échéance ; boutons Zoomer, Détail (le panneau complet).
- **L'importance** au curseur, de 1 à 99 % : pendant qu'on glisse, la part et ses sœurs se
  redessinent (les sœurs se partagent le reste en gardant leurs proportions) ; au lâcher, un seul
  envoi (le poids de la part). Pour une part seule, pas de curseur : elle fait 100 %.
- **L'avancement** au curseur, de 0 à 100, pour une feuille ; la part se remplit et les parents se
  recalculent sous le doigt. Une case « Fait » à côté.
- **Ajouter** : « + Sous-élément » (dans la part choisie) et « + À côté » (dans le même parent),
  avec un titre ; le type proposé est celui d'un frère, sinon « objectif » sous « Tout » et « tâche »
  ailleurs. **Renommer** dans la fiche. **Supprimer** archive, avec « Annuler », comme ailleurs.
- **Vérifié par** : scénarios dans le navigateur : régler une part à 50 % et voir ses deux sœurs à
  25 % ; poser 40 % d'avancement sur une feuille et voir son parent changer ; ajouter un
  sous-élément, recharger, le retrouver.

### 3b.4 Le plan

- Sous les cercles (à côté sur un grand écran), la même arborescence en liste : chaque ligne en
  retrait selon son niveau, avec sa part (%) et une barre d'avancement ; un triangle replie ou
  déplie une branche. Toucher une ligne choisit la part dans les cercles, et l'inverse.
- **Glisser une ligne** (dnd-kit, déjà utilisé par le kanban : à la souris, au doigt après un appui
  long, au clavier) : entre deux sœurs, elle change d'ordre (`rang`) ; sur une autre ligne, elle se
  range dedans (`parent`). Une boucle (ranger un élément dans son propre descendant) est refusée.
  Les cercles suivent : l'ordre des parts est celui du plan.
- **Vérifié par** : scénarios dans le navigateur : replier une branche, réordonner deux sœurs,
  ranger une tâche dans un autre objectif, et le retrouver après rechargement.

### 3b.5 Les repères

- La barre de filtres (texte, type, statut, priorité, tag, échéance) vaut aussi pour les cercles :
  au lieu de cacher, elle **éclaire** les parts qui correspondent et grise les autres, pour garder
  la forme de l'ensemble.
- Une part en retard (échéance passée, pas faite) porte un liseré rouge ; la fiche dit l'échéance.
- « Enregistrer l'image » : le dessin en fichier SVG, à garder ou imprimer.
- **Vérifié par** : scénarios dans le navigateur : le filtre `tag=composant:pxe` éclaire une part et
  en grise deux ; une échéance passée se voit ; le fichier enregistré est un SVG qui contient les
  titres.

### 3b.7 Les compléments, d'après le site de Goalscape

Le 08/11, les pages publiques de Goalscape (présentation, tutoriels, articles de blog qui les
transcrivent) ont été lues depuis le PC d'Adrien, le cloud ne pouvant pas les ouvrir. Comparées à
3b.1 à 3b.5, il manquait :

- **Égaliser** : un bouton de la fiche remet tous les sous-éléments de la part à poids égal (leurs
  poids sont vidés).
- **Importance absolue** : la fiche dit aussi ce que pèse la part dans le centre (le produit des
  parts, du centre jusqu'à elle), et non plus seulement dans son parent.
- **Couleur choisie** : un choix « Couleur » dans la fiche (automatique, ou l'une des huit teintes),
  rangé comme un tag `couleur:<teinte>` ; les sous-éléments en héritent sauf s'ils ont la leur.
- **Indicateur de notes** : une part qui a une description porte un petit point.
- **Coller une liste** : dans la fiche, un champ où l'on colle une liste indentée (espaces,
  tabulations, puces `-` ou `*`, numéros `1.`) ; chaque ligne devient un sous-élément, la profondeur
  suit l'indentation. Une ligne `**Titre** suite` donne le titre en gras et la suite en description.
- **Export CSV** : le tableau de la branche au centre (tous niveaux) : niveau, titre, type, statut,
  part dans le parent, part du centre, avancement, échéance, tags. Il s'ouvre dans un tableur.
- **Le plan suit les filtres** : ses lignes qui n'y répondent pas sont grisées, comme les parts.
- **Estomper pendant un réglage** : pendant qu'on glisse le curseur d'importance, tout s'estompe sauf
  la part et ses sœurs ; pendant l'avancement, sauf ses sœurs et ses ancêtres.

**Écarté ou remis, avec le motif** :

- *Pièces jointes* : il faut un stockage de fichiers (R2), donc une décision et peut-être du projet
  Cloudflare ; à proposer à Adrien comme tâche à part.
- *Gantt, date de début, dépendances* : la timeline est « plus tard » depuis le 03/11 (Adrien pense
  ne jamais s'en servir) ; le lien « bloque » existe déjà.
- *Rapport Word, modèles, onglets de notes, thèmes de couleur par code* : de la présentation, pas de
  la gestion ; la description Markdown et l'export CSV couvrent le besoin pour l'instant.
- *Étiquettes Now et Next* : ce sont des tags (`now`, `next`), déjà filtrables.
- *Coach IA, connecteur MCP* : Claude le fait déjà, par le connecteur de l'étape 2.
- *Partage, commentaires prévenus par mail, intégration, Teams* : le partage, exclu par Adrien.

**Vérifié par** : tests unitaires (lire une liste collée, le CSV, l'importance absolue, la couleur
héritée) et scénarios dans le navigateur (égaliser, couleur, coller une liste, exporter, plan grisé).

### 3b.8 à 3b.12 Le cercle comme outil principal

Le 09/11, Adrien : « tu as implémenté les fonctionnalités de goalscape mais pas trop la manière
d'afficher. Je parle des interactions. […] j'ai l'impression que l'affichage du cercle et les
interactions sont simplistes. » La fiche sous le cercle reste ; ce qui suit fait du cercle lui-même
l'endroit où l'on travaille, comme dans Goalscape, où l'on règle l'importance en tirant le bord d'un
segment et où l'on réorganise en glissant les segments. Et il n'attend plus d'essai pour avancer :
on enchaîne, il essaiera plus tard.

- **3b.8 Les tâches d'un projet.** Une tâche rattachée à un projet par le lien « appartient à » (ce
  que fait le connecteur quand on lui donne « projets ») et qui n'est rangée nulle part devient une
  part de ce projet, comme si elle y était rangée. Rattachée à plusieurs projets : sous le premier.
  L'écran lit tous ces liens d'un coup (`GET /api/appartenances`). Avant : l'anneau d'un projet
  restait vide tant qu'on n'y avait pas rangé ses tâches à la main.
- **3b.9 Le mouvement.** Zoomer sur une part l'agrandit jusqu'au tour entier en un tiers de seconde,
  ses sœurs s'effacent, ses sous-éléments sortent du bord ; remonter fait l'inverse. Sans animation
  si le téléphone demande de réduire les mouvements.
- **3b.10 Les libellés.** Le titre suit l'arc de la part (tourné pour se lire à l'endroit en bas du
  cercle), sur deux lignes s'il le faut ; une part étroite mais épaisse l'écrit dans le sens du rayon.
  Au survol de la souris, la part s'éclaire et une bulle donne titre, part et avancement.
- **3b.11 Les gestes directs.** La part choisie porte deux poignées : sur son bord de fin, on la
  tire autour du cercle pour régler son importance (ses sœurs gardent leurs proportions, comme avec
  le curseur) ; sur son remplissage (pour une part sans sous-éléments), on le tire vers l'extérieur
  ou l'intérieur pour régler l'avancement, par pas de 5 %. Rien ne part avant le lâcher.
- **3b.12 Glisser sur le cercle.** On attrape une part (à la souris, ou au doigt après un appui long)
  et on la lâche : au milieu d'une autre part, elle s'y range ; près du bord d'une sœur, elle se place
  avant ou après elle ; sur le centre, elle se range dans le centre. Une boucle est refusée. Au
  clavier : flèches gauche et droite d'une sœur à l'autre, haut vers le parent, bas vers le premier
  sous-élément.
- **Vérifié par** : tests unitaires (le rattachement par lien, l'interpolation des angles, l'angle et
  le rayon lus sous le doigt, où tombe une part lâchée) ; scénarios dans le navigateur (une tâche
  rattachée à un projet y apparaît ; tirer le bord d'une part la met à 50 % ; tirer le remplissage
  la met à 60 % ; glisser une part dans une autre ; les flèches).
- **Construit le 09/11.** Un ajustement vu en regardant le rendu à la taille d'un téléphone : les
  anneaux se partagent toute la place disponible (une branche à un seul niveau remplit le cercle au
  lieu d'y faire un petit anneau). Non vérifié par un test : le glisser au doigt sur le cercle (appui
  long) ; les scénarios le jouent à la souris.

### 3b.6 L'essai d'Adrien

Comme pour l'étape 3 : ce qu'aucun test ne dit, c'est si la vue sert. Les gestes pas à pas sont
donnés à Adrien quand 3b.1 à 3b.5 sont en ligne.

**Construit le 08/11** (3b.1 à 3b.5), tel que détaillé ci-dessus, vérifié par 153 tests unitaires
(dont `cercles.test.ts` et `interface-plan.test.ts`) et 7 scénarios joués dans le navigateur à la
taille d'un téléphone (`features/cercles.feature`), avec les 82 scénarios d'avant toujours verts.
Écarts au détail : le plan se glisse par sa poignée ⠿ (toucher le titre choisit la part) ; sur un
grand écran, la fiche et le plan passent à droite des cercles ; les filtres éclairent les parts,
pas encore les lignes du plan.

**Fait quand (étape 3b)** : sur le téléphone, la vue Cercles montre les objectifs autour de « Tout »
avec des parts à leur poids ; régler une part à 50 % redessine ses sœurs, et la somme reste 100 % ;
cocher une tâche remplit sa part et fait monter l'avancement de chaque parent jusqu'au centre ;
toucher une part zoome, toucher le centre remonte ; le plan réorganise l'arbre en glissant ; tout
survit au rechargement. Chaque point a son scénario joué dans le navigateur.

## Étape 4 — Requêtes enregistrées, tableaux de bord

- **Tâches** :
  - 4.1 ✓ Vérifier l'hypothèse « lecture seule » (10/11, [décision 005](decisions/005-requetes-en-lecture-seule.md)).
    Six vues (`v_elements`, `v_tags`, `v_liens`, `v_commentaires`, `v_evenements`, `v_types`) ; une
    garde à deux couches : un découpage du texte comme SQLite le fait, qui n'accepte qu'une lecture
    sur les vues, puis la requête exécutée en sous-requête, où SQLite lui-même refuse toute écriture.
    `PRAGMA query_only` est refusé par D1. 35 écritures déguisées, toutes refusées, la base inchangée.
    L'API : `POST /api/requetes/essai` avec `{"sql": "SELECT …"}` rend colonnes et lignes (500 au plus).
  - 4.2 ✓ La table `requetes` et les outils du connecteur (10/11) : `tester_requete` (rend les
    lignes sans rien garder), `enregistrer_requete` (l'essaie d'abord : une requête refusée ou
    fautive ne s'enregistre pas ; un nom déjà pris est remplacé), `lister_requetes`,
    `executer_requete`, `supprimer_requete`. La description des outils donne à Claude les vues et
    leurs colonnes. Chaque enregistrement, remplacement ou suppression s'écrit au journal
    (`requete_enregistree`, `requete_modifiee`, `requete_supprimee`). Convention : une requête qui
    rend une colonne `id` peut servir de filtre (4.3). API : `GET /api/requetes`,
    `GET /api/requetes/<id>/lignes`, `DELETE /api/requetes/<id>`.
  - 4.3 ✓ Les requêtes enregistrées comme filtres dans l'interface (10/11). Dans « Filtres », un
    choix « Requête de Claude » (visible dès qu'une requête est enregistrée) : la vue ne garde que
    les éléments dont la requête rend l'`id`, dans toutes les vues, gardé dans l'adresse
    (`?requete=<id>`). Une requête sans colonne `id` le dit au lieu de filtrer ; au-delà de 500
    lignes, l'écran prévient que seules les 500 premières comptent.
  - 4.4 ✓ Les premiers tableaux de bord, codés (10/11). Un onglet Tableau (`/tableau`) : cinq
    chiffres (à faire, en cours, en retard, faites et créées en 7 jours, sans compter les projets),
    les tâches faites semaine par semaine sur huit semaines (barres, le nombre au-dessus, une bulle
    au survol), les cinq prochaines échéances, puis chaque requête enregistrée par Claude : en
    tableau, ou, si elle rend des `id`, leur nombre et « Voir dans la liste » (la liste filtrée).
- **Fait quand** : le test de lecture seule passe ; Claude écrit, teste et enregistre une requête
  depuis une conversation, et Adrien la retrouve comme filtre dans l'outil.

## Étape 5 — L'appli sur le téléphone

- **Tâches** :
  - 5.1 ✓ L'appli installable : manifeste, icône, service worker (10/11). Le manifeste
    (`ui/public/manifest.webmanifest`) : nom, plein écran sans barre du navigateur, couleurs, icônes
    192 et 512 pixels (et une « masquable », qu'Android découpe en rond), raccourcis Kanban, Backlog,
    Tableau. Il se charge avec le cookie d'Access (`crossorigin="use-credentials"`), sinon Access le
    refuse. Le service worker (`ui/public/sw.js`) reste prudent : les données (`/api`, le connecteur,
    Access) ne passent jamais par lui ; les fichiers de `/assets/` sont gardés ; une page vient du
    réseau d'abord, et sans réseau de la dernière gardée ; une réponse redirigée (connexion expirée)
    n'est jamais gardée. Les icônes PNG se refont depuis les SVG par `node outils/icones.mjs`.
    Vérifié : Chromium ne trouve aucun obstacle à l'installation (`Page.getInstallabilityErrors`).
  - 5.2 ✓ La reprise après expiration de la connexion Access (10/11). Un appel à l'API qui ne
    rend pas de données (redirection bloquée, page de connexion, 401 ou 403) lève `ErreurConnexion`
    (`ui/connexion.ts`) ; l'appli recharge alors la page, et Access reconnecte puis revient. Un
    second échec dans la minute ne recharge plus (pas de boucle) : un bandeau « La connexion a
    expiré » propose « Se reconnecter ». L'appli relit aussi tout quand elle revient au premier plan,
    ce qui montre les changements faits ailleurs (par Claude) et détecte l'expiration tout de suite.
  - 5.3 ✓ Le partage sortant d'une tâche (10/11). Un bouton « Partager » dans le détail ouvre le
    menu de partage d'Android (`navigator.share`) avec le titre, l'échéance, la description et
    l'adresse de la tâche ; sans ce menu (ordinateur), le texte est copié. Vérifié par un scénario
    où un faux menu de partage note ce qu'il reçoit (`features/partage.feature`).
  - 5.4 ✓ Le partage entrant (10/11). Le manifeste déclare l'appli comme cible de partage
    (`share_target`, en GET vers `/partage`) : Crazybrain apparaît dans le menu de partage une fois
    installée. La première ligne du texte partagé devient le titre dans la saisie, le reste et le
    lien la description (`ui/partage.ts`, testé seul) ; Entrée crée la tâche. Choix fait sans
    attendre : on n'ouvre pas le formulaire complet, la saisie rapide suffit, le détail se complète
    après. Reste à essayer par Adrien depuis WhatsApp sur le téléphone (aucun test ne remplace le
    vrai menu d'Android).
  - 5.5 ✓ Les rappels (10/11). Le détail a un champ « Rappel sur le téléphone » ; Claude le règle
    aussi (`rappel`, heure de Paris). Chaque minute, une tâche planifiée du Worker (Cron Trigger)
    envoie les rappels dont l'heure est passée, une seule fois, et seulement sur une tâche ni faite ni
    supprimée. Changer l'heure reprogramme le rappel.
    Le message est chiffré pour le téléphone et signé par le Worker : Web Push est écrit sans
    bibliothèque ([décision 006](decisions/006-web-push-sans-bibliotheque.md)). Les clés sont tirées
    par le déploiement et rangées en secrets du Worker.
    Dans l'onglet Tableau, « Activer les rappels » abonne le téléphone, et un bouton envoie un rappel
    d'essai. Chaque envoi est noté avec l'heure prévue, l'heure de départ et l'heure de réception
    (le téléphone la signale), d'où un bilan : retard médian et pire retard.
    Vérifié de bout en bout contre un faux service de notification, qui déchiffre comme le
    téléphone (`features/rappels.feature`).
    Reste la mesure réelle sur plusieurs jours, téléphone en veille : elle se fait à l'usage et
    nourrit la décision 5.7.
  - 5.6 ✓ Les tâches récurrentes (10/11). Une tâche porte une règle écrite en français, rangée sous
    une forme unique. Deux modes :
    - à date fixe : « chaque lundi », « le 1er du mois », « tous les 2 mois » ;
    - après achèvement : « 3 mois après fait » (Adrien, 07/11/2026 : l'entretien des chaussures de
      randonnée).

    Une règle incomprise est refusée, avec des exemples. Cocher la tâche crée la suivante : même
    titre, mêmes projets, mêmes tags, même priorité, même description, et un rappel à la même heure.
    - À date fixe, la suivante prend la prochaine date de la règle, sur le même champ que la tâche
      cochée (l'échéance, ou le jour prévu). Cochée en retard, elle prend la première date à venir.
    - Après achèvement, la suivante est prévue ce délai après le jour où on coche, sans échéance.

    La tâche cochée perd sa règle, qui passe à la suivante. Le journal le dit, et décocher puis
    recocher ne crée pas de doublon.

    Elle se règle dans le détail (« Se répète », avec des propositions) et par Claude (`recurrence`).

    Choix fait sans attendre : la tâche « se réveille » par son jour prévu, et non par un champ
    « caché jusqu'au » à part. La liste la montre avec ce jour. Le backlog, qui ne garde que les
    tâches sans jour prévu, ne la montre pas. La vue journée (étape 6) la sortira le jour venu.

    Les tâches posées avant avec les tags `recurrence:apres-fait` et `intervalle:<délai>` passent à
    la vraie règle par le connecteur, sur la vraie base, après le déploiement.
    Vérifié par `tests/unitaires/recurrence.test.ts` (lecture des règles, dates, fins de mois) et
    `features/recurrences.feature` (API et page).
  - 5.7 La décision de fin d'étape : si les rappels arrivent trop en retard, on envisage l'appli
    native.
- **Fait quand** : l'icône est sur l'écran d'accueil ; un message WhatsApp partagé vers
  Crazybrain devient une tâche ; un rappel fixé à cinq minutes arrive téléphone en veille, et son
  retard est mesuré sur plusieurs jours ; cocher une tâche récurrente crée la suivante à la bonne
  date, à date fixe comme après achèvement ; après expiration de la session, l'appli se reconnecte au lieu de rester vide.

## Étape 6 — Calendrier et mode journée

- **Tâches** :
  - 6.1 ✓ Le calendrier, semaine et mois, par échéance ou jour planifié (10/11). Un onglet
    Calendrier : la semaine en liste de jours (lisible au téléphone), le mois en grille de sept
    colonnes, trois titres par case puis « +n ». Une tâche paraît à son échéance (en rouge) et au
    jour prévu (avec son heure), une seule fois si c'est le même jour. ‹ et › changent de période,
    « Aujourd'hui » y revient, le numéro d'un jour du mois ouvre sa semaine ; la période et le jour
    vivent dans l'adresse. Les filtres s'appliquent. Vérifié : `tests/unitaires/interface-calendrier.test.ts`,
    `features/calendrier.feature` (navigateur à la taille d'un téléphone).
  - 6.2 Le mode journée, le matin : choisir ses tâches du jour dans le backlog.
  - 6.3 Les caser dans des créneaux, et voir le temps prévu face au temps disponible.
- **Fait quand** : les éléments apparaissent à leur échéance ou à leur jour planifié ; le matin,
  Adrien choisit ses tâches du jour dans le backlog, les case dans des créneaux, et voit le temps
  prévu face au temps disponible.

## Étape 7 — Horizons

- **Tâches** :
  - 7.1 Décider comment on note un horizon : un champ dédié ou un tag `horizon:2026-11`.
  - 7.2 La vue horizons à la Timestripe : jour, semaine, mois, année et au-delà.
  - ~~7.3 Le poids des objectifs et la vue en cercles~~ : avancée en étape 3b le 08/11.
- **Fait quand** : un objectif se place sur « 2027 », une tâche sur « semaine 45 », et chacun
  apparaît dans son horizon.

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
