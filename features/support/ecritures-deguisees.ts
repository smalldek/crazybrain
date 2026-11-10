// Les écritures déguisées (et lectures interdites) que la garde des requêtes doit toutes refuser
// (tâche 4.1). Partagées : les tests unitaires les passent à la garde seule
// (tests/unitaires/requete-lecture.test.ts), les scénarios les envoient au vrai Worker
// (features/requetes.feature) et vérifient que la base n'a pas bougé.

/** Les écritures et lectures interdites, avec ce qu'elles essaient. */
export const ECRITURES_DEGUISEES: readonly (readonly [string, string])[] = [
  ['une suppression franche', 'DELETE FROM elements'],
  ['une insertion', "INSERT INTO tags (element_id, cle, valeur) VALUES ('x', 'a', '')"],
  ['un remplacement', "REPLACE INTO types (code, libelle, ordre) VALUES ('x', 'x', 9)"],
  ['une mise à jour', "UPDATE elements SET titre = 'x'"],
  ['une écriture après une lecture', 'SELECT 1; DELETE FROM elements'],
  ['une écriture après une lecture, en minuscules', 'select 1;delete from elements'],
  ['un point-virgule caché dans un commentaire', 'SELECT 1 /* ; */ ; DROP TABLE elements'],
  ['une écriture derrière un WITH', 'WITH x AS (SELECT 1) DELETE FROM elements'],
  ['une insertion derrière un WITH', "WITH x AS (SELECT 1) INSERT INTO tags SELECT 'a', 'b', ''"],
  ['une parenthèse qui sort de l\'enveloppe', 'SELECT 1) ; DELETE FROM elements; --'],
  ['une parenthèse qui sort sans point-virgule', 'SELECT 1) UNION SELECT 2 FROM (SELECT 3'],
  ['un PRAGMA', 'PRAGMA writable_schema = 1'],
  ['un PRAGMA dans une lecture', "SELECT * FROM pragma_table_info('elements')"],
  ['un ATTACH', "ATTACH DATABASE 'autre.db' AS autre"],
  ['un VACUUM', 'VACUUM'],
  ['une création de table', 'CREATE TABLE pirate (x)'],
  ['la suppression d\'une vue', 'DROP VIEW v_elements'],
  ['un ALTER', 'ALTER TABLE elements ADD COLUMN x'],
  ['une transaction', 'BEGIN; DELETE FROM elements; COMMIT'],
  ['un SAVEPOINT', 'SAVEPOINT a'],
  ['une lecture de table au lieu de vue', 'SELECT * FROM elements'],
  ['une table entre guillemets', 'SELECT * FROM "elements"'],
  ['une table entre crochets', 'SELECT * FROM [elements]'],
  ['une table entre accents graves, en majuscules', 'SELECT * FROM `ELEMENTS`'],
  ['le schéma de la base', 'SELECT * FROM sqlite_master'],
  ['une table de Cloudflare', 'SELECT * FROM _cf_METADATA'],
  ['une chaîne qui cache la fin', "SELECT * FROM v_elements WHERE titre = 'a'; DELETE FROM elements; --'"],
  ['une chaîne non fermée', "SELECT 'a"],
  ['un commentaire non fermé', 'SELECT 1 /* DELETE FROM elements'],
  ['load_extension', "SELECT load_extension('x')"],
  ['un paramètre', 'SELECT * FROM v_elements WHERE id = ?1'],
  ['un paramètre nommé', 'SELECT * FROM v_elements WHERE id = :id'],
  ['RETURNING', 'SELECT 1 RETURNING *'],
  ['une requête vide', '  ;  '],
  ['un VALUES seul', 'VALUES (1)'],
];
