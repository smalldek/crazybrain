# language: fr
@navigateur
Fonctionnalité: Le tableau de bord (tâche 4.4)
  Un onglet Tableau : des chiffres (à faire, en cours, en retard, faites et créées en 7 jours), les
  tâches faites semaine par semaine, les prochaines échéances, et les requêtes enregistrées par
  Claude, en tableau ou menant à la liste filtrée.

  Scénario: Les chiffres et les semaines suivent les tâches
    Étant donné que la tâche "Tableau : en retard" existe avec l'échéance "2021-01-01"
    Et que la tâche "Tableau : finie" existe, déjà faite
    Et que la tâche "Tableau : bientôt" existe avec l'échéance "2099-01-01"
    Et que j'ouvre la page
    Quand j'ouvre le tableau de bord
    Alors l'adresse de la page est "/tableau"
    Et le chiffre "En retard" vaut au moins 1
    Et le chiffre "Faites en 7 jours" vaut au moins 1
    Et la semaine en cours compte au moins 1 tâche faite
    Et les prochaines échéances montrent "Tableau : bientôt"

  Scénario: Les requêtes de Claude : un tableau, ou la liste filtrée
    Étant donné que la tâche "Tableau : à relancer" existe avec la priorité "haute"
    Et que Claude a enregistré la requête "Tableau par statut" qui fait "SELECT statut, count(*) AS nombre FROM v_elements GROUP BY statut ORDER BY statut"
    Et que Claude a enregistré la requête "Tableau à relancer" qui fait "SELECT id FROM v_elements WHERE titre = 'Tableau : à relancer'"
    Et que j'ouvre la page
    Quand j'ouvre le tableau de bord
    Alors la requête "Tableau par statut" montre un tableau avec les colonnes "statut, nombre"
    Quand je vois la requête "Tableau à relancer" dans la liste
    Alors la page montre la tâche "Tableau : à relancer"
    Et le bouton des filtres dit "Filtres (1)"
