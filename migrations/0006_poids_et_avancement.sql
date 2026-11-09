-- Migration 0006 (tâche 3b.1) : la vue en cercles. Le poids d'un élément parmi ses frères (sa part
-- dans son parent = son poids sur la somme des poids des frères ; NULL compte pour 1), et
-- l'avancement saisi, en pour cent. L'avancement d'un élément qui a des enfants se calcule à
-- l'affichage, il ne s'écrit pas.
ALTER TABLE elements ADD COLUMN poids REAL CHECK (poids IS NULL OR (poids > 0 AND poids <= 1000000));
ALTER TABLE elements ADD COLUMN avancement INTEGER CHECK (avancement IS NULL OR (avancement BETWEEN 0 AND 100));
