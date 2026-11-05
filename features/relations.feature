# language: fr
Fonctionnalité: Liens, tags et commentaires (tâche 1.3)
  Une tâche se rattache à un ou plusieurs projets par un lien « appartient_a » ; elle peut en
  bloquer une autre. Elle porte des tags clé:valeur et des commentaires. Chaque ajout ou retrait
  s'écrit dans le journal.

  Scénario: Rattacher une tâche à deux projets
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé l'élément {"titre": "Maison", "type": "projet"}
    Et que j'ai créé l'élément {"titre": "Budget", "type": "projet"}
    Et que j'ai créé l'élément {"titre": "Acheter un canapé"}
    Quand je lie le dernier élément au premier par "appartient_a"
    Et je lie le dernier élément au deuxième par "appartient_a"
    Alors le dernier élément, relu, a 2 liens "appartient_a"
    Et le premier élément, relu, a 1 lien "appartient_a"

  Scénario: Un lien en double, vers soi-même, ou d'un type inconnu est refusé
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé l'élément {"titre": "A"}
    Et que j'ai créé l'élément {"titre": "B"}
    Quand je lie le dernier élément au premier par "bloque"
    Alors la création est acceptée
    Quand je lie le dernier élément au premier par "bloque"
    Alors la réponse est 409
    Quand je lie le dernier élément au dernier par "lie_a"
    Alors la réponse est 400
    Quand je lie le dernier élément au premier par "parent_de"
    Alors la réponse est 400

  Scénario: Retirer un lien
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé l'élément {"titre": "C"}
    Et que j'ai créé l'élément {"titre": "D"}
    Et que je lie le dernier élément au premier par "lie_a"
    Quand je retire ce lien
    Alors la réponse est 204
    Et le dernier élément, relu, a 0 lien "lie_a"
    Et le journal de cette tâche contient "element_cree" puis "lien_ajoute" puis "lien_retire"

  Scénario: Poser et retirer des tags
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Installer le serveur"
    Quand je pose le tag "composant:pxe"
    Alors la création est acceptée
    Quand je pose le tag "release:v1"
    Et je pose le tag "urgent"
    Et je pose le tag "composant:pxe"
    Alors la réponse est 200
    Et cette tâche, relue, a les tags "composant:pxe, release:v1, urgent"
    Quand je retire le tag "release:v1"
    Alors la réponse est 204
    Et cette tâche, relue, a les tags "composant:pxe, urgent"

  Scénario: Un tag invalide est refusé
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Tag raté"
    Quand je pose le tag "projet:maison"
    Alors la réponse est 400
    Quand je pose le tag "mon tag"
    Alors la réponse est 400

  Scénario: Commenter une tâche
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Choisir un plombier"
    Quand je commente "Devis reçu de **deux** artisans."
    Alors la création est acceptée
    Et cette tâche, relue, a 1 commentaire de "adrien" qui dit "Devis reçu de **deux** artisans."
    Quand je commente "   "
    Alors la réponse est 400

  Scénario: Sans connexion, pas de lien, de tag ni de commentaire
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Privée"
    Et que je ne suis pas connecté
    Quand je pose le tag "secret"
    Alors l'accès est refusé
    Quand je commente "intrus"
    Alors l'accès est refusé
