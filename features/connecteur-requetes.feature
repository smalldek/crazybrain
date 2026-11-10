# language: fr
Fonctionnalité: Les requêtes par le connecteur (tâche 4.2)
  Dans une conversation, Claude écrit une requête SQL en lecture seule, l'essaie, puis l'enregistre
  sous un nom ; Adrien la retrouve dans l'outil, et Claude la rejoue plus tard.

  Contexte:
    Étant donné que Claude est branché sur Crazybrain par le connecteur

  Scénario: « Combien de tâches par tag ? » : une question qu'aucun filtre ne couvre
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Req : cuisine", "tags": ["piece:cuisine"]}, {"titre": "Req : salon", "tags": ["piece:salon"]}, {"titre": "Req : évier", "tags": ["piece:cuisine"]}]}
    Et Claude appelle "tester_requete" avec {"sql": "SELECT valeur, count(*) AS n FROM v_tags WHERE cle = 'piece' GROUP BY valeur ORDER BY n DESC"}
    Alors l'outil répond sans erreur
    Et l'élément lu a "lignes" égal à [{"valeur": "cuisine", "n": 2}, {"valeur": "salon", "n": 1}]
    Et l'élément lu a "colonnes" égal à ["valeur", "n"]

  Scénario: Enregistrer une requête, la retrouver dans l'outil, la rejouer, la remplacer, la supprimer
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Req : vieille tâche", "echeance": "2020-01-01"}]}
    Et Claude appelle "enregistrer_requete" avec {"nom": "Req en retard", "sql": "SELECT id, titre FROM v_elements WHERE echeance < '2021-01-01' AND statut <> 'fait' AND titre LIKE 'Req :%'", "description": "Les tâches en retard depuis longtemps"}
    Alors l'outil répond sans erreur
    Et l'élément lu a "remplacee" égal à false
    Et la page, connectée par Access, a la requête "Req en retard"
    Quand Claude appelle "executer_requete" avec {"requete": "req en retard"}
    Alors l'élément lu a "lignes" égal à [{"id": "{id:Req : vieille tâche}", "titre": "Req : vieille tâche"}]
    Et la page, connectée par Access, rejoue "Req en retard" et trouve 1 ligne
    Quand Claude appelle "enregistrer_requete" avec {"nom": "Req en retard", "sql": "SELECT id FROM v_elements WHERE echeance < '2019-01-01'"}
    Alors l'élément lu a "remplacee" égal à true
    Quand Claude appelle "executer_requete" avec {"requete": "Req en retard"}
    Alors l'élément lu a "lignes" égal à []
    Quand Claude appelle "supprimer_requete" avec {"requete": "Req en retard"}
    Alors l'outil répond sans erreur
    Quand Claude appelle "executer_requete" avec {"requete": "Req en retard"}
    Alors l'outil refuse en disant "Requête inconnue"
    Et le journal de la requête "Req en retard" contient "requete_enregistree, requete_modifiee, requete_supprimee" par "claude"

  Scénario: Une requête qui écrit ou qui est fausse ne s'enregistre pas
    Quand Claude appelle "enregistrer_requete" avec {"nom": "Req pirate", "sql": "WITH x AS (SELECT 1) DELETE FROM elements"}
    Alors l'outil refuse en disant "DELETE"
    Quand Claude appelle "enregistrer_requete" avec {"nom": "Req fautive", "sql": "SELECT colonne_inconnue FROM v_elements"}
    Alors l'outil refuse en disant "SQLite refuse la requête"
    Quand Claude appelle "lister_requetes"
    Alors la liste des requêtes ne contient ni "Req pirate" ni "Req fautive"
