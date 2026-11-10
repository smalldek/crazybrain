# language: fr
Fonctionnalité: Les tâches récurrentes (tâche 5.6)
  Une tâche porte une règle de récurrence, écrite en français. La cocher crée la suivante : même
  titre, mêmes projets, mêmes tags, à la prochaine date de la règle.

  Contexte:
    Étant donné que je suis connecté par Cloudflare Access

  Scénario: À date fixe, la suivante prend la prochaine échéance, avec les projets et les tags
    Étant donné le projet "Récur : maison"
    Et la tâche "Récur : poubelles" du projet "Récur : maison", tag "lieu:dehors", échéance "2101-01-03", qui se répète "tous les lundis"
    Quand je coche par l'API la tâche "Récur : poubelles"
    Alors la réponse donne la suivante
    Et la suivante a l'échéance "2101-01-10" et la règle "chaque lundi"
    Et la suivante appartient au projet "Récur : maison" et porte le tag "lieu:dehors"
    Et la tâche cochée n'a plus de règle

  Scénario: Après achèvement, la suivante se réveille ce délai après le jour où on coche
    Étant donné la tâche "Récur : chaussures" du projet "", tag "", échéance "2026-01-01", qui se répète "3 mois après fait"
    Quand je coche par l'API la tâche "Récur : chaussures"
    Alors la suivante est prévue 3 mois après aujourd'hui, sans échéance

  Scénario: Une tâche sans règle ne crée rien
    Étant donné la tâche "Récur : une fois" du projet "", tag "", échéance "2101-01-03", qui se répète ""
    Quand je coche par l'API la tâche "Récur : une fois"
    Alors la réponse ne donne pas de suivante

  Scénario: Une règle incomprise est refusée, avec des exemples
    Étant donné la tâche "Récur : floue" du projet "", tag "", échéance "", qui se répète ""
    Quand je donne à la tâche "Récur : floue" la règle "de temps en temps"
    Alors la réponse est 400
    Et la réponse donne des exemples de règles

  @navigateur
  Scénario: La règle se règle dans le détail, et cocher fait apparaître la suivante
    Étant donné que la tâche "Récur : arroser" existe
    Quand j'ouvre l'adresse de la tâche "Récur : arroser"
    Et dans le détail je remplis "Se répète" avec "tous les 10 jours"
    Et j'enregistre le détail
    Alors dans le détail "Se répète" vaut "tous les 10 jours"
    Quand je ferme le détail
    Et je coche la tâche "Récur : arroser"
    Alors la page montre 2 tâches "Récur : arroser", dont une cochée
