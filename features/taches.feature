# language: fr
Fonctionnalité: Noter une tâche et la retrouver
  Adrien tape une tâche dans la page ; elle s'enregistre et reste dans la liste.
  Chaque création est racontée dans le journal des événements.

  Scénario: Créer une tâche puis la retrouver dans la liste
    Étant donné que je suis connecté par Cloudflare Access
    Quand je crée la tâche "Acheter du pain"
    Alors la création est acceptée
    Et la liste des tâches contient "Acheter du pain"

  Scénario: Un titre vide est refusé
    Étant donné que je suis connecté par Cloudflare Access
    Quand je crée la tâche "   "
    Alors la création est refusée comme invalide
    Et la liste des tâches ne contient pas de tâche vide

  Scénario: Une création écrit un événement
    Étant donné que je suis connecté par Cloudflare Access
    Quand je crée la tâche "Appeler le garage"
    Alors le journal contient un événement "element_cree" pour cette tâche
    Et cet événement a un avant vide, un après égal à la tâche, et l'auteur "adrien"
