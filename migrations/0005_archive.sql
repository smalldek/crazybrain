-- Migration 0005 (tâche 1.5) : supprimer une tâche l'archive. Elle sort des listes mais reste en
-- base, avec son histoire, et peut se restaurer.
ALTER TABLE elements ADD COLUMN archive_le TEXT; -- date ISO 8601 en UTC, ou NULL
CREATE INDEX elements_actifs ON elements (archive_le, cree_le);
