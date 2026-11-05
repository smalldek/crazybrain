-- Migration 0002 (tâche 1.2) : modifier une tâche.
-- Deux colonnes facultatives : l'échéance (un jour AAAA-MM-JJ) et la date du passage à « fait ».
-- Les tâches existantes les reçoivent vides (NULL) : rien n'est perdu.
ALTER TABLE elements ADD COLUMN echeance TEXT CHECK (echeance IS NULL OR echeance GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
ALTER TABLE elements ADD COLUMN fait_le TEXT; -- date ISO 8601 en UTC
