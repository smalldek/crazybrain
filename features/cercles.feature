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
    Et la part "Cercles : courir" est un anneau sans couture
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

  Scénario: Égaliser, part du centre, couleur choisie, indicateur de notes (3b.7)
    Étant donné que l'objectif "Compléments : vie" existe
    Et que "Compléments : vie" contient l'objectif "Compléments : santé" de poids 3
    Et que "Compléments : vie" contient l'objectif "Compléments : famille" sans poids
    Et que "Compléments : santé" contient la tâche "Compléments : courir"
    Et que "Compléments : santé" contient la tâche "Compléments : dormir" avec la description "Huit heures"
    Quand j'ouvre les cercles centrés sur "Compléments : vie"
    Alors la part "Compléments : santé" couvre 270°
    Et la part "Compléments : dormir" porte l'indicateur de notes
    Et la part "Compléments : courir" ne porte pas l'indicateur de notes
    Quand je touche la part "Compléments : courir"
    Alors la fiche dit que la part pèse "38 %" du centre
    Quand je touche la part "Compléments : santé"
    Et je choisis la couleur "rose"
    Alors la part "Compléments : santé" est de la couleur "rose"
    Et la part "Compléments : courir" est de la couleur "rose"
    Quand je recharge la page des cercles
    Alors la part "Compléments : courir" est de la couleur "rose"

  Scénario: Égaliser les sous-éléments (3b.7)
    Étant donné que l'objectif "Égaliser : semaine" existe
    Et que "Égaliser : semaine" contient l'objectif "Égaliser : lundi" de poids 5
    Et que "Égaliser : semaine" contient l'objectif "Égaliser : mardi" sans poids
    Quand j'ouvre les cercles centrés sur "Égaliser : semaine"
    Alors la part "Égaliser : lundi" couvre 300°
    Quand j'égalise les sous-éléments
    Alors la part "Égaliser : lundi" couvre 180°
    Et la part "Égaliser : mardi" couvre 180°

  Scénario: Coller une liste indentée, exporter en CSV, le plan suit les filtres (3b.7)
    Étant donné que l'objectif "Liste : projet" existe
    Quand j'ouvre les cercles centrés sur "Liste : projet"
    Et je colle la liste "- Liste : cadrer\n  - Liste : écrire la vision\n  - Liste : relire\n- **Liste : construire** : le gros du travail"
    Alors le plan montre "Liste : cadrer, Liste : écrire la vision, Liste : relire, Liste : construire"
    Et la part "Liste : écrire la vision" couvre 90°
    Quand j'exporte les cercles en CSV
    Alors le fichier CSV contient la ligne "2;Liste : relire;tache;a_faire;50;25;0;;"
    Quand j'ouvre les cercles centrés sur "Liste : projet" avec "texte=relire"
    Alors la ligne "Liste : relire" du plan est éclairée
    Et la ligne "Liste : cadrer" du plan est grisée

  Scénario: Une tâche rattachée à un projet en est une part (3b.8)
    Étant donné que le projet de cercles "Cercles : sport" existe
    Et que la tâche "Cercles : vélo" est rattachée à "Cercles : sport", sans y être rangée
    Et que la tâche "Cercles : natation" est rattachée à "Cercles : sport", sans y être rangée
    Quand j'ouvre les cercles centrés sur "Cercles : sport"
    Alors la part "Cercles : vélo" couvre 180°
    Et la part "Cercles : natation" couvre 180°

  Scénario: Le zoom est animé, les flèches passent d'une part à l'autre (3b.9, 3b.12)
    Étant donné que l'objectif "Gestes : maison" existe
    Et que "Gestes : maison" contient l'objectif "Gestes : cuisine" sans poids
    Et que "Gestes : maison" contient l'objectif "Gestes : jardin" sans poids
    Et que "Gestes : cuisine" contient la tâche "Gestes : peindre"
    Quand j'ouvre les cercles centrés sur "Gestes : maison"
    Et je touche la part "Gestes : cuisine"
    Et j'appuie sur "ArrowRight" dans les cercles
    Alors la part choisie est "Gestes : jardin"
    Quand j'appuie sur "ArrowLeft" dans les cercles
    Et j'appuie sur "ArrowDown" dans les cercles
    Alors la part choisie est "Gestes : peindre"
    Quand j'appuie sur "ArrowUp" dans les cercles
    Alors la part choisie est "Gestes : cuisine"
    Quand je touche la part "Gestes : cuisine"
    Alors le passage au nouveau centre est animé
    Et le centre des cercles est "Gestes : cuisine"

  Scénario: Tirer le bord d'une part règle son importance, tirer son remplissage règle l'avancement (3b.11)
    Étant donné que l'objectif "Tirer : semaine" existe
    Et que "Tirer : semaine" contient l'objectif "Tirer : sport" sans poids
    Et que "Tirer : semaine" contient l'objectif "Tirer : lecture" sans poids
    Et que "Tirer : semaine" contient l'objectif "Tirer : amis" sans poids
    Quand j'ouvre les cercles centrés sur "Tirer : semaine"
    Et je touche la part "Tirer : sport"
    Et je tire la frontière de la part choisie jusqu'à 180°
    Alors la part "Tirer : sport" couvre 180°
    Et la part "Tirer : lecture" couvre 90°
    Et la part "Tirer : amis" couvre 90°
    Quand je recharge la page des cercles
    Alors la part "Tirer : sport" couvre 180°
    Quand je touche la part "Tirer : amis"
    Et je tire le remplissage de la part choisie à 60 %
    Alors la part "Tirer : amis" en est à 60 %
    Et le centre en est à "15 %"
    Quand je recharge la page des cercles
    Alors la part "Tirer : amis" en est à 60 %

  Scénario: Glisser une part sur le cercle la range dans une autre (3b.12)
    Étant donné que l'objectif "Glisser : année" existe
    Et que "Glisser : année" contient l'objectif "Glisser : santé" sans poids
    Et que "Glisser : année" contient l'objectif "Glisser : travail" sans poids
    Et que "Glisser : année" contient l'objectif "Glisser : courir" sans poids
    Quand j'ouvre les cercles centrés sur "Glisser : année"
    Et je glisse la part "Glisser : courir" au milieu de la part "Glisser : santé"
    Alors "Glisser : courir" est rangé dans "Glisser : santé"
    Et la part "Glisser : santé" couvre 180°
    Et la part "Glisser : courir" couvre 180°

  Scénario: Ajouter, renommer et supprimer sur le cercle même (3b.13)
    Étant donné que l'objectif "Sur : maison" existe
    Et que "Sur : maison" contient l'objectif "Sur : cuisine" sans poids
    Quand j'ouvre les cercles centrés sur "Sur : maison"
    Et je touche le « + » du centre et je tape "Sur : jardin"
    Alors la part "Sur : jardin" est choisie
    Et la part "Sur : jardin" couvre 180°
    Quand je tape "Sur : potager" dans la saisie du cercle
    Alors la part "Sur : potager" est choisie
    Et la part "Sur : potager" couvre 120°
    Quand je ferme la saisie du cercle
    Et je touche la part "Sur : cuisine"
    Alors la barre d'actions tient dans l'écran
    Quand je touche « Ajouter à côté » sur le cercle
    Alors la saisie du cercle tient dans l'écran
    Quand je tape "Sur : garage" dans la saisie du cercle
    Alors le plan montre "Sur : cuisine, Sur : garage, Sur : jardin, Sur : potager"
    Quand je ferme la saisie du cercle
    Et je touche la part "Sur : cuisine"
    Et je touche « Ajouter un sous-élément » sur le cercle
    Et je tape "Sur : laver" dans la saisie du cercle
    Alors la part "Sur : laver" couvre 90°
    Quand je ferme la saisie du cercle
    Et je touche la part "Sur : potager"
    Et je touche « Renommer » sur le cercle
    Et je tape "Sur : verger" dans la saisie du cercle
    Alors la part "Sur : verger" couvre 90°
    Et la part "Sur : potager" n'existe plus
    Et la part "Sur : verger" est choisie
    Quand je touche « Supprimer » sur le cercle
    Alors la part "Sur : verger" n'existe plus
    Et la part "Sur : jardin" couvre 120°
    Quand je touche la part "Sur : jardin"
    Alors la barre d'actions tient dans l'écran
    Quand j'appuie sur "Insert" dans les cercles
    Alors la saisie du cercle propose "Ajouter dans « Sur : jardin »"
    Et la saisie du cercle tient dans l'écran
    Quand je ferme la saisie du cercle
    Et j'appuie sur "Control+Shift+Enter" dans les cercles
    Alors la saisie du cercle propose "Ajouter à côté"
    Quand je ferme la saisie du cercle
    Et j'appuie sur "Alt+Enter" dans les cercles
    Alors la saisie du cercle propose "Renommer « Sur : jardin »"

  Scénario: Les retours du 11/11 : l'oignon, la valeur pendant un réglage, la suppression immédiate, le zoom
    Étant donné que l'objectif "Oignon : sport" existe
    Et que "Oignon : sport" contient l'objectif "Oignon : courir" sans poids
    Et que "Oignon : sport" contient l'objectif "Oignon : nager" sans poids
    Et que "Oignon : courir" contient la tâche "Oignon : fractionné"
    Et que "Oignon : courir" contient la tâche "Oignon : footing"
    Quand j'ouvre les cercles centrés sur "Oignon : courir"
    Alors l'oignon montre « Tout » puis "Oignon : sport" autour du centre
    Quand je touche l'anneau "Oignon : sport" de l'oignon
    Alors le centre des cercles est "Oignon : sport"
    Quand je touche la part "Oignon : courir"
    Alors pendant que je tire la frontière de la part choisie jusqu'à 270°, la valeur dit "75 % de son parent"
    Et la part "Oignon : courir" couvre 270°
    Et la part "Oignon : nager" couvre 90°
    Quand je touche la part "Oignon : nager"
    Et je touche « Supprimer » sur le cercle alors que le serveur met 3 secondes à répondre
    Alors la part "Oignon : nager" a disparu sans attendre le serveur
    Quand je touche « Zoomer » au-dessus du cercle
    Alors le dessin est grossi 1,5 fois
    Quand je touche « Plein écran » au-dessus du cercle
    Alors le cercle est en plein écran
    Quand j'appuie sur "Escape" dans les cercles
    Alors le cercle n'est plus en plein écran
