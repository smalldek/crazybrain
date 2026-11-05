# language: fr
@navigateur
Fonctionnalité: La page de la liste, sur le téléphone
  Adrien se sert de la page sur son téléphone : taper une tâche, la cocher quand elle est faite,
  corriger son titre, lui donner une échéance. Ces scénarios jouent la vraie page dans un vrai
  navigateur, à la taille d'un écran de téléphone, et vérifient que tout survit au rechargement.

  Scénario: Taper une tâche l'ajoute à la liste
    Étant donné que j'ouvre la page
    Quand je tape la tâche "Page : acheter du lait" et j'appuie sur Entrée
    Alors la page montre la tâche "Page : acheter du lait"

  Scénario: Cocher une tâche la barre, la range en bas, et elle le reste
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Page : vider le lave-vaisselle" et j'appuie sur Entrée
    Et que je tape la tâche "Page : plier le linge" et j'appuie sur Entrée
    Quand je coche la tâche "Page : vider le lave-vaisselle"
    Alors la tâche "Page : vider le lave-vaisselle" est cochée et barrée
    Et la tâche "Page : vider le lave-vaisselle" est après la tâche "Page : plier le linge"
    Quand je recharge la page
    Alors la tâche "Page : vider le lave-vaisselle" est cochée et barrée
    Quand je décoche la tâche "Page : vider le lave-vaisselle"
    Alors la tâche "Page : vider le lave-vaisselle" n'est pas cochée

  Scénario: Toucher le titre permet de le corriger
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Page : apeller maman" et j'appuie sur Entrée
    Quand je touche le titre "Page : apeller maman" et je le remplace par "Page : appeler maman"
    Alors la page montre la tâche "Page : appeler maman"
    Et la page ne montre pas la tâche "Page : apeller maman"
    Quand je recharge la page
    Alors la page montre la tâche "Page : appeler maman"

  Scénario: Échap annule la correction du titre
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Page : ranger le garage" et j'appuie sur Entrée
    Quand je touche le titre "Page : ranger le garage", je tape "autre chose" puis Échap
    Alors la page montre la tâche "Page : ranger le garage"

  Scénario: Une échéance se garde, et une échéance passée s'affiche en retard
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Page : rendre les livres" et j'appuie sur Entrée
    Et que je tape la tâche "Page : préparer Noël" et j'appuie sur Entrée
    Quand je donne à la tâche "Page : rendre les livres" l'échéance "2020-01-15"
    Et je donne à la tâche "Page : préparer Noël" l'échéance "2099-12-24"
    Et je recharge la page
    Alors la tâche "Page : rendre les livres" a l'échéance "2020-01-15", marquée en retard
    Et la tâche "Page : préparer Noël" a l'échéance "2099-12-24", pas en retard

  Scénario: Supprimer une tâche, puis annuler
    Étant donné que j'ouvre la page
    Et que je tape la tâche "Page : tâche en trop" et j'appuie sur Entrée
    Quand je supprime la tâche "Page : tâche en trop" sur la page
    Alors la page ne montre pas la tâche "Page : tâche en trop"
    Quand j'annule la suppression
    Alors la page montre la tâche "Page : tâche en trop"
    Quand je supprime la tâche "Page : tâche en trop" sur la page
    Et je recharge la page
    Alors la page ne montre pas la tâche "Page : tâche en trop"
