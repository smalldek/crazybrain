# language: fr
@navigateur
Fonctionnalité: Le panneau de détail d'un élément
  Chaque élément a son adresse, qui ouvre son panneau de détail : tous ses champs, modifiables.
  Sur le téléphone, le panneau prend tout l'écran ; la croix ou le bouton Retour revient à la liste.

  Scénario: La flèche d'une tâche ouvre son détail, à son adresse
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Détail : réparer le vélo" et j'appuie sur Entrée
    Quand je touche la flèche de la tâche "Détail : réparer le vélo"
    Alors le panneau de détail montre "Détail : réparer le vélo"
    Et l'adresse de la page est celle de la tâche "Détail : réparer le vélo"

  Scénario: Le détail enregistre tous les champs, et ils restent après rechargement
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Détail : préparer les vacances" et j'appuie sur Entrée
    Et que je touche la flèche de la tâche "Détail : préparer les vacances"
    Quand dans le détail je choisis "En cours" pour "Statut"
    Et dans le détail je choisis "Haute" pour "Priorité"
    Et dans le détail je remplis "Description" avec "Réserver le train **avant** le 15"
    Et dans le détail je remplis "Échéance" avec "2099-07-01"
    Et dans le détail je remplis "Prévu le" avec "2099-06-20"
    Et dans le détail je remplis "À" avec "09:30"
    Et dans le détail je remplis "Estimation (minutes)" avec "45"
    Et j'enregistre le détail
    Et je recharge la page
    Alors le panneau de détail montre "Détail : préparer les vacances"
    Et dans le détail "Statut" vaut "en_cours"
    Et dans le détail "Priorité" vaut "haute"
    Et dans le détail "Description" vaut "Réserver le train **avant** le 15"
    Et dans le détail "Échéance" vaut "2099-07-01"
    Et dans le détail "Prévu le" vaut "2099-06-20"
    Et dans le détail "À" vaut "09:30"
    Et dans le détail "Estimation (minutes)" vaut "45"

  Scénario: Ranger une tâche dans un projet depuis le détail
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Détail : Maison" et j'appuie sur Entrée
    Et que je touche la flèche de la tâche "Détail : Maison"
    Et que dans le détail je choisis "Projet" pour "Type"
    Et que j'enregistre le détail
    Et que je ferme le détail
    Et que je tape la tâche "Détail : repeindre le portail" et j'appuie sur Entrée
    Quand je touche la flèche de la tâche "Détail : repeindre le portail"
    Et dans le détail je choisis "Détail : Maison (projet)" pour "Contenu dans"
    Et j'enregistre le détail
    Et je recharge la page
    Alors dans le détail "Contenu dans" montre "Détail : Maison (projet)"

  Scénario: Le détail refuse un titre vide sans rien envoyer
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Détail : garder mon titre" et j'appuie sur Entrée
    Et que je touche la flèche de la tâche "Détail : garder mon titre"
    Quand dans le détail je remplis "Titre" avec "   "
    Et je tente d'enregistrer le détail
    Alors le détail dit "Le titre ne peut pas être vide."
    Quand je recharge la page
    Alors dans le détail "Titre" vaut "Détail : garder mon titre"

  Scénario: L'adresse d'un élément l'ouvre directement
    Étant donné que la tâche "Détail : lien partagé" existe
    Quand j'ouvre l'adresse de la tâche "Détail : lien partagé"
    Alors le panneau de détail montre "Détail : lien partagé"
    Et la page montre la tâche "Détail : lien partagé"

  Scénario: Fermer le détail, ou revenir en arrière, ramène à la liste
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Détail : aller et retour" et j'appuie sur Entrée
    Quand je touche la flèche de la tâche "Détail : aller et retour"
    Et je ferme le détail
    Alors le panneau de détail est fermé et l'adresse est celle de la liste
    Quand je touche la flèche de la tâche "Détail : aller et retour"
    Et je reviens en arrière
    Alors le panneau de détail est fermé et l'adresse est celle de la liste

  Scénario: Une adresse d'élément inconnue le dit
    Quand j'ouvre l'adresse "/e/n-existe-pas"
    Alors le détail dit "Élément inconnu"
