// Les phrases des scénarios, reliées au code qui les joue.
import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import type { Monde } from '../support/monde';

interface TacheLue {
  id: string;
  titre: string;
  statut: string;
  creeLe: string;
  modifieLe: string;
}

interface LigneEvenement {
  id: string;
  element_id: string;
  type: string;
  version_forme: number;
  avant: string | null;
  apres: string | null;
  auteur: string;
  date: string;
}

async function listeDesTaches(monde: Monde): Promise<TacheLue[]> {
  const reponse = await monde.appeler('/api/elements');
  assert.equal(reponse.status, 200);
  return (monde.corps as { elements: TacheLue[] }).elements;
}

// Le dernier élément créé dans le scénario.
const creees = new WeakMap<Monde, TacheLue>();

Given('je suis connecté par Cloudflare Access', async function (this: Monde) {
  this.jeton = await this.serrure.jeton();
});

Given('je ne suis pas connecté', function (this: Monde) {
  this.jeton = undefined;
});

Given('je présente un jeton signé par une clé inconnue', async function (this: Monde) {
  this.jeton = await this.serrure.jetonEtranger();
});

When('je crée la tâche {string}', async function (this: Monde, titre: string) {
  await this.appeler('/api/elements', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ titre }),
  });
  if (this.reponse?.status === 201) {
    creees.set(this, (this.corps as { element: TacheLue }).element);
  }
});

When('je demande la liste des tâches', async function (this: Monde) {
  await this.appeler('/api/elements');
});

Then('la création est acceptée', function (this: Monde) {
  assert.equal(this.reponse?.status, 201, JSON.stringify(this.corps));
});

Then('la création est refusée comme invalide', function (this: Monde) {
  assert.equal(this.reponse?.status, 400, JSON.stringify(this.corps));
});

Then("l'accès est refusé", function (this: Monde) {
  assert.equal(this.reponse?.status, 403);
});

Then('la liste des tâches contient {string}', async function (this: Monde, titre: string) {
  const titres = (await listeDesTaches(this)).map((t) => t.titre);
  assert.ok(titres.includes(titre), `« ${titre} » absent de la liste : ${JSON.stringify(titres)}`);
});

Then('la liste des tâches ne contient pas de tâche vide', async function (this: Monde) {
  const vides = (await listeDesTaches(this)).filter((t) => t.titre.trim() === '');
  assert.deepEqual(vides, []);
});

Then('le journal contient un événement {string} pour cette tâche', async function (this: Monde, type: string) {
  const tache = creees.get(this);
  assert.ok(tache, "aucune tâche créée dans ce scénario");
  const lignes = await this.worker.requete<LigneEvenement>(
    `SELECT * FROM evenements WHERE element_id = '${tache.id}'`);
  assert.deepEqual(lignes.map((l) => l.type), [type]);
});

Then(
  "cet événement a un avant vide, un après égal à la tâche, et l'auteur {string}",
  async function (this: Monde, auteur: string) {
    const tache = creees.get(this);
    assert.ok(tache, "aucune tâche créée dans ce scénario");
    const [ligne] = await this.worker.requete<LigneEvenement>(
      `SELECT * FROM evenements WHERE element_id = '${tache.id}'`);
    assert.ok(ligne);
    assert.equal(ligne.avant, null);
    assert.deepEqual(JSON.parse(ligne.apres ?? 'null'), tache);
    assert.equal(ligne.auteur, auteur);
    assert.equal(ligne.version_forme, 1);
    assert.equal(ligne.date, tache.creeLe);
  },
);
