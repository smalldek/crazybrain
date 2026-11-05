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

  Scénario: Cocher une tâche la passe à « fait », et elle le reste
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Sortir les poubelles"
    Quand je passe cette tâche au statut "fait"
    Alors la modification est acceptée
    Et cette tâche, relue, a le statut "fait" et une date de fin

  Scénario: Décocher une tâche efface sa date de fin
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Arroser les plantes"
    Et que je passe cette tâche au statut "fait"
    Quand je passe cette tâche au statut "a_faire"
    Alors cette tâche, relue, a le statut "a_faire" et pas de date de fin

  Scénario: Renommer une tâche
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Apeler le garage"
    Quand je renomme cette tâche en "Appeler le garage"
    Alors la modification est acceptée
    Et la liste des tâches contient "Appeler le garage"
    Et la liste des tâches ne contient pas "Apeler le garage"

  Scénario: Donner une échéance, puis la retirer
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Payer la cantine"
    Quand je donne à cette tâche l'échéance "2026-11-20"
    Alors cette tâche, relue, a l'échéance "2026-11-20"
    Quand je retire l'échéance de cette tâche
    Alors cette tâche, relue, n'a pas d'échéance

  Scénario: Une modification invalide est refusée et ne change rien
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Réserver le train"
    Quand j'envoie à cette tâche la modification {"titre": "  "}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"statut": "termine"}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"echeance": "2026-02-30"}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"couleur": "rouge"}
    Alors la modification est refusée comme invalide
    Et la liste des tâches contient "Réserver le train"
    Et le journal de cette tâche ne contient que "element_cree"

  Scénario: Modifier une tâche qui n'existe pas
    Étant donné que je suis connecté par Cloudflare Access
    Quand je renomme la tâche "inconnue-123" en "Quelque chose"
    Alors la réponse dit que la tâche est inconnue

  Scénario: Sans connexion, on ne peut ni lire ni modifier une tâche
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Secret"
    Et que je ne suis pas connecté
    Quand je renomme cette tâche en "Piraté"
    Alors l'accès est refusé
    Quand je lis cette tâche
    Alors l'accès est refusé

  Scénario: Une modification écrit un événement avec l'avant et l'après
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Acheter des timbres"
    Quand je passe cette tâche au statut "fait"
    Alors le journal de cette tâche contient "element_cree" puis "element_modifie"
    Et le dernier événement a l'avant au statut "a_faire", l'après au statut "fait", et l'auteur "adrien"

  Scénario: Une modification qui ne change rien n'écrit pas d'événement
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Lire le courrier"
    Quand je renomme cette tâche en "Lire le courrier"
    Alors la modification est acceptée
    Et le journal de cette tâche ne contient que "element_cree"
