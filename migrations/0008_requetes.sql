-- Migration 0008 (tâche 4.2) : les requêtes enregistrées. Claude les écrit par le connecteur ; l'outil
-- les rejoue comme filtres (4.3) et tableaux de bord (4.4). Le SQL ne lit que les vues v_… (décision 005).
-- Le nom est unique sans tenir compte des majuscules : « En retard » et « en retard » sont la même.
CREATE TABLE requetes (
  id          TEXT PRIMARY KEY,
  nom         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  sql         TEXT NOT NULL,
  cree_le     TEXT NOT NULL,
  modifie_le  TEXT NOT NULL
);
