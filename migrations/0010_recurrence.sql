-- Migration 0010 (tâche 5.6) : la règle de récurrence d'une tâche, sous sa forme rangée
-- (« chaque lundi », « 3 mois après fait »). Cocher la tâche crée la suivante.
ALTER TABLE elements ADD COLUMN recurrence TEXT;

DROP VIEW v_elements;
CREATE VIEW v_elements AS
  SELECT id, type, parent, titre, description, statut, priorite, echeance, jour_planifie, heure_planifiee,
         estimation, rang, poids, avancement, rappel, recurrence, fait_le, cree_le, modifie_le
  FROM elements WHERE archive_le IS NULL;
