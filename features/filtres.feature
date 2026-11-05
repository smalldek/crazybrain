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
