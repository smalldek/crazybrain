-- Migration 0003 (tâche 1.3) : le modèle de données complet d'un élément (docs/architecture.md).

-- Les types d'éléments. Configurables : on en ajoute une ligne. Les statuts restent communs à tous
-- pour l'instant (à faire, en cours, fait).
CREATE TABLE types (
  code    TEXT PRIMARY KEY CHECK (code GLOB '[a-z]*' AND code NOT GLOB '*[^a-z0-9_]*'),
  libelle TEXT NOT NULL,
  ordre   INTEGER NOT NULL
);
INSERT INTO types (code, libelle, ordre) VALUES
  ('projet', 'Projet', 1),
  ('initiative', 'Initiative', 2),
  ('objectif', 'Objectif', 3),
  ('epic', 'Epic', 4),
  ('feature', 'Feature', 5),
  ('tache', 'Tâche', 6);

-- Les nouveaux champs d'un élément. Les tâches existantes deviennent des « tache », le reste vide.
-- Le type n'a pas de clé étrangère : SQLite ne permet pas d'en ajouter une avec une valeur par
-- défaut ; l'API vérifie qu'il existe dans `types`.
ALTER TABLE elements ADD COLUMN type TEXT NOT NULL DEFAULT 'tache';
-- Le parent : l'élément qui le contient. Supprimer le parent n'efface pas l'enfant, il devient sans parent.
ALTER TABLE elements ADD COLUMN parent TEXT REFERENCES elements(id) ON DELETE SET NULL;
ALTER TABLE elements ADD COLUMN description TEXT; -- Markdown
ALTER TABLE elements ADD COLUMN priorite TEXT CHECK (priorite IS NULL OR priorite IN ('basse', 'normale', 'haute', 'urgente'));
ALTER TABLE elements ADD COLUMN jour_planifie TEXT CHECK (jour_planifie IS NULL OR jour_planifie GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
ALTER TABLE elements ADD COLUMN heure_planifiee TEXT CHECK (heure_planifiee IS NULL OR heure_planifiee GLOB '[0-2][0-9]:[0-5][0-9]');
ALTER TABLE elements ADD COLUMN estimation INTEGER CHECK (estimation IS NULL OR estimation > 0); -- minutes
ALTER TABLE elements ADD COLUMN rang REAL;

CREATE INDEX elements_par_parent ON elements (parent);
CREATE INDEX elements_par_type ON elements (type);
