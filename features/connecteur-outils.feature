# language: fr
Fonctionnalité: Les outils du connecteur (étape 2)
  Dans une conversation, Claude lit, crée et modifie les tâches d'Adrien par le connecteur.
  Ces scénarios jouent le vrai parcours : OAuth, puis les appels MCP, contre le Worker local.

  Contexte:
    Étant donné que Claude est branché sur Crazybrain par le connecteur

  Scénario: Le connecteur propose tous ses outils
    Alors le connecteur propose les outils "bonjour, chercher_elements, lire_element, creer_elements, modifier_element, supprimer_element, restaurer_element, commenter_element, lier_elements, retirer_lien, tagger_element, retirer_tag, tester_requete, enregistrer_requete, lister_requetes, executer_requete, supprimer_requete, lister_types"

  Scénario: Un Claude qui parle une version plus récente du protocole MCP est servi quand même
    # Constaté le 07/11 dans le journal du connecteur : claude.ai annonçait la version 2026-07-28,
    # que la bibliothèque MCP ne connaît pas encore, et chaque appel était refusé (400).
    Étant donné que Claude parle la version "2026-07-28" du protocole MCP
    Alors le connecteur propose les outils "bonjour, chercher_elements, lire_element, creer_elements, modifier_element, supprimer_element, restaurer_element, commenter_element, lier_elements, retirer_lien, tagger_element, retirer_tag, tester_requete, enregistrer_requete, lister_requetes, executer_requete, supprimer_requete, lister_types"
    Quand Claude appelle "bonjour"
    Alors l'outil répond sans erreur

  Scénario: « Crée trois tâches pour le projet Jardin »
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Jardin", "type": "projet"}]}
    Et Claude appelle "creer_elements" avec {"elements": [{"titre": "Tailler la haie", "projets": ["Jardin"]}, {"titre": "Semer le gazon", "projets": ["jardin"], "echeance": "2027-04-15"}, {"titre": "Réparer la tondeuse", "projets": ["{id:Jardin}"], "tags": ["outil:tondeuse"]}]}
    Alors l'outil a créé 3 éléments
    Quand Claude appelle "chercher_elements" avec {"projet": "Jardin"}
    Alors la recherche trouve exactement "Tailler la haie, Semer le gazon, Réparer la tondeuse"
    Et la page, connectée par Access, montre "Semer le gazon"
    Et le journal de "Tailler la haie" ne contient que des événements de "claude"

  Scénario: « Qu'est-ce qui est en retard ? »
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Retard : payer la facture", "echeance": "2021-03-01"}, {"titre": "Retard : déjà fait", "echeance": "2021-03-01", "statut": "fait"}, {"titre": "Retard : pas encore", "echeance": "2099-01-01"}, {"titre": "Retard : sans date"}]}
    Et Claude appelle "chercher_elements" avec {"enRetard": true}
    Alors la recherche trouve "Retard : payer la facture" et pas "Retard : déjà fait, Retard : pas encore, Retard : sans date"

  Scénario: Chercher par texte, statut, type et tag
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Filtre : lire Proust", "tags": ["lecture", "auteur:proust"]}, {"titre": "Filtre : lire Zola", "tags": ["lecture"]}, {"titre": "Filtre : épopée", "type": "epic"}]}
    Et Claude appelle "chercher_elements" avec {"tags": ["lecture"], "texte": "Filtre"}
    Alors la recherche trouve exactement "Filtre : lire Proust, Filtre : lire Zola"
    Quand Claude appelle "chercher_elements" avec {"tags": ["auteur:proust"]}
    Alors la recherche trouve exactement "Filtre : lire Proust"
    Quand Claude appelle "chercher_elements" avec {"types": ["epic"], "texte": "Filtre"}
    Alors la recherche trouve exactement "Filtre : épopée"

  Scénario: Marquer une tâche faite, la commenter, puis la relire
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Envoyer le dossier"}]}
    Et Claude appelle "modifier_element" avec {"id": "{id:Envoyer le dossier}", "statut": "fait", "priorite": "haute"}
    Alors l'outil répond sans erreur
    Quand Claude appelle "commenter_element" avec {"id": "{id:Envoyer le dossier}", "texte": "Envoyé par mail le 05/11."}
    Et Claude appelle "lire_element" avec {"id": "{id:Envoyer le dossier}"}
    Alors l'élément lu a "statut" égal à "fait"
    Et l'élément lu a "priorite" égal à "haute"
    Quand Claude appelle "chercher_elements" avec {"texte": "Envoyer le dossier"}
    Alors la recherche trouve exactement ""
    Quand Claude appelle "chercher_elements" avec {"texte": "Envoyer le dossier", "inclureFaits": true}
    Alors la recherche trouve exactement "Envoyer le dossier"

  Scénario: « Sur quoi ai-je travaillé ? » : un commentaire, un tag ou un lien comptent comme une modification (tâche 3.9)
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Récent : la cible"}]}
    Et Claude appelle "creer_elements" avec {"elements": [{"titre": "Récent : la première"}]}
    Et Claude appelle "creer_elements" avec {"elements": [{"titre": "Récent : la seconde"}]}
    Et Claude appelle "chercher_elements" avec {"texte": "Récent :", "tri": "modifie", "limite": 1}
    Alors la recherche trouve exactement "Récent : la seconde"
    Quand Claude appelle "commenter_element" avec {"id": "{id:Récent : la première}", "texte": "Relancée."}
    Et Claude appelle "chercher_elements" avec {"texte": "Récent :", "tri": "modifie", "limite": 1}
    Alors la recherche trouve exactement "Récent : la première"
    Quand Claude appelle "tagger_element" avec {"id": "{id:Récent : la seconde}", "tags": ["urgent"]}
    Et Claude appelle "chercher_elements" avec {"texte": "Récent :", "tri": "modifie", "limite": 1}
    Alors la recherche trouve exactement "Récent : la seconde"
    Quand Claude appelle "lier_elements" avec {"source": "{id:Récent : la première}", "cible": "{id:Récent : la cible}", "type": "lie_a"}
    Et Claude appelle "chercher_elements" avec {"texte": "Récent :", "tri": "modifie", "limite": 2}
    Alors la recherche trouve exactement "Récent : la première, Récent : la cible"

  Scénario: Lier, tagger, puis défaire
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Commander le bois"}, {"titre": "Construire la cabane"}]}
    Et Claude appelle "lier_elements" avec {"source": "{id:Commander le bois}", "cible": "{id:Construire la cabane}", "type": "bloque"}
    Alors l'outil répond sans erreur
    Quand Claude appelle "tagger_element" avec {"id": "{id:Construire la cabane}", "tags": ["lieu:jardin", "weekend"]}
    Et Claude appelle "retirer_tag" avec {"id": "{id:Construire la cabane}", "tag": "weekend"}
    Et Claude appelle "lire_element" avec {"id": "{id:Construire la cabane}"}
    Alors l'élément lu a "tags" égal à ["lieu:jardin"]

  Scénario: Supprimer puis restaurer
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Tâche éphémère"}]}
    Et Claude appelle "supprimer_element" avec {"id": "{id:Tâche éphémère}"}
    Et Claude appelle "chercher_elements" avec {"texte": "Tâche éphémère"}
    Alors la recherche trouve exactement ""
    Quand Claude appelle "restaurer_element" avec {"id": "{id:Tâche éphémère}"}
    Et Claude appelle "chercher_elements" avec {"texte": "Tâche éphémère"}
    Alors la recherche trouve exactement "Tâche éphémère"

  Scénario: Les demandes fausses sont refusées avec une explication
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Bonne tâche"}, {"titre": "Mauvaise tâche", "echeance": "2026-02-30"}, {"titre": "Jamais créée"}]}
    Alors l'outil refuse en disant "n'existe pas"
    Et la page, connectée par Access, montre "Bonne tâche"
    Quand Claude appelle "creer_elements" avec {"elements": [{"titre": "Sans projet", "projets": ["Projet fantôme"]}]}
    Alors l'outil refuse en disant "Aucun projet ne s'appelle"
    Quand Claude appelle "modifier_element" avec {"id": "n-existe-pas", "titre": "x"}
    Alors l'outil refuse en disant "Élément inconnu"
    Quand Claude appelle "lier_elements" avec {"source": "{id:Bonne tâche}", "cible": "{id:Bonne tâche}", "type": "lie_a"}
    Alors l'outil refuse en disant "lui-même"
