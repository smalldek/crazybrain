# language: fr
Fonctionnalité: Le modèle complet d'un élément (tâche 1.3)
  Un élément a un type (projet, epic, tâche…), peut être rangé dans un parent, et porte une
  description, une priorité, une planification, une estimation et un rang.

  Scénario: Les types d'éléments sont listés
    Étant donné que je suis connecté par Cloudflare Access
    Quand je demande la liste des types
    Alors les types sont "projet, initiative, objectif, epic, feature, tache"

  Scénario: Une tâche créée sans préciser est une « tache »
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Simple"
    Alors cette tâche, relue, a les valeurs {"type": "tache", "parent": null, "priorite": null}

  Scénario: Créer un projet, puis une tâche rangée dedans avec tous ses champs
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé l'élément {"titre": "Maison", "type": "projet"}
    Quand je crée dans cet élément l'élément {"titre": "Repeindre la cuisine", "priorite": "haute", "description": "Couleur : **vert sauge**", "echeance": "2026-12-15", "jourPlanifie": "2026-12-05", "heurePlanifiee": "09:00", "estimation": 240, "rang": 2}
    Alors la création est acceptée
    Et cette tâche, relue, a les valeurs {"type": "tache", "priorite": "haute", "description": "Couleur : **vert sauge**", "echeance": "2026-12-15", "jourPlanifie": "2026-12-05", "heurePlanifiee": "09:00", "estimation": 240, "rang": 2}
    Et cette tâche, relue, a pour parent le premier élément

  Scénario: Modifier les nouveaux champs, puis les vider
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Préparer la réunion"
    Quand j'envoie à cette tâche la modification {"priorite": "urgente", "estimation": 30, "jourPlanifie": "2026-11-09", "heurePlanifiee": "10:30"}
    Alors la modification est acceptée
    Et cette tâche, relue, a les valeurs {"priorite": "urgente", "estimation": 30, "jourPlanifie": "2026-11-09", "heurePlanifiee": "10:30"}
    Quand j'envoie à cette tâche la modification {"priorite": null, "estimation": null, "jourPlanifie": null}
    Alors cette tâche, relue, a les valeurs {"priorite": null, "estimation": null, "jourPlanifie": null, "heurePlanifiee": null}

  Scénario: Un type ou un parent inconnu est refusé
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Orpheline"
    Quand j'envoie à cette tâche la modification {"type": "sprint"}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"parent": "n-existe-pas"}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"estimation": "deux heures"}
    Alors la modification est refusée comme invalide

  Scénario: Un parent qui ferait une boucle est refusé
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé l'élément {"titre": "Grand-parent", "type": "projet"}
    Et que je crée dans cet élément l'élément {"titre": "Parent", "type": "epic"}
    Et que je crée dans cet élément l'élément {"titre": "Enfant"}
    Quand je range le premier élément dans le dernier
    Alors la modification est refusée comme invalide
    Et le premier élément, relu, n'a pas de parent

  Scénario: Le poids et l'avancement (vue en cercles, tâche 3b.1)
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé l'élément {"titre": "Courir un marathon", "type": "objectif", "poids": 2}
    Alors cette tâche, relue, a les valeurs {"poids": 2, "avancement": null}
    Quand j'envoie à cette tâche la modification {"poids": 0.5, "avancement": 40}
    Alors la modification est acceptée
    Et cette tâche, relue, a les valeurs {"poids": 0.5, "avancement": 40}
    Et le journal de cette tâche contient "element_cree" puis "element_modifie"
    Quand j'envoie à cette tâche la modification {"poids": null, "avancement": null}
    Alors cette tâche, relue, a les valeurs {"poids": null, "avancement": null}

  Scénario: Un poids nul ou un avancement hors de 0 à 100 est refusé
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Mesurée"
    Quand j'envoie à cette tâche la modification {"poids": 0}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"avancement": 101}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"avancement": 12.5}
    Alors la modification est refusée comme invalide
    Quand j'envoie à cette tâche la modification {"poids": "lourd"}
    Alors la modification est refusée comme invalide
