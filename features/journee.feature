# language: fr
@navigateur
Fonctionnalité: Le mode journée (tâche 6.2)
  Le matin, Adrien ouvre l'onglet Journée : en haut ce qui est prévu aujourd'hui et le temps que ça
  représente, puis ce qui a glissé d'un jour passé, puis le backlog où il choisit ses tâches du
  jour. Choisir une tâche pose son jour prévu ; la retirer la rend au backlog.

  Scénario: Choisir, reprendre, retirer, cocher
    Étant donné que la tâche "Journée : écrire le devis" existe avec l'estimation 45
    Et que la tâche "Journée : appeler le garage" est prévue le "2021-03-01"
    Et que j'ouvre la page
    Quand j'ouvre le mode journée
    Alors l'adresse de la page est "/journee"
    Et le backlog de la journée montre "Journée : écrire le devis"
    Et les tâches qui ont glissé montrent "Journée : appeler le garage"
    Quand je prends "Journée : écrire le devis" pour aujourd'hui
    Alors la journée montre "Journée : écrire le devis" avec "45 min"
    Et le backlog de la journée ne montre plus "Journée : écrire le devis"
    Quand je reprends aujourd'hui "Journée : appeler le garage"
    Alors la journée montre "Journée : appeler le garage" avec ""
    Et les tâches qui ont glissé ne montrent plus "Journée : appeler le garage"
    Quand je recharge la page
    Alors la journée montre "Journée : écrire le devis" avec "45 min"
    Quand je coche dans la journée "Journée : appeler le garage"
    Alors dans la journée, "Journée : appeler le garage" est faite
    Quand je retire de la journée "Journée : écrire le devis"
    Alors le backlog de la journée montre "Journée : écrire le devis"

  Scénario: Les créneaux, le temps prévu face au temps disponible (tâche 6.3)
    Étant donné que la tâche "Créneaux : relire" est prévue aujourd'hui avec l'estimation 30
    Et que la tâche "Créneaux : appel" est prévue aujourd'hui à "23:00" avec l'estimation 30
    Et que j'ouvre la page
    Quand j'ouvre le mode journée
    Et je règle ma journée de "00:00" à "23:59"
    Et je case à la suite
    Alors "Créneaux : relire" a une heure
    Quand je mets "Créneaux : relire" à "23:10"
    Alors la journée montre "Créneaux : relire" avec "23:10–23:40 · chevauche"
    Et la journée montre "Créneaux : appel" avec "23:00–23:30 · chevauche"
    Étant donné que la tâche "Créneaux : énorme" est prévue aujourd'hui avec l'estimation 2000
    Quand je recharge la page
    Alors la journée dit qu'il y a du temps de trop
    Et ma journée va de "00:00" à "23:59"
    Quand je retire de la journée "Créneaux : énorme"
    Alors la journée ne dit plus qu'il y a du temps de trop
