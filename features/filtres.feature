# language: fr
@navigateur
Fonctionnalité: Les filtres et le backlog
  Des filtres (texte, type, statut, priorité, tag, contenant, échéance) au-dessus de chaque vue. Ils
  vivent dans l'adresse : une vue filtrée se recharge et se partage, et reste filtrée quand on passe
  de la liste au kanban. Le backlog montre ce qui n'est ni fait ni planifié, le plus important en haut.

  Scénario: Le filtre composant:pxe ne montre que ces éléments, dans toutes les vues
    Étant donné que la tâche "Filtres : flasher le PXE" existe avec le tag "composant:pxe"
    Et que la tâche "Filtres : régler le DNS" existe avec le tag "composant:dns"
    Et que j'ouvre la page
    Quand je filtre sur le tag "composant:pxe"
    Alors la page montre la tâche "Filtres : flasher le PXE"
    Et la page ne montre pas la tâche "Filtres : régler le DNS"
    Et le bouton des filtres dit "Filtres (1)"
    Quand je recharge la page
    Alors la page montre la tâche "Filtres : flasher le PXE"
    Et la page ne montre pas la tâche "Filtres : régler le DNS"
    Quand j'ouvre le kanban
    Alors la carte "Filtres : flasher le PXE" est dans la colonne "À faire"
    Et le kanban ne montre pas la carte "Filtres : régler le DNS"
    Quand j'efface les filtres
    Alors la carte "Filtres : régler le DNS" est dans la colonne "À faire"

  Scénario: La clé seule prend toutes ses valeurs
    Étant donné que la tâche "Filtres : câbler le switch" existe avec le tag "materiel:switch"
    Et que la tâche "Filtres : câbler le routeur" existe avec le tag "materiel:routeur"
    Et que j'ouvre la page
    Quand je filtre sur le tag "materiel"
    Alors la page montre la tâche "Filtres : câbler le switch"
    Et la page montre la tâche "Filtres : câbler le routeur"
    Et la page ne montre pas la tâche "Filtres : flasher le PXE"

  Scénario: Chercher un mot, sans tenir compte des accents
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Filtres : nourrir Zébulon" et j'appuie sur Entrée
    Et que je tape la tâche "Filtres : nourrir le chat" et j'appuie sur Entrée
    Quand je cherche "zebulon"
    Alors la page montre la tâche "Filtres : nourrir Zébulon"
    Et la page ne montre pas la tâche "Filtres : nourrir le chat"
    Quand je recharge la page
    Alors la page montre la tâche "Filtres : nourrir Zébulon"
    Et la page ne montre pas la tâche "Filtres : nourrir le chat"

  Scénario: Filtrer sur un projet montre tout ce qu'il contient, sous-projets compris
    Étant donné que le projet "Filtres : déménager" existe
    Et que le projet "Filtres : déménager" contient le projet "Filtres : cartons"
    Et que le projet "Filtres : cartons" contient la tâche "Filtres : acheter du scotch"
    Et que le projet "Filtres : déménager" contient la tâche "Filtres : réserver le camion"
    Et que j'ouvre la page
    Quand je filtre « Dans » "Filtres : déménager"
    Alors la page montre la tâche "Filtres : acheter du scotch"
    Et la page montre la tâche "Filtres : réserver le camion"
    Et la page montre la tâche "Filtres : cartons"
    Et la page ne montre pas la tâche "Filtres : déménager"
    Et la page ne montre pas la tâche "Filtres : flasher le PXE"

  Scénario: Le backlog montre ce qui reste à planifier, le plus important en haut
    Étant donné que la tâche "Backlog : basse" existe avec la priorité "basse"
    Et que la tâche "Backlog : urgente" existe avec la priorité "urgente"
    Et que la tâche "Backlog : déjà planifiée" existe, planifiée le "2026-12-01"
    Et que la tâche "Backlog : déjà faite" existe, déjà faite
    Et que j'ouvre la page
    Quand j'ouvre le backlog
    Alors l'adresse de la page est "/backlog"
    Et la tâche "Backlog : basse" est après la tâche "Backlog : urgente"
    Et la page ne montre pas la tâche "Backlog : déjà planifiée"
    Et la page ne montre pas la tâche "Backlog : déjà faite"
    Quand je recharge la page
    Alors la tâche "Backlog : basse" est après la tâche "Backlog : urgente"

  Scénario: Les filtres s'appliquent aussi au backlog
    Étant donné que la tâche "Backlog : haute" existe avec la priorité "haute"
    Et que j'ouvre la page
    Et que j'ouvre le backlog
    Quand je filtre la priorité "Urgente"
    Alors la page montre la tâche "Backlog : urgente"
    Et la page ne montre pas la tâche "Backlog : haute"
    Quand je reviens à la liste
    Alors la page montre la tâche "Backlog : urgente"
    Et la page ne montre pas la tâche "Backlog : haute"

  Scénario: Trier par « modifié récemment » : un commentaire fait remonter la tâche (tâche 3.9)
    Étant donné que la tâche "Tri : commentée" existe avec la priorité "basse"
    Et que la tâche "Tri : créée après" existe avec la priorité "basse"
    Et que la tâche "Tri : commentée" est commentée
    Et que j'ouvre la page
    Alors la tâche "Tri : commentée" est après la tâche "Tri : créée après"
    Quand je trie par "Modifié récemment"
    Alors la tâche "Tri : créée après" est après la tâche "Tri : commentée"
    Et le bouton des filtres dit "Filtres"
    Quand je recharge la page
    Alors la tâche "Tri : créée après" est après la tâche "Tri : commentée"

  Scénario: Une requête enregistrée par Claude sert de filtre, dans toutes les vues (tâche 4.3)
    Étant donné que la tâche "Requête : à rappeler" existe avec la priorité "basse"
    Et que la tâche "Requête : à oublier" existe avec la priorité "basse"
    Et que Claude a enregistré la requête "Mes rappels" qui fait "SELECT id FROM v_elements WHERE titre LIKE '%rappeler%'"
    Et que j'ouvre la page
    Quand je filtre sur la requête "Mes rappels"
    Alors la page montre la tâche "Requête : à rappeler"
    Et la page ne montre pas la tâche "Requête : à oublier"
    Et le bouton des filtres dit "Filtres (1)"
    Quand je recharge la page
    Alors la page ne montre pas la tâche "Requête : à oublier"
    Quand j'ouvre le kanban
    Alors la carte "Requête : à rappeler" est dans la colonne "À faire"
    Et le kanban ne montre pas la carte "Requête : à oublier"

  Scénario: Une requête sans colonne id le dit au lieu de filtrer
    Étant donné que Claude a enregistré la requête "Compte des éléments" qui fait "SELECT count(*) AS n FROM v_elements"
    Et que j'ouvre la page
    Quand je filtre sur la requête "Compte des éléments"
    Alors l'avis de la requête dit "ne rend pas de colonne « id »"
