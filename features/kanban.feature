# language: fr
@navigateur
Fonctionnalité: Le kanban
  Une colonne par statut. Glisser une carte dans une autre colonne change son statut ; la glisser
  dans sa colonne change son ordre. Tout survit au rechargement. Sur le téléphone, on glisse au doigt
  après un appui long ; sur l'ordinateur, à la souris.

  Scénario: Le kanban range les tâches par statut
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Kanban : trier les photos" et j'appuie sur Entrée
    Quand j'ouvre le kanban
    Alors la carte "Kanban : trier les photos" est dans la colonne "À faire"
    Et l'adresse de la page est "/kanban"

  @ordinateur
  Scénario: Glisser une carte dans une autre colonne change son statut
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Kanban : déclarer les impôts" et j'appuie sur Entrée
    Et que j'ouvre le kanban
    Quand je glisse la carte "Kanban : déclarer les impôts" dans la colonne "En cours"
    Alors la carte "Kanban : déclarer les impôts" est dans la colonne "En cours"
    Quand je recharge la page
    Alors la carte "Kanban : déclarer les impôts" est dans la colonne "En cours"
    Quand je glisse la carte "Kanban : déclarer les impôts" dans la colonne "Fait"
    Et je recharge la page
    Alors la carte "Kanban : déclarer les impôts" est dans la colonne "Fait"
    Quand je reviens à la liste
    Alors la tâche "Kanban : déclarer les impôts" est cochée et barrée

  @ordinateur
  Scénario: Glisser une carte dans sa colonne change son ordre, qui reste
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Kanban : premier" et j'appuie sur Entrée
    Et que je tape la tâche "Kanban : deuxième" et j'appuie sur Entrée
    Et que je tape la tâche "Kanban : troisième" et j'appuie sur Entrée
    Et que j'ouvre le kanban
    Quand je glisse la carte "Kanban : premier" sur la carte "Kanban : troisième"
    Alors dans la colonne "À faire", "Kanban : premier" est au-dessus de "Kanban : troisième"
    Quand je recharge la page
    Alors dans la colonne "À faire", "Kanban : premier" est au-dessus de "Kanban : troisième"

  Scénario: Sur le téléphone, un appui long puis glisser change le statut
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Kanban : arroser les plantes" et j'appuie sur Entrée
    Et que j'ouvre le kanban
    Quand je glisse au doigt la carte "Kanban : arroser les plantes" vers la colonne suivante
    Alors la carte "Kanban : arroser les plantes" est dans la colonne "En cours"
    Quand je recharge la page
    Alors la carte "Kanban : arroser les plantes" est dans la colonne "En cours"

  Scénario: Toucher une carte ouvre son détail, dans le kanban
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Kanban : changer l'ampoule" et j'appuie sur Entrée
    Et que j'ouvre le kanban
    Quand je touche la carte "Kanban : changer l'ampoule"
    Alors le panneau de détail montre "Kanban : changer l'ampoule"
    Et l'adresse de la page commence par "/kanban/e/"
    Quand je ferme le détail
    Alors l'adresse de la page est "/kanban"

  @ordinateur
  Scénario: Des couloirs par une clé de tag au choix, qui restent dans l'adresse
    Étant donné que la tâche "Couloir : brancher le serveur" existe avec le tag "composant:pxe"
    Et que la tâche "Couloir : régler le DNS" existe avec le tag "composant:dns"
    Et que j'ouvre la page
    Et que j'ouvre le kanban
    Quand je choisis les couloirs "Par tag composant"
    Alors la carte "Couloir : brancher le serveur" est dans le couloir "composant:pxe", colonne "À faire"
    Et la carte "Couloir : régler le DNS" est dans le couloir "composant:dns", colonne "À faire"
    Et l'adresse de la page est "/kanban"
    Et l'adresse demande les couloirs "tag:composant"
    Quand je glisse la carte "Couloir : brancher le serveur" dans la colonne "En cours" du couloir "composant:pxe"
    Et je recharge la page
    Alors la carte "Couloir : brancher le serveur" est dans le couloir "composant:pxe", colonne "En cours"

  Scénario: Des couloirs par priorité, sur le téléphone
    Étant donné que la tâche "Couloir : payer la cantine" existe avec la priorité "urgente"
    Et que j'ouvre la page
    Et que j'ouvre le kanban
    Quand je choisis les couloirs "Par priorité"
    Alors la carte "Couloir : payer la cantine" est dans le couloir "Urgente", colonne "À faire"
    Quand je touche la carte "Couloir : payer la cantine"
    Et je ferme le détail
    Alors l'adresse demande les couloirs "priorite"
