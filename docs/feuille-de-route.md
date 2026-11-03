# Feuille de route

Des étapes courtes. Chacune livre quelque chose qu'on peut essayer, et dit à quoi on reconnaît
qu'elle est faite. L'interface se construit au fil des étapes : chacune ajoute l'écran dont elle a
besoin, simple, amélioré ensuite à l'usage.

L'état d'avancement (étape en cours, ce qui est fait) est tenu dans le vault d'Adrien,
`informatique/crazybrain.md`. Ce fichier dit ce que contient chaque étape.

## Étape 0 — Cadrage

- **Livre** : la vision, la liste des fonctionnalités, l'architecture, cette feuille de route, la
  décision sur le socle ; le projet dans le vault.
- **Fait quand** : la PR de cadrage est fusionnée. **Fait le 03/11/2026.**

## Étape 1 — Socle

**1a. D'abord, vérifier qu'un connecteur MCP passe derrière Access.** C'est l'hypothèse dont
dépend le plus de choses ([architecture](architecture.md), « Hypothèses à vérifier »).

- **Livre** : un Worker minimal sur le sous-domaine choisi, derrière Access, qui sert un serveur
  MCP avec un seul outil, `bonjour`.
- **Fait quand** : dans une conversation d'Adrien, Claude appelle `bonjour` par le connecteur et
  reçoit la réponse ; et un appel sans authentification est refusé. Sinon, on essaie le repli
  (OAuth fait par le Worker) avant d'aller plus loin.

**1b. Ensuite, le socle lui-même.**

- **Livre** : la décision `002` (langage, cadriciel) ; le schéma de la base (migrations) ;
  l'API (créer, lire, modifier, lister des éléments) ; une page liste avec un champ de saisie
  rapide ; le déploiement automatique par GitHub Actions, qui vérifie d'abord qu'Access protège
  le sous-domaine.
- **Fait quand** : depuis le téléphone, Adrien ouvre l'adresse, se connecte avec Google, tape une
  tâche, la voit dans la liste, recharge la page et la voit encore. Sans connexion, l'adresse
  refuse. Une fusion dans `main` déploie sans geste à la main.
- **Il faudra d'Adrien** : le choix du sous-domaine, et un jeton Cloudflare dans les secrets du
  dépôt (Claude ne peut pas le créer).

## Étape 2 — Connecteur Claude

- **Livre** : les outils du connecteur : chercher, lire, créer, modifier, commenter, lier, tagger.
  C'est aussi la saisie rapide par l'IA.
- **Fait quand** : dans une conversation, « crée trois tâches pour le projet X » les fait
  apparaître dans la liste ; « qu'est-ce qui est en retard ? » donne la bonne réponse.

## Étape 3 — Kanban, détail, tags, filtres

- **Livre** : le kanban à couloirs ; le panneau de détail à droite (formulaire complet,
  commentaires, liens) ; les tags clé:valeur ; les filtres ; le backlog ; une adresse par élément ;
  les releases par le tag `release:<nom>`.
- **Fait quand** : glisser une carte d'une colonne à l'autre change son statut ; les couloirs se
  font par une clé de tag au choix ; cliquer une carte ouvre son panneau ; le filtre
  `composant:pxe` ne montre que ces éléments ; l'adresse d'un élément l'ouvre directement.

## Étape 4 — Requêtes enregistrées, tableaux de bord

- **Livre** : l'exécution des requêtes en lecture seule et son test ; les outils du connecteur
  pour tester et enregistrer une requête ; les filtres enregistrés dans l'interface ; les
  premiers tableaux de bord, codés.
- **Fait quand** : le test de lecture seule passe (toutes les écritures refusées) ; Claude écrit,
  teste et enregistre une requête depuis une conversation, et Adrien la retrouve comme filtre dans
  l'outil.

## Étape 5 — L'appli sur le téléphone

- **Livre** : l'appli installable (manifeste, service worker) ; le partage sortant d'une tâche ;
  le partage entrant (depuis WhatsApp ou toute appli) ; les rappels par Web Push ; les tâches
  récurrentes ; la reprise après expiration de la connexion Access.
- **Fait quand** : l'icône est sur l'écran d'accueil ; un message WhatsApp partagé vers
  Crazybrain devient une tâche ; un rappel fixé à cinq minutes arrive téléphone en veille, et son
  retard est mesuré sur plusieurs jours ; cocher une tâche récurrente crée la suivante à la bonne
  date ; après expiration de la session, l'appli se reconnecte au lieu de rester vide.
- **Décision à la fin** : si les rappels arrivent trop en retard, on envisage l'appli native.

## Étape 6 — Calendrier et mode journée

- **Livre** : le calendrier (semaine, mois) ; le mode journée à la Sunsama.
- **Fait quand** : les éléments apparaissent à leur échéance ou à leur jour planifié ; le matin,
  Adrien choisit ses tâches du jour dans le backlog, les case dans des créneaux, et voit le temps
  prévu face au temps disponible.

## Étape 7 — Horizons et objectifs

- **Livre** : les horizons à la Timestripe (jour, semaine, mois, année et au-delà) ; la vue
  Goalscape des objectifs.
- **Fait quand** : un objectif se place sur « 2027 », une tâche sur « semaine 45 », et chacun
  apparaît dans son horizon ; la vue Goalscape montre les objectifs en cercles, et changer un poids
  change la taille de la part.

## Étape 8 — Mail → tâche

- **Livre** : l'adresse dédiée, la réception par Email Routing, la création de la tâche, le
  filtre sur l'expéditeur.
- **Fait quand** : un mail envoyé par Adrien à l'adresse devient une tâche (sujet en titre, corps
  en description) ; un mail d'une autre adresse est rejeté.

## Plus tard

- Le site en lecture pour l'extérieur, filtré par projet.
- Plusieurs utilisateurs, d'autres qu'Adrien limités à un projet.
- Le hors-ligne.
- La timeline.
- L'appli native, seulement si l'étape 5 montre que les rappels de la PWA ne suffisent pas.
