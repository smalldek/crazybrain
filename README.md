# Crazybrain

Un moteur personnel de gestion de tâches et de projets, construit par Adrien avec Claude.

Il réunit en un seul outil ce qu'Adrien aime ailleurs : le cœur de Jira (projets, types
d'éléments, kanban, filtres), la journée à la Sunsama, les horizons de temps à la Timestripe,
le découpage d'objectifs à la Goalscape. Claude y lit et y écrit les tâches par un connecteur.

Il tourne sur Cloudflare (un Worker, une base D1, protégé par Cloudflare Access avec connexion
Google). On s'en sert depuis le téléphone Android, comme une appli web installée (PWA).

## Ce que ce dépôt contient

Le **moteur** : le code, la spec, l'architecture, la feuille de route. **Pas les tâches** : elles
vivent dans la base, jamais dans git. Ce dépôt est public : il ne contient ni donnée ni secret.

## État

Cadrage fait le 03/11/2026. Étape 1 en cours : le squelette du socle (base, API, page, tests) est
en place ([feuille de route](docs/feuille-de-route.md)).

## Lancer les tests

Il faut Node.js 22. Une fois après chaque récupération du dépôt : `npm ci` (installe les
dépendances figées dans `package-lock.json`, comme un `dotnet restore`).

| Commande | Ce qu'elle fait |
|---|---|
| `npm run verifier-types` | Compile en mode strict, sans rien produire (le Worker et les tests) |
| `npm test` | Tests unitaires du domaine et de la serrure Access (Vitest, `tests/unitaires/`) |
| `npm run test:acceptation` | Scénarios Gherkin en français (`features/`), joués par Cucumber.js contre le vrai Worker lancé en local avec une base D1 locale neuve |
| `npm run test:tout` | Les trois, dans l'ordre |

L'Action GitHub `Tests` lance les trois à chaque PR ; le déploiement ne part que s'ils passent.
Pour essayer l'API à la main en local : `npx wrangler d1 migrations apply crazybrain --local`, puis
`npx wrangler dev` (sans jeton Access, l'API répond 403 : c'est voulu).

## Où est quoi dans le code

| Dossier | Contenu |
|---|---|
| `src/domaine/` | Les règles métier, sans Cloudflare ni HTTP (`Titre`, `Element`, `creerElement`) |
| `src/acces/` | La vérification du jeton Cloudflare Access |
| `src/infra/` | Le dépôt D1 (le seul code qui écrit du SQL) |
| `src/index.ts` | Les routes de l'API (Hono) |
| `migrations/` | Le schéma de la base, migration par migration |
| `public/` | La page |
| `tests/unitaires/`, `features/` | Les tests unitaires, les scénarios d'acceptation |

## Documents

| Fichier | Ce qu'il dit |
|---|---|
| [`docs/vision.md`](docs/vision.md) | Pourquoi cet outil, ce qu'il est et ce qu'il n'est pas |
| [`docs/fonctionnalites.md`](docs/fonctionnalites.md) | Toutes les fonctionnalités voulues, et pour chacune : première version, plus tard ou abandonnée |
| [`docs/architecture.md`](docs/architecture.md) | Le socle, le client, le connecteur, le modèle de données, les hypothèses à vérifier |
| [`docs/feuille-de-route.md`](docs/feuille-de-route.md) | Les étapes, avec ce que chacune livre et comment on vérifie qu'elle est faite |
| [`docs/decisions/`](docs/decisions/) | Les décisions, une par fichier, avec les options écartées |
| [`CLAUDE.md`](CLAUDE.md) | Les règles de travail de Claude dans ce dépôt |
