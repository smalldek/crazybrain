# 002 — Langage du code et premières règles du modèle de données

- **Date** : 03/11/2026
- **Décidé par** : Adrien, après discussion avec Claude
- **Statut** : acceptée

## Les questions

Trois questions à trancher avant d'écrire le socle (étape 1d) : dans quel langage écrire le code ;
comment rattacher une tâche à un projet ; faut-il garder l'historique des modifications.

## Les décisions

### 1. TypeScript, écrit comme du .NET

Le Worker (backend) et les pages (frontend) sont écrits en **TypeScript strict**. Adrien connaît .NET
et Java (DDD, OpenTelemetry), pas TypeScript : le code s'écrit dans un style qu'il lira sans peine.

- **Le domaine est séparé de l'infrastructure.** Les règles métier (une tâche, un projet, ce qu'on a
  le droit de faire) ne connaissent ni Cloudflare, ni D1, ni HTTP. Elles vivent dans `src/domaine/`.
  La tuyauterie (base, routes, connecteur) vit à côté et appelle le domaine.
- Entités et objets-valeurs explicites, types partout, pas de `any`.
- Routage HTTP par **Hono**, une petite bibliothèque faite pour les Workers (elle aiguille `/api/...`
  vers la bonne fonction).
- **Pas de cadriciel d'interface pour l'instant** (React, Svelte…) : la première page est une liste et
  un champ de saisie. Le choix se fera à l'étape 3, quand le kanban en aura besoin.
- Noms du code : **le vocabulaire métier en français, sans accents** (`Element`, `echeance`,
  `jourPlanifie`, tables `elements`, `liens`), comme dans la doc ; ce que les bibliothèques imposent
  reste en anglais.

**Options écartées**

- **.NET ou Java sur un Worker** : un Worker exécute du JavaScript ou du WebAssembly dans le moteur de
  Chrome, démarré en quelques millisecondes à chaque requête. Java et .NET embarquent tout leur
  environnement d'exécution : trop lourd et trop lent à démarrer pour ce modèle.
- **.NET sur le cluster Proxmox d'Adrien**, derrière un tunnel Cloudflare : son langage, mais la
  disponibilité et la maintenance (mises à jour, sauvegardes, surveillance) seraient à sa charge,
  et une coupure de courant ou d'internet à la maison couperait l'outil. Rouvrirait la décision 001.
  Reste possible plus tard : c'est pourquoi le domaine est séparé de l'infrastructure.
- **.NET dans un conteneur hébergé** : payant chaque mois, démarrage lent après une pause, une
  plateforme de plus.
- **Python sur Worker** : support encore incertain, briques du connecteur Claude absentes.
- **Rust** : fait pour la programmation système, pas naturel pour un backend métier.

### 2. Toute notion qui a un libellé et une description est une entité

Règle posée par Adrien : dès qu'une notion a un nom et une description (projet, objectif…), c'est
une entité, un élément de la table `elements`.

Une tâche se rattache à un projet par un **lien typé « appartient à »** (table `liens`), qui pointe
l'**identifiant** du projet, jamais son nom. Le nom est une clé « publique » : s'y rattacher
casserait tout au premier renommage. À l'écran, on tape `projet:` puis le nom, avec complétion, et
on voit `projet:<nom>` ; la base garde l'identifiant.

- Une tâche peut appartenir à **plusieurs projets** (plusieurs liens).
- Un sous-projet a son projet pour **parent**.
- Le filtre `projet:cluster` ramène ce qui appartient à cluster ou à l'un de ses sous-projets.
- Les autres relations (« bloque », « lié à », plus tard « vient de ce mail ») passent par la même
  table.

**Options écartées** : le projet comme **parent** seul (une tâche n'aurait qu'un projet) ; le
**tag** `projet:<nom>` stocké en texte (renommer obligerait à réécrire toutes les tâches, et le
projet n'aurait ni description ni objectif).

### 3. Un journal d'événements, écrit avec l'état courant

Chaque modification écrit, dans la même transaction (tout ou rien) :

- **l'état courant** de l'élément (tables `elements`, `liens`…) : c'est ce qu'on lit ;
- **un événement** dans la table `evenements` : quel élément, quel type d'événement, les valeurs
  **avant et après**, qui (Adrien ou Claude), quand, et un numéro de version de la forme de
  l'événement.

On enregistre le **résultat**, pas l'ordre donné : « ajoute *photo* à la fin du titre » dépend de
l'état du moment, alors que « titre : *A* → *A photo* » se rejoue toujours de la même façon
(remarque d'Adrien). La valeur d'avant permet d'annuler, et de voir un conflit si l'on veut sauter
un événement au milieu.

Ce journal est l'audit log : il dit ce que Claude a fait, et permet de revenir en arrière ou de
reconstruire l'état. Tout est gardé tant qu'Adrien ne demande pas de purge (quelques mégaoctets par
an) ; une purge au-delà de N jours s'ajoutera en une requête.

**Options écartées** : l'**event sourcing pur** (l'état n'existe que comme rejeu des événements,
avec des instantanés réguliers, idée d'Adrien) : même capacité d'annuler et de reconstruire, mais
plus de code (instantanés, rejeu à la lecture) sans gain pour un seul utilisateur ; ici, l'état
courant est un instantané tenu à jour en continu. **Pas d'historique** : on ne saurait pas ce que
Claude a changé.
