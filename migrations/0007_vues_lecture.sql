-- Migration 0007 (tâche 4.1) : les vues que lisent les requêtes enregistrées. Une requête écrite par
-- Claude ne lit que ces vues, jamais les tables (décision 005) : les tables peuvent changer sans
-- casser les requêtes, et les éléments supprimés (archivés) n'y apparaissent pas.
CREATE VIEW v_elements AS
  SELECT id, type, parent, titre, description, statut, priorite, echeance, jour_planifie, heure_planifiee,
         estimation, rang, poids, avancement, fait_le, cree_le, modifie_le
  FROM elements WHERE archive_le IS NULL;

-- Un tag, et son texte tel qu'on l'écrit : « cle » ou « cle:valeur ».
CREATE VIEW v_tags AS
  SELECT t.element_id, t.cle, t.valeur, CASE WHEN t.valeur = '' THEN t.cle ELSE t.cle || ':' || t.valeur END AS texte
  FROM tags t JOIN elements e ON e.id = t.element_id WHERE e.archive_le IS NULL;

CREATE VIEW v_liens AS
  SELECT l.id, l.source, l.cible, l.type, l.cree_le
  FROM liens l JOIN elements s ON s.id = l.source JOIN elements c ON c.id = l.cible
  WHERE s.archive_le IS NULL AND c.archive_le IS NULL;

CREATE VIEW v_commentaires AS
  SELECT m.id, m.element_id, m.texte, m.auteur, m.cree_le
  FROM commentaires m JOIN elements e ON e.id = m.element_id WHERE e.archive_le IS NULL;

-- Le journal en entier (archivés compris : « qu'est-ce que Claude a supprimé cette semaine ? »).
CREATE VIEW v_evenements AS
  SELECT id, element_id, type, avant, apres, auteur, date FROM evenements;

CREATE VIEW v_types AS
  SELECT code, libelle, ordre FROM types;
