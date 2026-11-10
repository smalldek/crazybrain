# language: fr
Fonctionnalité: Les requêtes en lecture seule (tâche 4.1)
  Claude écrit des requêtes SQL que l'outil rejoue. Une requête ne lit que les vues (v_elements,
  v_tags, v_liens, v_commentaires, v_evenements, v_types) et ne peut rien modifier : toute
  écriture, même déguisée, est refusée, et la base ne bouge pas.

  Scénario: Une lecture rend ses lignes
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Requête : relire Proust"
    Et que je pose le tag "lecture:requete"
    Quand j'essaie la requête "SELECT e.titre FROM v_elements e JOIN v_tags t ON t.element_id = e.id WHERE t.texte = 'lecture:requete'"
    Alors la réponse est 200
    Et la requête rend exactement les titres "Requête : relire Proust"

  Scénario: Un élément supprimé n'est pas dans les vues
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Requête : tâche supprimée"
    Et que je supprime cette tâche
    Quand j'essaie la requête "SELECT titre FROM v_elements WHERE titre = 'Requête : tâche supprimée'"
    Alors la requête rend exactement les titres ""

  Scénario: Toutes les écritures déguisées sont refusées, et la base ne bouge pas
    Étant donné que je suis connecté par Cloudflare Access
    Et que j'ai créé la tâche "Requête : témoin"
    Quand j'essaie chaque écriture déguisée
    Alors chacune est refusée avec une raison
    Et la base n'a pas bougé

  Scénario: Même si la garde laissait passer une écriture, SQLite la refuserait dans son enveloppe
    Alors SQLite refuse "DELETE FROM elements" enveloppée dans une sous-requête
    Et SQLite refuse "WITH x AS (SELECT 1) DELETE FROM elements" enveloppée dans une sous-requête
    Et SQLite refuse "INSERT INTO tags VALUES ('a', 'b', '')" enveloppée dans une sous-requête
    Et SQLite refuse "PRAGMA query_only = OFF" enveloppée dans une sous-requête

  Scénario: Une faute dans la requête est expliquée
    Étant donné que je suis connecté par Cloudflare Access
    Quand j'essaie la requête "SELECT colonne_inconnue FROM v_elements"
    Alors la réponse est 400
    Et la raison du refus contient "SQLite refuse la requête"

  Scénario: Au-delà de 500 lignes, la réponse est coupée et le dit
    Étant donné que je suis connecté par Cloudflare Access
    Quand j'essaie la requête "WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < 600) SELECT i FROM n"
    Alors la requête rend 500 lignes, coupée
