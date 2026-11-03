# Vision

## Pourquoi

Adrien gère beaucoup de projets en parallèle, perso et techniques. Aucun outil ne lui donne tout
ce qu'il veut au même endroit :

- **Jira** a le bon cœur (projets, types d'éléments, liens, kanban, filtres), mais rien pour
  organiser sa journée ou ses objectifs de vie ;
- **Sunsama** a le bon mode journée : on choisit ses tâches du jour et on les case dans le temps ;
- **Timestripe** a les bons horizons : jour, semaine, mois, année, et au-delà ;
- **Goalscape** a la bonne vue des objectifs : un cercle hiérarchique, chaque part pesée.

Et surtout, aucun ne laisse Claude travailler directement sur ses tâches. La moitié de ce qui fait
la valeur (ces vues, les requêtes écrites par Claude) n'existe nulle part. Elle se construit bien
plus simplement sur ses propres données que par-dessus l'outil d'un autre (voir
[`decisions/001-socle-cloudflare.md`](decisions/001-socle-cloudflare.md)).

## Ce que c'est

- Un **moteur de tâches et de projets** pour une seule personne, Adrien.
- **Tout est un élément** : un projet, un objectif, une epic, une tâche. Ils s'emboîtent par un
  parent et se relient par des liens typés.
- **Des tags clé:valeur** (`composant:pxe`, `release:v1`) à la place des composants, des labels
  et de beaucoup de champs. Simple et souple.
- **Claude est un collaborateur** : dans une conversation d'Adrien, il lit, crée et modifie les
  tâches par un connecteur, et il écrit les requêtes que l'outil rejoue.
- **Une appli web installée sur Android** (PWA) : partage d'une tâche, partage vers l'outil
  depuis WhatsApp ou une autre appli, rappels sur le téléphone.

## Ce que ce n'est pas

- **Pas un outil d'équipe.** Un seul utilisateur au départ ; d'autres personnes limitées à un
  projet viendront peut-être plus tard.
- **Pas configurable par l'utilisateur.** Les tableaux de bord sont codés. Adrien est seul : ce
  qu'il veut changer, on le change dans le code.
- **Pas de sprint.** Les horizons à la Timestripe le remplacent.
- **Pas un dépôt de données.** Les tâches vivent dans la base, jamais dans git.

## Comment on le construit

- Ensemble, Adrien et Claude. Adrien veut apprendre à travailler avec l'IA : chaque changement
  passe par une PR qui explique simplement ce qui est fait et pourquoi.
- **Le moteur d'abord, l'interface au fur et à mesure.** Adrien : « le backend n'est pas un souci,
  le plus dur est l'UI, elle sera faite au fur et à mesure ».
- Par étapes courtes, chacune avec un livrable qu'on peut vérifier
  ([`feuille-de-route.md`](feuille-de-route.md)).
- Ce qui repose sur une hypothèse non vérifiée commence par la vérifier
  ([`architecture.md`](architecture.md), « Hypothèses à vérifier »).

## Question ouverte

À terme, les tâches qu'Adrien écrit aujourd'hui dans les projets de son vault (identifiants
`<projet>-<n>`) pourraient vivre dans Crazybrain. Rien n'est décidé ; ce n'est pas une étape de la
feuille de route.
