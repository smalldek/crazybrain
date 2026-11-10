// La garde des requêtes en lecture seule (tâche 4.1) : les lectures passent, toutes les écritures,
// même déguisées, sont refusées. Le même jeu est rejoué contre la vraie base dans features/requetes.feature.
import { describe, expect, it } from 'vitest';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { LIGNES_MAX, verifierLecture } from '../../src/domaine/requete-lecture';
import { ECRITURES_DEGUISEES } from '../../features/support/ecritures-deguisees';

const TABLES = ['elements', 'tags', 'liens', 'commentaires', 'evenements', 'types', 'd1_migrations', 'sqlite_sequence', '_cf_METADATA'];


describe('verifierLecture', () => {
  it.each(ECRITURES_DEGUISEES)('refuse %s', (_quoi, sql) => {
    expect(() => verifierLecture(sql, TABLES)).toThrow(ErreurDomaine);
  });

  it.each([
    "SELECT titre FROM v_elements WHERE statut = 'a_faire'",
    "select replace(titre, 'a', 'b') AS t from v_elements",
    "SELECT * FROM v_elements WHERE titre LIKE '%delete from elements%'",
    'SELECT "titre" FROM v_elements -- les titres',
    `WITH RECURSIVE sous(id) AS (SELECT id FROM v_elements WHERE parent IS NULL
       UNION SELECT e.id FROM v_elements e JOIN sous ON e.parent = sous.id)
     SELECT count(*) AS n FROM sous;`,
    "SELECT e.titre, group_concat(t.texte, ' ') FROM v_elements e LEFT JOIN v_tags t ON t.element_id = e.id GROUP BY e.id",
    "SELECT auteur, count(*) FROM v_evenements WHERE date >= '2026-11-01' GROUP BY auteur",
  ])('accepte %s', (sql) => {
    expect(() => verifierLecture(sql, TABLES)).not.toThrow();
  });

  it('enveloppe la requête dans une sous-requête limitée, sans le point-virgule ni ce qui le suit', () => {
    const r = verifierLecture('SELECT titre FROM v_elements ORDER BY titre; -- fin', TABLES);
    expect(r.texte).toBe('SELECT titre FROM v_elements ORDER BY titre');
    expect(r.sqlExecute).toBe(`SELECT * FROM (\nSELECT titre FROM v_elements ORDER BY titre\n) LIMIT ${LIGNES_MAX + 1}`);
  });

  it('dit pourquoi elle refuse', () => {
    expect(() => verifierLecture('SELECT * FROM elements', TABLES)).toThrow(/vues v_elements/);
    expect(() => verifierLecture('DELETE FROM v_elements', TABLES)).toThrow(/commence par SELECT ou WITH/);
    expect(() => verifierLecture('WITH x AS (SELECT 1) DELETE FROM v_elements', TABLES)).toThrow(/« DELETE » est refusé/);
  });
});
