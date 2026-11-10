# language: fr
@navigateur
Fonctionnalité: Les horizons (étape 7)
  Un élément se place dans un horizon : un jour, une semaine, un mois, un trimestre, une année, une
  décennie, ou « un jour ». Il se saisit en français dans le détail. L'onglet Horizons montre une
  colonne par échelle, sur sa période en cours ; ‹ et › changent la période d'une colonne, et on
  ajoute un élément directement dans une colonne.

  Scénario: Un objectif l'an prochain, une tâche la semaine prochaine
    Étant donné que l'objectif "Horizons : courir un semi" existe avec l'horizon "l'an prochain"
    Et que la tâche "Horizons : réserver le gîte" existe
    Quand j'ouvre l'adresse de la tâche "Horizons : réserver le gîte"
    Et dans le détail je remplis "Horizon" avec "la semaine prochaine"
    Et j'enregistre le détail
    Alors le détail dit "Horizon : semaine"
    Quand je ferme le détail
    Et j'ouvre les horizons
    Alors l'adresse de la page est "/horizons"
    Et la colonne "Semaine" ne montre pas "Horizons : réserver le gîte"
    Quand j'avance la colonne "Semaine"
    Alors la colonne "Semaine" montre "Horizons : réserver le gîte"
    Et l'adresse garde les décalages "semaine:1"
    Quand j'avance la colonne "Année"
    Alors la colonne "Année" montre "Horizons : courir un semi"

  Scénario: Ajouter dans une colonne, et voir ce qui a dépassé son horizon
    Étant donné que la tâche "Horizons : ranger le garage" existe avec l'horizon "2021-03"
    Et que j'ouvre la page
    Quand j'ouvre les horizons
    Et j'ajoute "Horizons : trier les photos" dans la colonne "Mois"
    Alors la colonne "Mois" montre "Horizons : trier les photos"
    Et les horizons dépassés montrent "Horizons : ranger le garage" pour "mars 2021"
    Quand je recharge la page
    Alors la colonne "Mois" montre "Horizons : trier les photos"
