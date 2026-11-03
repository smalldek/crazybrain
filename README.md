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

Cadrage fait le 03/11/2026. Rien n'est encore construit. La prochaine étape est le socle
(étape 1), en commençant par vérifier qu'un connecteur Claude passe derrière Cloudflare Access.

## Documents

| Fichier | Ce qu'il dit |
|---|---|
| [`docs/vision.md`](docs/vision.md) | Pourquoi cet outil, ce qu'il est et ce qu'il n'est pas |
| [`docs/fonctionnalites.md`](docs/fonctionnalites.md) | Toutes les fonctionnalités voulues, et pour chacune : première version, plus tard ou abandonnée |
| [`docs/architecture.md`](docs/architecture.md) | Le socle, le client, le connecteur, le modèle de données, les hypothèses à vérifier |
| [`docs/feuille-de-route.md`](docs/feuille-de-route.md) | Les étapes, avec ce que chacune livre et comment on vérifie qu'elle est faite |
| [`docs/decisions/`](docs/decisions/) | Les décisions, une par fichier, avec les options écartées |
| [`CLAUDE.md`](CLAUDE.md) | Les règles de travail de Claude dans ce dépôt |
