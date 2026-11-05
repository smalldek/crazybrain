-- Migration 0004 (tâche 1.3) : les liens entre éléments, les tags clé:valeur, les commentaires.
-- Supprimer un élément supprime ses liens, tags et commentaires (ON DELETE CASCADE) ; le journal,
-- lui, garde tout (pas de clé étrangère sur evenements).

CREATE TABLE liens (
  id      TEXT PRIMARY KEY,
  source  TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  cible   TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  type    TEXT NOT NULL CHECK (type IN ('appartient_a', 'bloque', 'duplique', 'lie_a')),
  cree_le TEXT NOT NULL,
  CHECK (source <> cible),
  UNIQUE (source, cible, type)
);
CREATE INDEX liens_par_cible ON liens (cible, type);

-- Une étiquette simple a une valeur vide ('') plutôt que NULL : la clé primaire reste simple.
CREATE TABLE tags (
  element_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  cle        TEXT NOT NULL,
  valeur     TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (element_id, cle, valeur)
);
CREATE INDEX tags_par_cle ON tags (cle, valeur);

CREATE TABLE commentaires (
  id         TEXT PRIMARY KEY,
  element_id TEXT NOT NULL REFERENCES elements(id) ON DELETE CASCADE,
  texte      TEXT NOT NULL CHECK (length(trim(texte)) > 0), -- Markdown
  auteur     TEXT NOT NULL CHECK (auteur IN ('adrien', 'claude')),
  cree_le    TEXT NOT NULL
);
CREATE INDEX commentaires_par_element ON commentaires (element_id, cree_le);
