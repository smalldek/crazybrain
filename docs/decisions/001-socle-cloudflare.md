# 001 — Socle : un outil fait maison sur Cloudflare

- **Date** : 03/11/2026
- **Décidé par** : Adrien, après discussion avec Claude
- **Statut** : acceptée

## La question

Sur quoi construire le gestionnaire de tâches et de projets d'Adrien : un outil existant, un outil
open source modifié, ou un outil fait maison ?

## La décision

Un outil **fait maison sur Cloudflare** : un Worker, une base D1, protégé par Cloudflare Access
avec connexion Google. Le client est une appli web installable (PWA), sur Android d'abord. Claude
lit et écrit les tâches par un connecteur MCP servi par le Worker.

## Pourquoi

Le motif principal : **la moitié de la liste qui fait la valeur n'existe nulle part.** La journée
à la Sunsama, les horizons à la Timestripe, le découpage d'objectifs à la Goalscape, les requêtes
écrites par Claude : aucun outil ne les a. Les construire sur ses propres données est bien plus
simple que par-dessus l'outil d'un autre, à travers son API.

Le reste (projets, types, kanban, filtres) est connu et pas très difficile. Adrien : « le backend
n'est pas un souci, le plus dur est l'UI, elle sera faite au fur et à mesure ».

Cloudflare, parce qu'Adrien s'en sert déjà pour le site de son vault, avec la même recette
(Worker, D1, Access, déploiement par GitHub Actions). Rien à héberger, rien à exposer depuis la
maison.

## Les options écartées

| Option | Pourquoi elle est écartée |
|---|---|
| **Jira, avec une couche par-dessus** pour les vues qui manquent | Dépendance à une société, et une couche fragile posée sur une API qui change. Les vues propres d'Adrien seraient toujours à construire. |
| **Vikunja** (open source) | Trop simple pour ce qu'Adrien veut. |
| **Plane** (open source) | Il couvre le cœur de Jira, mais il est lourd. Il faudrait l'héberger sur le cluster Proxmox, qui n'expose rien sur Internet. Et les vues propres d'Adrien passeraient quand même par son API. |
| **Un fork d'un outil open source** | Chaque nouvelle version de l'outil d'origine coûte un réalignement du fork. |

## Ce que ça coûte

- **Tout est à construire**, l'interface surtout. D'où une feuille de route par petites étapes,
  l'interface faite au fur et à mesure.
- **Une dépendance à Cloudflare demeure.** Elle est moindre qu'avec Jira : les données sont du
  SQLite standard, exportables, et le code est à Adrien.
- **Plusieurs points ne sont pas encore vérifiés** : le connecteur derrière Access, la lecture
  seule sur D1, l'expiration de la connexion dans l'appli, les notifications sur Android. Ils sont
  listés dans [`../architecture.md`](../architecture.md) et se vérifient avant de construire ce qui
  en dépend. Le premier, le connecteur, se vérifie au tout début de l'étape 1 : s'il échoue sans
  repli, cette décision se rouvre.
