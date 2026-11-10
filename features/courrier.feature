# language: fr
Fonctionnalité: Un mail devient une tâche (étape 8)
  Adrien envoie un mail à l'adresse de Crazybrain : le sujet devient le titre de la tâche, le texte
  sa description, avec le tag source:mail. Seuls ses mails, authentifiés (SPF et DKIM réussis selon
  le serveur qui les a reçus), sont acceptés ; les autres sont refusés et notés avec la raison.

  Contexte:
    Étant donné que je suis connecté par Cloudflare Access

  Scénario: Un mail d'Adrien devient une tâche
    Quand Adrien envoie le mail "Fwd: Courrier : appeler le plombier" avec le texte "Il passe jeudi.\nPrévoir 80 €."
    Alors le mail est accepté
    Et la tâche "Courrier : appeler le plombier" existe avec la description "Il passe jeudi.\nPrévoir 80 €." et le tag "source:mail"
    Et le dernier mail reçu est noté accepté, signé par "mx.essai.local"

  Scénario: Un mail d'un inconnu est refusé
    Quand "intrus@ailleurs.example" envoie le mail "Courrier : gagnez un prix" avec le texte "Cliquez ici."
    Alors le mail est refusé
    Et aucune tâche "Courrier : gagnez un prix" n'existe
    Et le dernier mail reçu est noté refusé : "expéditeur non autorisé"

  Scénario: Un faux résultat d'authentification glissé dans le mail est refusé
    Quand quelqu'un envoie au nom d'Adrien le mail "Courrier : faux Adrien" avec un résultat d'authentification écrit par "mx.faussaire.example"
    Alors le mail est refusé
    Et aucune tâche "Courrier : faux Adrien" n'existe
    Et le dernier mail reçu est noté refusé : "résultat écrit par « mx.faussaire.example », serveur non reconnu"

  Scénario: Un mail d'Adrien dont la signature DKIM a échoué est refusé
    Quand Adrien envoie le mail "Courrier : signature cassée" sans signature DKIM valide
    Alors le mail est refusé
    Et le dernier mail reçu est noté refusé : "pas de signature DKIM valide de exemple.fr"
