# language: fr
@navigateur
Fonctionnalité: Le calendrier (tâche 6.1)
  Un onglet Calendrier montre les tâches à leur échéance et au jour où elles sont prévues, sur la
  semaine (une liste par jour, lisible au téléphone) ou sur le mois (une grille). On avance et on
  recule d'une période ; la période et le jour vivent dans l'adresse.

  Scénario: La semaine en cours montre ce qui est prévu aujourd'hui
    Étant donné que la tâche "Calendrier : aujourd'hui" est prévue aujourd'hui à "09:30"
    Et que j'ouvre la page
    Quand j'ouvre le calendrier
    Alors l'adresse de la page est "/calendrier"
    Et le jour d'aujourd'hui montre "Calendrier : aujourd'hui" avec la marque "09:30"

  Scénario: Le mois, l'échéance et le jour prévu, et la navigation
    Étant donné que la tâche "Calendrier : rendre le dossier" existe avec l'échéance "2102-03-17"
    Et que la tâche "Calendrier : préparer" est prévue le "2102-03-16" avec l'échéance "2102-03-19"
    Et que j'ouvre le calendrier au "2102-03-01" en mois
    Alors la période affichée est "mars 2102"
    Et le jour "2102-03-17" montre "Calendrier : rendre le dossier" avec la marque "échéance"
    Et le jour "2102-03-16" montre "Calendrier : préparer" avec la marque "prévu"
    Et le jour "2102-03-19" montre "Calendrier : préparer" avec la marque "échéance"
    Quand j'avance d'une période
    Alors la période affichée est "avril 2102"
    Quand je recule d'une période
    Et je choisis le jour "2102-03-17"
    Alors la période affichée est "du 13 au 19 mars 2102"
    Et l'adresse garde la période "semaine" et le jour "2102-03-17"
    Et le jour "2102-03-17" montre "Calendrier : rendre le dossier" avec la marque "échéance"
    Quand je clique sur "Calendrier : rendre le dossier" dans le calendrier
    Alors l'adresse de la page commence par "/calendrier/e/"
