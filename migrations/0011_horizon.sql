-- Migration 0011 (tâche 7.1, décision 007) : l'horizon d'un élément, sous sa forme rangée
-- (2026-11-10, 2026-S46, 2026-11, 2026-T4, 2026, 2020-2029, vie). Le tri du texte suit le temps à
-- l'intérieur d'une échelle ; l'index sert la vue horizons, qui cherche une période.
ALTER TABLE elements ADD COLUMN horizon TEXT;
CREATE INDEX elements_horizon ON elements(horizon) WHERE horizon IS NOT NULL;

DROP VIEW v_elements;
CREATE VIEW v_elements AS
  SELECT id, type, parent, titre, description, statut, priorite, echeance, jour_planifie, heure_planifiee,
         estimation, rang, poids, avancement, rappel, recurrence, horizon, fait_le, cree_le, modifie_le
  FROM elements WHERE archive_le IS NULL;
