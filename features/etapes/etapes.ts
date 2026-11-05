// Les phrases des scénarios, reliées au code qui les joue.
import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { VERSION_FORME } from '../../src/domaine/evenement';
import type { Monde } from '../support/monde';

interface TacheLue {
  id: string;
  titre: string;
  statut: string;
  echeance: string | null;
  faitLe: string | null;
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
    assert.equal(ligne.version_forme, VERSION_FORME);
    assert.equal(ligne.date, tache.creeLe);
  },
);

// --- Modifier une tâche (tâche 1.2) ---

function tacheDuScenario(monde: Monde): TacheLue {
  const tache = creees.get(monde);
  assert.ok(tache, 'aucune tâche créée dans ce scénario');
  return tache;
}

async function modifier(monde: Monde, id: string, corps: unknown): Promise<void> {
  await monde.appeler(`/api/elements/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

async function relire(monde: Monde): Promise<TacheLue> {
  const reponse = await monde.appeler(`/api/elements/${tacheDuScenario(monde).id}`);
  assert.equal(reponse.status, 200, JSON.stringify(monde.corps));
  return (monde.corps as { element: TacheLue }).element;
}

async function typesDuJournal(monde: Monde): Promise<string[]> {
  const lignes = await monde.worker.requete<LigneEvenement>(
    `SELECT * FROM evenements WHERE element_id = '${tacheDuScenario(monde).id}' ORDER BY date, rowid`);
  return lignes.map((l) => l.type);
}

Given("j'ai créé la tâche {string}", async function (this: Monde, titre: string) {
  await this.appeler('/api/elements', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ titre }),
  });
  assert.equal(this.reponse?.status, 201, JSON.stringify(this.corps));
  memoriser(this, (this.corps as { element: TacheLue }).element);
});

When('je passe cette tâche au statut {string}', async function (this: Monde, statut: string) {
  await modifier(this, tacheDuScenario(this).id, { statut });
});

When('je renomme cette tâche en {string}', async function (this: Monde, titre: string) {
  await modifier(this, tacheDuScenario(this).id, { titre });
});

When('je renomme la tâche {string} en {string}', async function (this: Monde, id: string, titre: string) {
  await modifier(this, id, { titre });
});

When("je donne à cette tâche l'échéance {string}", async function (this: Monde, echeance: string) {
  await modifier(this, tacheDuScenario(this).id, { echeance });
});

When("je retire l'échéance de cette tâche", async function (this: Monde) {
  await modifier(this, tacheDuScenario(this).id, { echeance: null });
});

When('j\'envoie à cette tâche la modification {}', async function (this: Monde, json: string) {
  await modifier(this, tacheDuScenario(this).id, JSON.parse(json) as unknown);
});

When('je lis cette tâche', async function (this: Monde) {
  await this.appeler(`/api/elements/${tacheDuScenario(this).id}`);
});

Then('la modification est acceptée', function (this: Monde) {
  assert.equal(this.reponse?.status, 200, JSON.stringify(this.corps));
});

Then('la modification est refusée comme invalide', function (this: Monde) {
  assert.equal(this.reponse?.status, 400, JSON.stringify(this.corps));
});

Then('la réponse dit que la tâche est inconnue', function (this: Monde) {
  assert.equal(this.reponse?.status, 404, JSON.stringify(this.corps));
});

Then('cette tâche, relue, a le statut {string} et une date de fin', async function (this: Monde, statut: string) {
  const tache = await relire(this);
  assert.equal(tache.statut, statut);
  assert.ok(tache.faitLe, 'date de fin absente');
});

Then('cette tâche, relue, a le statut {string} et pas de date de fin', async function (this: Monde, statut: string) {
  const tache = await relire(this);
  assert.equal(tache.statut, statut);
  assert.equal(tache.faitLe, null);
});

Then("cette tâche, relue, a l'échéance {string}", async function (this: Monde, echeance: string) {
  assert.equal((await relire(this)).echeance, echeance);
});

Then("cette tâche, relue, n'a pas d'échéance", async function (this: Monde) {
  assert.equal((await relire(this)).echeance, null);
});

Then('la liste des tâches ne contient pas {string}', async function (this: Monde, titre: string) {
  const titres = (await listeDesTaches(this)).map((t) => t.titre);
  assert.ok(!titres.includes(titre), `« ${titre} » encore dans la liste`);
});

Then('le journal de cette tâche ne contient que {string}', async function (this: Monde, type: string) {
  assert.deepEqual(await typesDuJournal(this), [type]);
});

Then('le journal de cette tâche contient {string} puis {string}', async function (this: Monde, premier: string, second: string) {
  assert.deepEqual(await typesDuJournal(this), [premier, second]);
});

Then(
  "le dernier événement a l'avant au statut {string}, l'après au statut {string}, et l'auteur {string}",
  async function (this: Monde, avant: string, apres: string, auteur: string) {
    const lignes = await this.worker.requete<LigneEvenement>(
      `SELECT * FROM evenements WHERE element_id = '${tacheDuScenario(this).id}' ORDER BY date DESC, rowid DESC LIMIT 1`);
    const [ligne] = lignes;
    assert.ok(ligne);
    assert.equal(ligne.type, 'element_modifie');
    assert.equal((JSON.parse(ligne.avant ?? 'null') as TacheLue).statut, avant);
    const etatApres = JSON.parse(ligne.apres ?? 'null') as TacheLue;
    assert.equal(etatApres.statut, apres);
    assert.ok(etatApres.faitLe);
    assert.equal(ligne.auteur, auteur);
    assert.equal(ligne.version_forme, VERSION_FORME);
  },
);

// --- Le modèle complet (tâche 1.3) ---

// Tous les éléments créés dans le scénario, dans l'ordre.
const lignees = new WeakMap<Monde, TacheLue[]>();

function memoriser(monde: Monde, element: TacheLue): void {
  creees.set(monde, element);
  lignees.set(monde, [...(lignees.get(monde) ?? []), element]);
}

async function creerElementJson(monde: Monde, corps: Record<string, unknown>): Promise<void> {
  await monde.appeler('/api/elements', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corps),
  });
  if (monde.reponse?.status === 201) memoriser(monde, (monde.corps as { element: TacheLue }).element);
}

function premier(monde: Monde): TacheLue {
  const tous = lignees.get(monde);
  assert.ok(tous?.[0], 'aucun élément créé dans ce scénario');
  return tous[0];
}

When('je demande la liste des types', async function (this: Monde) {
  await this.appeler('/api/types');
});

Then('les types sont {string}', function (this: Monde, attendus: string) {
  assert.equal(this.reponse?.status, 200);
  const codes = (this.corps as { types: { code: string }[] }).types.map((t) => t.code);
  assert.deepEqual(codes, attendus.split(', '));
});

Given("j'ai créé l'élément {}", async function (this: Monde, json: string) {
  await creerElementJson(this, JSON.parse(json) as Record<string, unknown>);
  assert.equal(this.reponse?.status, 201, JSON.stringify(this.corps));
});

When('je crée dans cet élément l\'élément {}', async function (this: Monde, json: string) {
  const parent = tacheDuScenario(this);
  await creerElementJson(this, { ...(JSON.parse(json) as Record<string, unknown>), parent: parent.id });
});

When('je range le premier élément dans le dernier', async function (this: Monde) {
  await modifier(this, premier(this).id, { parent: tacheDuScenario(this).id });
});

Then('cette tâche, relue, a les valeurs {}', async function (this: Monde, json: string) {
  const tache = (await relire(this)) as unknown as Record<string, unknown>;
  for (const [cle, valeur] of Object.entries(JSON.parse(json) as Record<string, unknown>)) {
    assert.deepEqual(tache[cle], valeur, `champ ${cle}`);
  }
});

Then('cette tâche, relue, a pour parent le premier élément', async function (this: Monde) {
  assert.equal(((await relire(this)) as unknown as { parent: string }).parent, premier(this).id);
});

Then("le premier élément, relu, n'a pas de parent", async function (this: Monde) {
  await this.appeler(`/api/elements/${premier(this).id}`);
  assert.equal((this.corps as { element: { parent: string | null } }).element.parent, null);
});

// --- Liens, tags, commentaires (tâche 1.3) ---

interface LienLu { id: string; source: string; cible: string; type: string }
const derniersLiens = new WeakMap<Monde, LienLu>();

function nieme(monde: Monde, rang: 'premier' | 'deuxième' | 'dernier'): TacheLue {
  const tous = lignees.get(monde) ?? [];
  const element = rang === 'premier' ? tous[0] : rang === 'deuxième' ? tous[1] : tous[tous.length - 1];
  assert.ok(element, `pas de ${rang} élément dans ce scénario`);
  return element;
}

async function postJson(monde: Monde, chemin: string, corps: unknown): Promise<void> {
  await monde.appeler(chemin, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) });
}

async function relireElement(monde: Monde, element: TacheLue): Promise<{ liens: LienLu[]; tags: { cle: string; valeur: string }[]; commentaires: { texte: string; auteur: string }[] }> {
  const reponse = await monde.appeler(`/api/elements/${element.id}`);
  assert.equal(reponse.status, 200, JSON.stringify(monde.corps));
  return monde.corps as { liens: LienLu[]; tags: { cle: string; valeur: string }[]; commentaires: { texte: string; auteur: string }[] };
}

When(/^je lie le (premier|deuxième|dernier) élément au (premier|deuxième|dernier) par "([^"]*)"$/,
  async function (this: Monde, source: 'premier' | 'deuxième' | 'dernier', cible: 'premier' | 'deuxième' | 'dernier', type: string) {
    await postJson(this, `/api/elements/${nieme(this, source).id}/liens`, { cible: nieme(this, cible).id, type });
    if (this.reponse?.status === 201) derniersLiens.set(this, (this.corps as { lien: LienLu }).lien);
  });

When('je retire ce lien', async function (this: Monde) {
  const lien = derniersLiens.get(this);
  assert.ok(lien, 'aucun lien créé');
  await this.appeler(`/api/liens/${lien.id}`, { method: 'DELETE' });
});

Then(/^le (premier|deuxième|dernier) élément, relu, a (\d+) liens? "([^"]*)"$/,
  async function (this: Monde, rang: 'premier' | 'deuxième' | 'dernier', nombre: string, type: string) {
    const { liens } = await relireElement(this, nieme(this, rang));
    assert.equal(liens.filter((l) => l.type === type).length, Number(nombre), JSON.stringify(liens));
  });

Then('la réponse est {int}', function (this: Monde, statut: number) {
  assert.equal(this.reponse?.status, statut, JSON.stringify(this.corps));
});

When('je pose le tag {string}', async function (this: Monde, tag: string) {
  await postJson(this, `/api/elements/${tacheDuScenario(this).id}/tags`, { tag });
});

When('je retire le tag {string}', async function (this: Monde, tag: string) {
  await this.appeler(`/api/elements/${tacheDuScenario(this).id}/tags/${encodeURIComponent(tag)}`, { method: 'DELETE' });
});

Then('cette tâche, relue, a les tags {string}', async function (this: Monde, attendus: string) {
  const { tags } = await relireElement(this, tacheDuScenario(this));
  assert.deepEqual(tags.map((t) => (t.valeur === '' ? t.cle : `${t.cle}:${t.valeur}`)), attendus.split(', '));
});

When('je commente {string}', async function (this: Monde, texte: string) {
  await postJson(this, `/api/elements/${tacheDuScenario(this).id}/commentaires`, { texte });
});

Then('cette tâche, relue, a {int} commentaire de {string} qui dit {string}', async function (this: Monde, nombre: number, auteur: string, texte: string) {
  const { commentaires } = await relireElement(this, tacheDuScenario(this));
  assert.equal(commentaires.length, nombre);
  assert.deepEqual(commentaires.map((c) => [c.auteur, c.texte]), [[auteur, texte]]);
});

Then('le journal de cette tâche contient {string} puis {string} puis {string}', async function (this: Monde, a: string, b: string, c: string) {
  assert.deepEqual(await typesDuJournal(this), [a, b, c]);
});

// --- Supprimer (archiver) une tâche (tâche 1.5) ---

When('je supprime cette tâche', async function (this: Monde) {
  await this.appeler(`/api/elements/${tacheDuScenario(this).id}`, { method: 'DELETE' });
});

When('je supprime la tâche {string}', async function (this: Monde, id: string) {
  await this.appeler(`/api/elements/${encodeURIComponent(id)}`, { method: 'DELETE' });
});

When('je restaure cette tâche', async function (this: Monde) {
  await this.appeler(`/api/elements/${tacheDuScenario(this).id}/restaurer`, { method: 'POST' });
});

Then("cette tâche, relue, a une date d'archivage", async function (this: Monde) {
  assert.ok(((await relire(this)) as unknown as { archiveLe: string | null }).archiveLe);
});
