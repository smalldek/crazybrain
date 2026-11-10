# Fonctionnalités

La liste complète voulue par Adrien (03/11/2026), et pour chacune un statut :

- **première version** : construite dans les étapes 1 à 8 de la [feuille de route](feuille-de-route.md) ;
- **plus tard** : voulue, mais pas maintenant ;
- **abandonné** : on ne la fera pas, avec le motif.

## Accès et partage

| Fonctionnalité | Statut | Étape | Motif, précision |
|---|---|---|---|
| Connexion Google | première version | 1 | Assurée par Cloudflare Access, devant tout l'outil. Au départ, seul Adrien a accès. |
| Gestion des utilisateurs : Adrien en lecture et écriture, d'autres limités à un projet | plus tard | — | Pas dans un premier temps : Adrien est seul utilisateur. |
| Site en lecture pour l'extérieur, avec des droits | plus tard | — | Piste retenue : une vue en lecture seule, filtrée par projet, derrière Access avec les adresses invitées, ou par un lien signé. |
| Partage d'une tâche par lien web | première version | 3 | Chaque élément a son adresse, qui ouvre son panneau de détail. Le lien n'ouvre que pour Adrien (derrière Access) ; le montrer à quelqu'un d'autre passe par le site en lecture, plus tard. |
| Partage d'une tâche via Android | première version | 5 | Bouton « Partager » de l'appli installée (Web Share API) : le menu de partage d'Android s'ouvre. |

## Organisation du travail

| Fonctionnalité | Statut | Étape | Motif, précision |
|---|---|---|---|
| Projets et sous-projets | première version | 1 (données), 3 (écrans) | Un projet est un élément ; un sous-projet a un projet pour parent. |
| Initiatives, objectifs | première version | 1 (données), 3b et 7 (vues) | Ce sont des types d'éléments. La vue en cercles vient à l'étape 3b, les horizons à l'étape 7. |
| Types d'éléments (epic, feature, tâche…) | première version | 1 | Configurables, dans une table. |
| Liens entre éléments | première version | 1 (données), 3 (écrans) | Liens typés, par exemple : bloque, en double de, lié à. |
| Commentaires | première version | 1 (données), 3 (écrans) | |
| Priorité | première version | 1 | |
| Tags clé:valeur (`composant:pxe`, `release:v1`) | première version | 1 (données), 3 (écrans) | Ils remplacent les composants, les labels et beaucoup de champs. Le projet n'est pas un tag : `projet:<nom>` à l'écran est un lien vers l'entité projet (décision 002). |
| Release | première version | 3 | Un tag `release:<nom>` : il groupe des tâches à livrer ensemble. Une étape, pas un sprint. |
| Sprint | **abandonné** | — | Les horizons à la Timestripe le remplacent. |
| Backlog | première version | 3 | Une vue : ce qui n'est ni fait ni planifié, trié par priorité. |
| Tâches récurrentes | première version | 5 | Une règle de récurrence sur l'élément ; cocher la tâche crée l'occurrence suivante. Deux modes : à date fixe, ou après achèvement (la suivante revient un délai après le jour où la tâche est faite). |

## Vues

| Fonctionnalité | Statut | Étape | Motif, précision |
|---|---|---|---|
| Liste | première version | 1 | La première vue, avec la saisie rapide. |
| Kanban avec couloirs (swimlanes) | première version | 3 | Colonnes par statut ; couloirs par parent, par priorité ou par clé de tag. |
| Panneau de détail à droite, façon Jira | première version | 3 | Il sert aussi de formulaire complet. |
| Filtres | première version | 3 | Par type, statut, priorité, tag, parent, dates. |
| Tableaux de bord | première version | 4 | Codés, pas configurables par l'utilisateur : Adrien est seul. |
| Calendrier | **fait** (10/11) | 6 | Les éléments placés par leur échéance ou leur jour planifié, sur la semaine ou le mois. |
| Mode journée à la Sunsama | **fait** (10/11) | 6 | Choisir ses tâches du jour, puis les caser dans des créneaux, face au temps disponible. |
| Horizons à la Timestripe (jour, semaine, mois, année…) | **fait** (10/11) | 7 | Remplacent le sprint. Un champ dédié (décision 007), une colonne par échelle. |
| Découpage d'objectifs en cercles (à la Goalscape) | première version | 3b | Vue circulaire hiérarchique : chaque part pesée dans son parent (les sœurs font 100 %), remplie selon son avancement, qui remonte jusqu'au centre ; zoom animé, plan en liste ; sur le cercle même : tirer le bord d'une part (importance) ou son remplissage (avancement), glisser une part pour la ranger, flèches du clavier ; les tâches rattachées à un projet en sont des parts. Sans le partage ni les responsables. Avancée de l'étape 7 à la demande d'Adrien (08/11). |
| Timeline | plus tard | — | Hors première version : elle exige des dates sur chaque tâche, et Adrien pense ne jamais s'en servir. |

## Saisie

| Fonctionnalité | Statut | Étape | Motif, précision |
|---|---|---|---|
| Saisie rapide dans un champ | première version | 1 | Un champ, Entrée, la tâche existe. |
| Saisie rapide par l'IA | première version | 2 | Adrien dit à Claude ce qu'il veut, dans une conversation ; Claude crée les éléments par le connecteur. |
| Formulaire | première version | 3 | Le panneau de détail. |
| Mail → tâche | **construit, pas encore branché** (10/11) | 8 | Cloudflare Email Routing vers un Email Worker, sur un sous-domaine. Seuls les mails d’Adrien, authentifiés (SPF et DKIM), sont acceptés (décision 008). |
| WhatsApp → tâche | première version | 5 | Par le partage Android vers l'appli installée (Web Share Target), pas par l'API WhatsApp Business. Marche aussi depuis toute appli qui partage. |

## Claude et les requêtes

| Fonctionnalité | Statut | Étape | Motif, précision |
|---|---|---|---|
| Connecteur Claude (MCP) | première version | 2 | Claude lit et écrit les éléments depuis une conversation d'Adrien. |
| Moteur de requêtes et filtres enregistrés | première version | 4 | Claude, par le connecteur, écrit la requête SQL, la teste et l'enregistre ; l'outil la rejoue. Exécution en lecture seule (voir l'architecture). |

Pourquoi Claude écrit la requête depuis une conversation, et pas depuis une page de l'outil : à
notre connaissance, une page web ne peut pas utiliser l'abonnement Claude d'Adrien. L'API est un
compte séparé, payé à l'usage. Le connecteur passe par ses conversations, donc par son abonnement.

## Téléphone

| Fonctionnalité | Statut | Étape | Motif, précision |
|---|---|---|---|
| Appli web installable (PWA) sur Android | première version | 5 | Le client principal. |
| Rappels poussés sur le téléphone | première version | 5 | Cron Trigger Cloudflare + Web Push. Limite : en économie de batterie, Android peut retarder de quelques minutes. |
| Appli native | plus tard, si besoin | — | Seulement si les notifications de la PWA se révèlent peu fiables (mesuré à l'étape 5). |
| Hors-ligne | plus tard | — | Un seul utilisateur : en cas de conflit, la dernière modification gagne. |
