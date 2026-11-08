# language: fr
@navigateur
Fonctionnalité: Les objectifs en cercles (étape 3b)
  Un élément au centre, un anneau par niveau de sous-éléments. Chaque part a un poids dans son
  parent, et les parts sœurs font 100 % ; elle se remplit selon son avancement, qui remonte jusqu'au
  centre. Toucher une part la choisit, la retoucher zoome, toucher le centre remonte.

  Scénario: Les parts à leur poids, le zoom, le fil d'Ariane et l'adresse
    Étant donné que l'objectif "Cercles : vivre mieux" existe
    Et que "Cercles : vivre mieux" contient l'objectif "Cercles : santé" de poids 2
    Et que "Cercles : vivre mieux" contient l'objectif "Cercles : famille" de poids 1
    Et que "Cercles : vivre mieux" contient l'objectif "Cercles : travail" sans poids
    Et que "Cercles : santé" contient la tâche "Cercles : courir"
    Quand j'ouvre les cercles centrés sur "Cercles : vivre mieux"
    Alors la part "Cercles : santé" couvre 180°
    Et la part "Cercles : famille" couvre 90°
    Et la part "Cercles : travail" couvre 90°
    Et la part "Cercles : courir" couvre 180°
    Quand je touche la part "Cercles : santé"
    Alors la fiche dit que "Cercles : santé" pèse "50 %" de son parent
    Quand je touche la part "Cercles : santé"
    Alors le centre des cercles est "Cercles : santé"
    Et le fil d'Ariane dit "Tout › Cercles : vivre mieux › Cercles : santé"
    Et la part "Cercles : courir" couvre 360°
    Quand je recharge la page des cercles
    Alors le centre des cercles est "Cercles : santé"
    Quand je touche le centre des cercles
    Alors le centre des cercles est "Cercles : vivre mieux"
    Quand je reviens en arrière dans les cercles
    Alors le centre des cercles est "Cercles : santé"

  Scénario: L'avancement remonte jusqu'au centre
    Étant donné que l'objectif "Cercles : maison" existe
    Et que "Cercles : maison" contient l'objectif "Cercles : peindre" sans poids
    Et que "Cercles : maison" contient la tâche "Cercles : ranger"
    Et que "Cercles : peindre" contient la tâche faite "Cercles : acheter la peinture"
    Et que "Cercles : peindre" contient la tâche "Cercles : peindre les murs"
    Quand j'ouvre les cercles centrés sur "Cercles : maison"
    Alors la part "Cercles : peindre" en est à 50 %
    Et le centre en est à "25 %"
    Quand je touche la part "Cercles : ranger"
    Et je règle l'avancement à 40
    Alors la part "Cercles : ranger" en est à 40 %
    Et le centre en est à "45 %"
    Quand je recharge la page des cercles
    Alors le centre en est à "45 %"
    Quand je touche la part "Cercles : peindre les murs"
    Et je coche « Fait » dans la fiche
    Alors la part "Cercles : peindre" en est à 100 %
    Et le centre en est à "70 %"

  Scénario: Régler l'importance d'une part au curseur
    Étant donné que l'objectif "Cercles : semaine" existe
    Et que "Cercles : semaine" contient l'objectif "Cercles : lundi" sans poids
    Et que "Cercles : semaine" contient l'objectif "Cercles : mardi" sans poids
    Et que "Cercles : semaine" contient l'objectif "Cercles : mercredi" sans poids
    Quand j'ouvre les cercles centrés sur "Cercles : semaine"
    Alors la part "Cercles : lundi" couvre 120°
    Quand je touche la part "Cercles : lundi"
    Et je règle l'importance à 50
    Alors la part "Cercles : lundi" couvre 180°
    Et la part "Cercles : mardi" couvre 90°
    Et la part "Cercles : mercredi" couvre 90°
    Quand je recharge la page des cercles
    Alors la part "Cercles : lundi" couvre 180°

  Scénario: Ajouter, renommer et supprimer dans les cercles
    Étant donné que l'objectif "Cercles : jardin" existe
    Et que "Cercles : jardin" contient l'objectif "Cercles : potager" sans poids
    Quand j'ouvre les cercles centrés sur "Cercles : jardin"
    Et je touche la part "Cercles : potager"
    Et j'ajoute le sous-élément "Cercles : semer"
    Alors la part "Cercles : semer" couvre 360°
    Quand j'ajoute à côté "Cercles : verger"
    Alors la part "Cercles : potager" couvre 180°
    Quand je touche la part "Cercles : verger"
    Et je renomme la part en "Cercles : vergers"
    Alors la part "Cercles : vergers" couvre 180°
    Quand je recharge la page des cercles
    Alors la part "Cercles : semer" couvre 180°
    Quand je touche la part "Cercles : vergers"
    Et je supprime la part
    Alors la part "Cercles : potager" couvre 360°
    Quand j'annule la suppression
    Alors la part "Cercles : vergers" couvre 180°

  Scénario: Poids et avancement dans le panneau de détail
    Étant donné que l'objectif "Cercles : lire" existe
    Et que "Cercles : lire" contient la tâche "Cercles : un roman"
    Quand j'ouvre les cercles centrés sur "Cercles : lire"
    Et je touche la part "Cercles : un roman"
    Et j'ouvre le détail depuis la fiche
    Et dans le détail je remplis "Poids" avec "3"
    Et dans le détail je remplis "Avancement (%)" avec "60"
    Et j'enregistre le détail
    Et je ferme le détail
    Alors la part "Cercles : un roman" en est à 60 %
    Et le centre en est à "60 %"

  Scénario: Le plan : replier une branche, réordonner, ranger ailleurs en glissant (3b.4)
    Étant donné que l'objectif "Plan : année" existe
    Et que "Plan : année" contient l'objectif "Plan : sport" sans poids
    Et que "Plan : année" contient l'objectif "Plan : lecture" sans poids
    Et que "Plan : sport" contient la tâche "Plan : nager"
    Et que "Plan : sport" contient la tâche "Plan : courir"
    Quand j'ouvre les cercles centrés sur "Plan : année"
    Alors le plan montre "Plan : sport, Plan : nager, Plan : courir, Plan : lecture"
    Quand je replie "Plan : sport" dans le plan
    Alors le plan montre "Plan : sport, Plan : lecture"
    Quand je déplie "Plan : sport" dans le plan
    Et je glisse dans le plan "Plan : lecture" au-dessus de "Plan : sport"
    Alors le plan montre "Plan : lecture, Plan : sport, Plan : nager, Plan : courir"
    Quand je glisse dans le plan "Plan : courir" dans "Plan : lecture"
    Alors le plan montre "Plan : lecture, Plan : courir, Plan : sport, Plan : nager"
    Et la part "Plan : courir" couvre 180°
    Quand je recharge la page des cercles
    Alors le plan montre "Plan : lecture, Plan : courir, Plan : sport, Plan : nager"
    Quand je glisse dans le plan "Plan : sport" dans "Plan : nager"
    Alors la page dit "Impossible : un élément ne peut pas être rangé dans lui-même ni dans ce qu’il contient."

  Scénario: Les repères : filtres qui éclairent, retards, image enregistrée (3b.5)
    Étant donné que l'objectif "Repères : maison" existe
    Et que "Repères : maison" contient la tâche "Repères : réseau"
    Et que "Repères : maison" contient la tâche "Repères : jardin"
    Et que "Repères : maison" contient la tâche "Repères : toit" à rendre le "2020-01-01"
    Et que "Repères : réseau" porte le tag "composant:pxe"
    Quand j'ouvre les cercles centrés sur "Repères : maison" avec "tag=composant:pxe"
    Alors la part "Repères : réseau" est éclairée
    Et la part "Repères : jardin" est grisée
    Et la part "Repères : toit" est grisée
    Et la part "Repères : toit" est marquée en retard
    Et la part "Repères : jardin" n'est pas marquée en retard
    Quand j'enregistre l'image des cercles
    Alors le fichier enregistré est un SVG qui contient "Repères : réseau"
