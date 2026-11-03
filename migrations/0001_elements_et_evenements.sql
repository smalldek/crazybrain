-- Migration 0001 : les éléments et le journal des événements (décision 002).
-- Comme une migration Entity Framework : appliquée une fois, dans l'ordre des numéros, jamais modifiée
-- ensuite (on en ajoute une nouvelle). Wrangler note celles déjà appliquées dans la table d1_migrations.

-- L'état courant : ce qu'on lit.
CREATE TABLE elements (
  id         TEXT PRIMARY KEY,
  titre      TEXT NOT NULL CHECK (length(trim(titre)) > 0),
  statut     TEXT NOT NULL,
  cree_le    TEXT NOT NULL, -- date ISO 8601 en UTC
  modifie_le TEXT NOT NULL
);

-- Le journal : une ligne par modification, avec les valeurs avant et après (JSON).
-- Pas de clé étrangère vers elements : le journal doit survivre à la suppression d'un élément.
CREATE TABLE evenements (
  id            TEXT PRIMARY KEY,
  element_id    TEXT NOT NULL,
  type          TEXT NOT NULL,
  version_forme INTEGER NOT NULL,
  avant         TEXT CHECK (avant IS NULL OR json_valid(avant)),
  apres         TEXT CHECK (apres IS NULL OR json_valid(apres)),
  auteur        TEXT NOT NULL,
  date          TEXT NOT NULL
);

CREATE INDEX evenements_par_element ON evenements (element_id, date);
CREATE INDEX elements_par_creation ON elements (cree_le);
