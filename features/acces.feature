# language: fr
Fonctionnalité: La deuxième serrure de l'API
  Cloudflare Access ferme le site. Le Worker vérifie en plus le jeton qu'Access lui transmet :
  si Access était mal réglé, l'API refuserait quand même.

  Scénario: Un appel sans jeton de connexion est refusé
    Étant donné que je ne suis pas connecté
    Quand je demande la liste des tâches
    Alors l'accès est refusé

  Scénario: Un jeton signé par une autre clé est refusé
    Étant donné que je présente un jeton signé par une clé inconnue
    Quand je demande la liste des tâches
    Alors l'accès est refusé
