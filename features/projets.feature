# language: fr
@navigateur
Fonctionnalité: Les projets et les releases
  La vue Projets montre les projets en arbre (les sous-projets en retrait) avec leur avancement :
  combien d'éléments faits sur combien, à toute profondeur. On y crée un projet, on ouvre son détail,
  on voit son contenu dans la liste. Une release est un tag release:<nom> ; elle a son avancement, et
  mène au kanban filtré sur son tag.

  Scénario: Les projets en arbre, avec leur avancement
    Étant donné que le projet "Projets : jardin" existe
    Et que le projet "Projets : jardin" contient le projet "Projets : potager"
    Et que le projet "Projets : potager" contient la tâche faite "Projets : semer les radis"
    Et que le projet "Projets : jardin" contient la tâche "Projets : tondre"
    Et que j'ouvre la page
    Quand j'ouvre la vue des projets
    Alors l'adresse de la page est "/projets"
    Et le projet "Projets : potager" est en retrait sous "Projets : jardin"
    Et le projet "Projets : jardin" en est à "1 / 2"
    Et le projet "Projets : potager" en est à "1 / 1"
    Quand je touche le projet "Projets : potager"
    Alors le panneau de détail montre "Projets : potager"
    Et l'adresse de la page commence par "/projets/e/"
    Quand je ferme le détail
    Et je demande à voir le contenu de "Projets : jardin"
    Alors l'adresse de la page est "/"
    Et la page montre la tâche "Projets : semer les radis"
    Et la page montre la tâche "Projets : tondre"
    Et la page ne montre pas la tâche "Projets : jardin"

  Scénario: Créer un projet depuis la vue des projets
    Étant donné que j'ouvre la page
    Et que j'ouvre la vue des projets
    Quand je crée le projet "Projets : vacances"
    Alors la vue des projets montre "Projets : vacances"
    Quand je recharge la page
    Alors la vue des projets montre "Projets : vacances"
    Et le projet "Projets : vacances" en est à "0 / 0"

  Scénario: Une release groupe ce qui porte son tag, et mène au kanban filtré
    Étant donné que la tâche "Release : écrire la doc" existe avec le tag "release:nuit-du-5"
    Et que la tâche "Release : relire la doc" existe avec le tag "release:nuit-du-5"
    Et que j'ouvre la page
    Et que j'ouvre la vue des projets
    Alors la release "nuit-du-5" en est à "0 / 2"
    Quand je touche la release "nuit-du-5"
    Alors l'adresse de la page est "/kanban"
    Et la carte "Release : écrire la doc" est dans la colonne "À faire"
    Et la carte "Release : relire la doc" est dans la colonne "À faire"
    Et le kanban ne montre pas la carte "Projets : tondre"
