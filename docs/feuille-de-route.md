# Feuille de route

Des étapes courtes. Chacune livre quelque chose qu'on peut essayer, et dit à quoi on reconnaît
qu'elle est faite. L'interface se construit au fil des étapes : chacune ajoute l'écran dont elle a
besoin, simple, amélioré ensuite à l'usage.

Chaque étape est découpée en **tâches**, numérotées `<étape>.<n>`. Une tâche tient dans une PR (ou
deux) et se vérifie seule. Seules les tâches de l'étape en cours sont détaillées ; celles des
étapes suivantes sont en grosse maille et se détaillent au moment de commencer l'étape.

L'état d'avancement (étape en cours, ce qui est fait) est tenu dans le vault d'Adrien,
`informatique/crazybrain.md`. Ce fichier dit ce que contient chaque étape.

**Qui fait quoi.** Claude construit (code, tests, doc, PR). Adrien teste sur son téléphone ou dans
claude.ai quand une tâche le demande. La configuration du compte Cloudflare (Access, pare-feu,
DNS, Email Routing) vit en code dans un autre dépôt, géré par le projet « Cloudflare » : quand une
tâche en a besoin, elle le dit (« Il faut du projet Cloudflare »), et Adrien fait la demande là-bas.

## Vue d'ensemble

| Étape | Ce qu'elle apporte | État |
|---|---|---|
| 0. Cadrage | Vision, fonctionnalités, architecture, cette feuille de route | Fait le 03/11 |
| 1. Socle | Le site, la connexion Google, la base, l'API, le connecteur testé, modifier une tâche, le modèle complet | **En cours** |
| 2. Connecteur Claude | Claude lit, crée et modifie les tâches depuis une conversation | — |
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
  depuis le 05/11. **Reste le vrai test, tâche 1.1.**
- **1d. Le squelette** (03/11, vérifié par Adrien sur son téléphone) : décision 002, base D1
  (`elements`, `evenements`), API créer et lister, page liste avec saisie rapide, tests
  unitaires et d'acceptation lancés avant chaque déploiement.

### Reste à faire

| Tâche | Ce qu'elle livre | Il faut d'Adrien |
|---|---|---|
| 1.1 | Le connecteur testé pour de vrai dans claude.ai | Ajouter le connecteur, faire le test |
| 1.2 | Modifier une tâche : la cocher, la renommer, lui donner une échéance | Le test sur le téléphone |
| 1.3 | Le modèle de données complet en base : types, parent, projets, liens, tags, commentaires | Rien |
| 1.4 | Le déploiement ne pose plus rien dans Cloudflare, il vérifie seulement | Accord du projet Cloudflare |
| 1.5 | Supprimer (archiver) une tâche | Rien |

**Fait quand (étape 1)** : le connecteur répond dans une conversation d'Adrien ; depuis le
téléphone, Adrien crée, coche, renomme et date une tâche, et tout survit au rechargement ; la base
a toutes les tables dont l'étape 2 a besoin.

### 1.1 Vérifier le connecteur dans claude.ai

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

**Il faut d'Adrien** : le test sur le téléphone. Rien du projet Cloudflare (la migration est
appliquée par le déploiement, qui a déjà le droit sur la base).

**Fait quand** : depuis le téléphone, Adrien coche une tâche, en renomme une autre, donne une
échéance à une troisième, recharge la page, et retrouve tout.

### 1.3 Le modèle de données complet (grosse maille)

Une migration `0003` ajoute ce que l'étape 2 doit pouvoir lire et écrire : la table `types`
(projet, objectif, epic, tâche… avec leurs statuts), et sur l'élément `type`, `parent`,
`description`, `priorite`, `jour_planifie`, `estimation`, `rang` ; les tables `liens` (dont
« appartient à » pour rattacher une tâche à un ou plusieurs projets), `tags` et `commentaires`.
Le domaine et l'API suivent. La page ne change presque pas : les écrans viennent à l'étape 3.
`recurrence` et `poids` attendent les étapes 5 et 7. Le [modèle de données](architecture.md)
détaille chaque champ.

### 1.4 Le déploiement vérifie, il ne pose plus (grosse maille)

Depuis le 05/11, les portes Access et l'exception au pare-feu de Crazybrain sont décrites en code
dans le dépôt du projet Cloudflare. Les scripts du déploiement de Crazybrain qui les posent
(`outils/poser_access.py`, `poser_ouverture_connecteur.py`, `poser_pare_feu.py`) font doublon :
deux mains sur le même réglage finissent par se contredire. **Fait le 05/11** : les trois scripts sont
retirés, le déploiement ne fait plus que vérifier ; le garde-fou (refuser une mise en ligne sans
Access) reste. Vérifié avant : tout ce qu'ils posaient (l'application Access « crazybrain »,
« crazybrain-connecteur » et ses cinq chemins, l'exception au pare-feu) est dans le code du projet
Cloudflare.

### 1.5 Supprimer une tâche (grosse maille)

Une tâche se supprime depuis la liste. Elle est archivée plutôt qu'effacée (un statut ou un
champ `archive_le`) ; le journal garde son histoire dans tous les cas.

## Étape 2 — Connecteur Claude

- **Livre** : les outils du connecteur, qui remplacent `bonjour`. C'est aussi la saisie rapide
  par l'IA.
- **Tâches** :
  - 2.1 Lire : chercher des éléments (par texte, statut, type, projet, tag, échéance) et lire un
    élément avec ses commentaires et ses liens.
  - 2.2 Créer : un ou plusieurs éléments d'un coup, avec projet, parent, tags et échéance.
  - 2.3 Modifier : titre, statut, échéance, priorité, parent ; Claude est l'auteur dans le journal.
  - 2.4 Commenter, lier, tagger.
  - 2.5 Des descriptions d'outils et des réponses écrites pour Claude (ce que fait l'outil, quand
    l'utiliser), et les tests d'acceptation de chaque outil.
  - 2.6 Le test réel avec Adrien.
- **Fait quand** : dans une conversation, « crée trois tâches pour le projet X » les fait
  apparaître dans la liste ; « qu'est-ce qui est en retard ? » donne la bonne réponse.

## Étape 3 — Kanban, détail, tags, filtres

- **Livre** : le premier vrai écran de travail.
- **Tâches** :
  - 3.1 Choisir l'outil d'interface (décision 004) : la page grandit, du code fait à la main ne
    suffira plus.
  - 3.2 Une adresse par élément, qui ouvre son panneau de détail à droite (le formulaire complet).
  - 3.3 Commentaires et liens dans le panneau.
  - 3.4 Le kanban : colonnes par statut, glisser une carte change son statut, l'ordre à la main
    (`rang`).
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
