// Les phrases des requêtes en lecture seule (features/requetes.feature), jouées contre le vrai Worker.
import assert from 'node:assert/strict';
import { Then, When } from '@cucumber/cucumber';
import { LIGNES_MAX } from '../../src/domaine/requete-lecture';
import { ECRITURES_DEGUISEES } from '../support/ecritures-deguisees';
import type { Monde } from '../support/monde';

interface Resultat { colonnes: string[]; lignes: Record<string, unknown>[]; tronque: boolean }

async function essayer(monde: Monde, sql: string): Promise<void> {
  await monde.appeler('/api/requetes/essai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sql }) });
}

/** Ce que contient la base : le nombre de lignes de chaque table, et le schéma entier. */
async function empreinte(monde: Monde): Promise<string> {
  const comptes = await monde.worker.requete<Record<string, number>>(
    `SELECT (SELECT count(*) FROM elements) AS e, (SELECT count(*) FROM tags) AS t, (SELECT count(*) FROM liens) AS l,
            (SELECT count(*) FROM commentaires) AS c, (SELECT count(*) FROM evenements) AS ev, (SELECT count(*) FROM types) AS ty,
            (SELECT group_concat(name || ':' || coalesce(sql, ''), '|') FROM sqlite_master) AS schema,
            (SELECT group_concat(titre || modifie_le, '|') FROM elements) AS contenu`,
  );
  return JSON.stringify(comptes);
}

const avant = new WeakMap<Monde, string>();
const refus = new WeakMap<Monde, { quoi: string; statut: number; corps: unknown }[]>();

When("j'essaie la requête {string}", async function (this: Monde, sql: string) {
  await essayer(this, sql);
});

Then('la requête rend exactement les titres {string}', function (this: Monde, titres: string) {
  assert.equal(this.reponse?.status, 200, JSON.stringify(this.corps));
  const { lignes } = this.corps as Resultat;
  assert.deepEqual(lignes.map((l) => l.titre), titres === '' ? [] : titres.split(', '));
});

When("j'essaie chaque écriture déguisée", async function (this: Monde) {
  avant.set(this, await empreinte(this));
  const vus: { quoi: string; statut: number; corps: unknown }[] = [];
  for (const [quoi, sql] of ECRITURES_DEGUISEES) {
    await essayer(this, sql);
    vus.push({ quoi, statut: this.reponse?.status ?? 0, corps: this.corps });
  }
  refus.set(this, vus);
});

Then('chacune est refusée avec une raison', function (this: Monde) {
  const vus = refus.get(this) ?? [];
  assert.equal(vus.length, ECRITURES_DEGUISEES.length);
  for (const v of vus) {
    assert.equal(v.statut, 400, `${v.quoi} : ${JSON.stringify(v.corps)}`);
    assert.ok(typeof (v.corps as { erreur?: unknown }).erreur === 'string', v.quoi);
  }
});

Then("la base n'a pas bougé", async function (this: Monde) {
  assert.equal(await empreinte(this), avant.get(this));
});

Then('SQLite refuse {string} enveloppée dans une sous-requête', async function (this: Monde, sql: string) {
  await assert.rejects(this.worker.requete(`SELECT * FROM (\n${sql}\n) LIMIT ${LIGNES_MAX + 1}`));
});

Then('la raison du refus contient {string}', function (this: Monde, morceau: string) {
  const { erreur } = this.corps as { erreur: string };
  assert.ok(erreur.includes(morceau), erreur);
});

Then('la requête rend {int} lignes, coupée', function (this: Monde, nombre: number) {
  assert.equal(this.reponse?.status, 200, JSON.stringify(this.corps));
  const r = this.corps as Resultat;
  assert.equal(r.lignes.length, nombre);
  assert.equal(r.tronque, true);
  assert.deepEqual(r.colonnes, ['i']);
});
