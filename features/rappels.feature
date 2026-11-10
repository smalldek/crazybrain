# language: fr
Fonctionnalité: Les rappels sur le téléphone (tâche 5.5)
  Le téléphone s'abonne aux notifications (Web Push). Chaque minute, une tâche planifiée du Worker
  envoie les rappels dont l'heure est passée, chiffrés pour le téléphone et signés par le Worker.
  Chaque envoi est noté, pour mesurer le retard sur plusieurs jours. Ici, un faux service de
  notification reçoit les messages à la place de celui de Google, et les déchiffre comme le ferait
  le téléphone.

  Contexte:
    Étant donné que je suis connecté par Cloudflare Access
    Et qu'un faux service de notification écoute

  Scénario: Un rappel échu part à la minute suivante, une seule fois
    Étant donné qu'un téléphone "rappel-a" est abonné aux rappels
    Et que la tâche "Rappel : payer la cantine" a un rappel il y a une minute
    Quand la tâche planifiée tourne
    Alors le téléphone "rappel-a" reçoit la notification "Rappel : payer la cantine", signée par le Worker
    Quand le téléphone "rappel-a" signale l'avoir reçue
    Alors les envois montrent "Rappel : payer la cantine" reçu
    Quand la tâche planifiée tourne
    Alors le téléphone "rappel-a" a reçu "Rappel : payer la cantine" une seule fois

  Scénario: Un rappel à venir, ou sur une tâche faite, ne part pas
    Étant donné qu'un téléphone "rappel-b" est abonné aux rappels
    Et que la tâche "Rappel : plus tard" a un rappel dans une heure
    Et que la tâche "Rappel : déjà fait" a un rappel il y a une minute
    Et que la tâche "Rappel : déjà fait" est faite
    Quand la tâche planifiée tourne
    Alors le téléphone "rappel-b" n'a rien reçu pour "Rappel : plus tard"
    Et le téléphone "rappel-b" n'a rien reçu pour "Rappel : déjà fait"

  Scénario: Changer l'heure d'un rappel déjà parti le reprogramme
    Étant donné qu'un téléphone "rappel-c" est abonné aux rappels
    Et que la tâche "Rappel : deux fois" a un rappel il y a une minute
    Quand la tâche planifiée tourne
    Et la tâche "Rappel : deux fois" reçoit un nouveau rappel il y a 30 secondes
    Et la tâche planifiée tourne
    Alors le téléphone "rappel-c" a reçu "Rappel : deux fois" 2 fois

  Scénario: Le rappel d'essai, et un téléphone désabonné par le service est oublié
    Étant donné qu'un téléphone "rappel-d" est abonné aux rappels
    Et qu'un téléphone "mort" est abonné aux rappels
    Quand j'envoie un rappel d'essai
    Alors le téléphone "rappel-d" reçoit la notification "Rappel d’essai", signée par le Worker
    Et le téléphone "mort" n'est plus abonné

  Scénario: Une heure sans fuseau est l'heure de Paris (ce qu'écrit Claude)
    Étant donné que la tâche "Rappel : par Claude" existe par l'API
    Quand je programme le rappel de "Rappel : par Claude" à "2026-12-01 09:15"
    Alors la tâche "Rappel : par Claude" a le rappel "2026-12-01T08:15:00.000Z"

  @navigateur
  Scénario: Le rappel se règle dans le détail, et le Tableau propose d'activer les rappels
    Étant donné que la tâche "Rappel : dans le détail" existe
    Quand j'ouvre l'adresse de la tâche "Rappel : dans le détail"
    Et dans le détail je remplis "Rappel sur le téléphone" avec "2026-12-01T09:15"
    Et j'enregistre le détail
    Et je recharge la page
    Alors dans le détail "Rappel sur le téléphone" vaut "2026-12-01T09:15"
    Quand j'ouvre l'adresse "/tableau"
    Alors le tableau propose d'activer les rappels
