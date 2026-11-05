# Architecture

Le choix du socle et les options écartées sont dans
[`decisions/001-socle-cloudflare.md`](decisions/001-socle-cloudflare.md). Ce fichier dit comment
les pièces s'assemblent.

## Vue d'ensemble

```
Téléphone (appli installée) ─┐
Navigateur ──────────────────┴─> Cloudflare Access (Google) ─> Worker crazybrain ─> base D1
Claude (conversation claude.ai) ── connecteur MCP, OAuth ────> Worker, adresse /mcp
Mail vers l'adresse dédiée ──> Email Routing ─────────────────> Worker, gestionnaire « email »
Cron Trigger (chaque minute) ─> Worker ─> Web Push ──────────> téléphone
```

Un seul Worker porte tout : les pages, l'API, le connecteur, la réception des mails et les rappels.

## Socle

- **Un Worker Cloudflare**, séparé de celui du site du vault, sur
  `crazybrain.dekermadec.net`.
- **Une base D1** dédiée (D1 est du SQLite hébergé par Cloudflare).
- **Cloudflare Access** devant tout le sous-domaine : connexion Google, Adrien seul autorisé.
  Le Worker vérifie en plus le jeton qu'Access lui transmet (en-tête `Cf-Access-Jwt-Assertion`) :
  si Access était mal réglé, le Worker refuserait quand même. Le site du vault fait déjà ainsi.
  Fait sur toute route `/api/*` (`src/acces/jeton-access.ts`) : signature RS256 avec les clés de
  l'équipe (`TEAM_DOMAIN`), audience = `AUD` (lue au déploiement), expiration ; sinon 403.
- **Déploiement par GitHub Actions** à chaque fusion dans `main`. Avant de déployer, l'Action
  vérifie qu'Access protège bien le sous-domaine, comme pour le site du vault. Le jeton Cloudflare
  et les identifiants sont dans les secrets GitHub du dépôt.
- **Langage et cadriciel** : TypeScript strict, domaine séparé de l'infrastructure, routage par
  Hono ; pas de cadriciel d'interface avant l'étape 3 ([décision 002](decisions/002-langage-et-modele.md)).

## Client

- **Une appli web installable (PWA)** : un manifeste et un service worker. Chrome sur Android
  propose de l'installer ; elle s'ouvre alors comme une appli, avec son icône.
- **Partage sortant** : le bouton « Partager » d'une tâche appelle la Web Share API ; Android ouvre
  son menu de partage avec le lien de la tâche.
- **Partage entrant** : le manifeste déclare l'appli comme cible de partage (Web Share Target).
  Dans WhatsApp ou une autre appli, « Partager » propose Crazybrain. Le texte arrive au Worker, qui
  ouvre la saisie rapide pré-remplie ; un appui enregistre la tâche.
- **Notifications** : le téléphone s'abonne à Web Push (clés VAPID, la clé privée est un secret du
  Worker). Chaque minute, un Cron Trigger cherche les rappels échus et les envoie.
- **Hors-ligne** : plus tard. Un seul utilisateur, donc en cas de conflit la dernière modification
  gagne.
- **Appli native** : seulement si les notifications de la PWA se révèlent peu fiables.

## Connecteur Claude (MCP)

MCP est le protocole par lequel Claude utilise des outils extérieurs. Le Worker sert un serveur MCP
distant à l'adresse `/mcp`. Adrien l'ajoute une fois comme connecteur dans claude.ai ; ensuite,
dans ses conversations, Claude peut chercher, lire, créer et modifier les éléments.

Le point délicat : **c'est un serveur d'Anthropic qui appelle `/mcp`, pas le navigateur
d'Adrien.** Ce serveur n'a pas le cookie de connexion Access. Il doit s'authentifier autrement :
par OAuth, comme le prévoit la spécification MCP. claude.ai envoie Adrien une fois sur une page
de connexion, puis garde un jeton et le présente à chaque appel.

**Fait à l'étape 1c** ([décision 003](decisions/003-connecteur-claude.md)) :

- **Le Worker est le serveur OAuth** (`@cloudflare/workers-oauth-provider`) : découverte
  (`/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`),
  enregistrement dynamique du client (`/register`), échange du code contre un jeton avec PKCE
  (`/token`). Sans jeton, `/mcp` répond 401 et l'en-tête `WWW-Authenticate` indique la découverte.
  Clients, autorisations et jetons (hachés) sont dans l'espace KV `crazybrain-oauth`.
- **`/authorize` reste derrière Access** : le Worker revérifie le jeton Access, puis montre la page
  de consentement (le client, et où part le jeton). Adrien clique « Autoriser » une fois.
- **Le serveur MCP** (`src/connecteur/serveur-mcp.ts`, `@modelcontextprotocol/sdk`) est sans
  session ; un outil, `bonjour`, qui répond « Bonjour depuis Crazybrain ! » et le nombre de tâches.
- **Ouverture limitée** : Access laisse passer `/mcp`, `/token`, `/register` et les deux adresses
  de découverte (application « crazybrain-connecteur », en bypass) ; le garde-fou du déploiement
  refuse toute autre ouverture. Le pare-feu de la zone a une exception sur ces mêmes
  chemins. Access et cette exception sont décrits et posés par le dépôt privé `smalldek/cluster`
  (dossier `cloudflare/`, OpenTofu) depuis le 05/11 ; ce dépôt les vérifie seulement.
- **Un jeton du connecteur n'ouvre pas `/api/*`**, qui exige toujours le jeton Access.

Outils prévus : chercher, lire, créer, modifier, commenter, lier, tagger (étape 2) ; tester une
requête, enregistrer une requête (étape 4).

## Modèle de données

Tout est un **élément**. Un projet, une initiative, un objectif, une epic, une feature, une tâche :
même table, un type différent.

| Table | Ce qu'elle garde |
|---|---|
| `types` | Les types d'éléments (projet, initiative, objectif, epic, feature, tâche…) et les statuts permis pour chacun. Configurable. |
| `elements` | Les éléments (champs ci-dessous). |
| `liens` | Les liens typés entre deux éléments : élément source, élément cible, type de lien. |
| `commentaires` | Les commentaires d'un élément : texte, date, auteur (Adrien ou Claude). |
| `tags` | Les tags clé:valeur : élément, clé, valeur. Une étiquette simple est une clé sans valeur. |
| `evenements` | Le journal : élément, type d'événement, valeurs avant et après, auteur, date, version de forme. |
| `requetes` | Les requêtes enregistrées : nom, SQL, description, date du dernier test. |
| `abonnements_push`, `rappels` | Techniques : les téléphones abonnés aux notifications, les rappels à envoyer. |

Champs d'un élément :

| Champ | Rôle |
|---|---|
| `id` | Identifiant. |
| `type` | Projet, tâche, etc. |
| `parent` | L'élément qui le contient : la tâche dans sa feature, le sous-projet dans son projet. |
| `titre`, `description` | La description est en Markdown. |
| `statut`, `priorite` | Le statut fait les colonnes du kanban. |
| `echeance` | La date limite. |
| `jour_planifie` | Le jour où Adrien prévoit de le faire ; une heure facultative pour le mode journée. |
| `recurrence` | La règle de récurrence. Proposition : le format RRULE d'iCalendar (« chaque lundi », « le 1er du mois »). |
| `estimation` | Le temps prévu. |
| `poids` | Le poids d'un objectif parmi ses frères, pour la vue Goalscape. |
| `rang` | L'ordre choisi à la main dans une colonne ou une liste. |
| `cree_le`, `modifie_le`, `fait_le` | Les dates de vie de l'élément. |

**Déjà en base** (migrations `0001` à `0004`, étape 1) : `types` ; `elements` avec tous les champs
ci-dessus sauf `recurrence` (étape 5) et `poids` (étape 7) — `statut` vaut `a_faire`, `en_cours` ou
`fait`, `priorite` `basse`, `normale`, `haute` ou `urgente`, l'heure planifiée est `heure_planifiee` ;
`liens`, `tags` (une étiquette simple a une valeur vide), `commentaires` ; `evenements` avec `id`,
`element_id`, `type`, `version_forme`, `avant` et `apres` (JSON), `auteur`, `date`. Le journal n'a
pas de clé étrangère vers `elements` : il doit survivre à la suppression d'un élément. Les sortes
d'événements : `element_cree`, `element_modifie`, `lien_ajoute`, `lien_retire`, `tag_ajoute`,
`tag_retire`, `commentaire_ajoute`.

`poids`, `rang` et l'heure du jour planifié s'ajoutent au modèle proposé par Adrien : la vue
Goalscape, le glisser-déposer et le mode journée en ont besoin. Les **horizons** à la Timestripe
(cet élément est pour « novembre », pour « 2027 ») se conçoivent à l'étape 7 : un champ dédié ou
un tag `horizon:2026-11`.

Tranché le 03/11 ([décision 002](decisions/002-langage-et-modele.md)) :

- **Toute notion qui a un libellé et une description est une entité** (projet, objectif…). Une tâche
  se rattache à un ou plusieurs projets par un lien « appartient à » qui pointe l'identifiant du
  projet ; à l'écran, `projet:<nom>` avec complétion. Un sous-projet a son projet pour parent.
- **Un journal d'événements** (table `evenements`), écrit dans la même transaction que l'état :
  valeurs avant et après, auteur, date, version de la forme de l'événement. C'est l'audit log.

## Requêtes enregistrées, en lecture seule

Claude écrit la requête SQL par le connecteur, la teste, puis l'enregistre ; l'outil la rejoue
comme un filtre ou dans un tableau de bord. Une requête ne doit jamais modifier ni effacer quoi
que ce soit.

D1 n'a pas d'utilisateur en lecture seule : on ne peut pas donner aux requêtes un accès qui ne
sait que lire. La garde est donc à construire. Pistes, à évaluer et à combiner à l'étape 4 :

- n'accepter **qu'une seule instruction**, `SELECT` ou `WITH … SELECT`, vérifiée par un vrai
  analyseur SQL, pas par une recherche de mots ;
- refuser `PRAGMA`, `ATTACH` et toute instruction qui n'est pas une lecture ;
- activer `PRAGMA query_only` de SQLite, si D1 l'accepte (non vérifié) ;
- ne laisser lire que des **vues** (`v_elements`, `v_tags`…), pas les tables : en plus, le schéma
  interne peut alors changer sans casser les requêtes enregistrées ;
- limiter la durée et le nombre de lignes.

La garde se prouve par un test : une série de requêtes d'écriture, y compris déguisées, toutes
refusées.

## Mail → tâche

- **Cloudflare Email Routing** fait suivre les mails d'une adresse dédiée au gestionnaire `email`
  du Worker, qui crée la tâche : le sujet devient le titre, le corps la description.
- Seuls les mails venant des adresses d'Adrien, et qui passent les contrôles SPF et DKIM, créent
  une tâche ; les autres sont rejetés. Sans ce filtre, n'importe qui pourrait créer des tâches.
  Les adresses autorisées sont réglées dans Cloudflare, pas écrites dans ce dépôt.

## Hypothèses à vérifier

Ce qu'on suppose vrai sans l'avoir vérifié. Chacune se vérifie avant de construire ce qui en
dépend.

| Hypothèse | Pourquoi elle compte | Comment on vérifie | Quand | Si elle est fausse |
|---|---|---|---|---|
| Un connecteur MCP marche avec les connecteurs claude.ai : Worker serveur OAuth, `/authorize` derrière Access, ouverture limitée aux adresses du connecteur ([décision 003](decisions/003-connecteur-claude.md)). **Vérifié le 05/11** : depuis une session du projet d'Adrien, Claude appelle `bonjour` par le connecteur et reçoit la réponse. | Le connecteur porte les étapes 2 et 4. | Les tests d'acceptation (`features/connecteur.feature`) jouent tout le parcours OAuth contre le Worker local. Reste le vrai test : Adrien ajoute le connecteur dans claude.ai, Claude appelle `bonjour` et reçoit la réponse. | Étape 1c, avant le socle. | Replis : Access en fournisseur OIDC, ou OAuth avec Google directement. Si rien ne marche, on revoit le socle. |
| Une requête SQL peut s'exécuter en lecture seule sur D1. | Une requête écrite par Claude ne doit rien modifier. | La série de requêtes d'écriture du test, toutes refusées. | Étape 4. | Repli : exécuter les requêtes sur une copie de la base, refaite régulièrement. |
| L'appli installée survit à l'expiration de la connexion Access. | Quand la session Access expire, les appels de l'appli reçoivent la page de connexion au lieu des données : l'appli peut sembler vide ou bloquée. | Une durée de session courte en test ; on observe ce que fait l'appli. Elle doit détecter l'expiration et rouvrir la connexion. | Visible dès l'étape 1, traitée à l'étape 5. | Session Access longue, plus la détection et la reconnexion dans l'appli. |
| Web Push est assez fiable sur Android. | Les rappels. | Des rappels de test sur plusieurs jours, téléphone en veille ; on mesure le retard. | Étape 5. | Appli native, plus tard. |
| Email Routing peut recevoir le courrier de l'adresse choisie. (Ajoutée au cadrage.) | Mail → tâche. Si le domaine reçoit déjà son courrier ailleurs, Email Routing ne peut pas prendre sa place sans casser ce courrier. | Lire les serveurs de courrier (MX) du domaine ; essayer sur un sous-domaine si besoin. | Étape 8. | Une adresse sur un sous-domaine, ou un autre domaine. |
