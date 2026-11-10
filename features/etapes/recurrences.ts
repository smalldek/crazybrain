// Les phrases des tâches récurrentes (features/recurrences.feature).
import { strict as assert } from 'node:assert';
import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from 'playwright/test';
import type { Monde } from '../support/monde';

interface Lu { id: string; titre: string; statut: string; echeance: string | null; jourPlanifie: string | null; recurrence: string | null }
const ids = new Map<string, string>();
const suivantes = new WeakMap<Monde, string | null>();
const cochees = new WeakMap<Monde, string>();

async function creer(monde: Monde, corps: Record<string, unknown>): Promise<string> {
  await monde.appeler('/api/elements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) });
  assert.equal(monde.reponse?.status, 201, JSON.stringify(monde.corps));
  const id = (monde.corps as { element: { id: string } }).element.id;
  ids.set(String(corps.titre), id);
  return id;
}

async function lire(monde: Monde, id: string): Promise<{ element: Lu; liens: { source: string; cible: string; type: string }[]; tags: { cle: string; valeur: string }[] }> {
  await monde.appeler(`/api/elements/${id}`);
  assert.equal(monde.reponse?.status, 200);
  return monde.corps as never;
}

Given('le projet {string}', async function (this: Monde, titre: string) {
  await creer(this, { titre, type: 'projet' });
});

Given('la tâche {string} du projet {string}, tag {string}, échéance {string}, qui se répète {string}',
  async function (this: Monde, titre: string, projet: string, tag: string, echeance: string, regle: string) {
    const id = await creer(this, { titre, ...(echeance ? { echeance } : {}), ...(regle ? { recurrence: regle } : {}) });
    const poster = async (chemin: string, corps: unknown): Promise<void> => {
      await this.appeler(`/api/elements/${id}/${chemin}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corps) });
      assert.equal(this.reponse?.status, 201, JSON.stringify(this.corps));
    };
    if (projet) await poster('liens', { cible: ids.get(projet), type: 'appartient_a' });
    if (tag) await poster('tags', { tag });
  });

When("je coche par l'API la tâche {string}", async function (this: Monde, titre: string) {
  const id = ids.get(titre) ?? '';
  await this.appeler(`/api/elements/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ statut: 'fait' }) });
  if (this.reponse?.status === 200) {
    suivantes.set(this, (this.corps as { suivante: string | null }).suivante);
    cochees.set(this, id);
  }
});

When('je donne à la tâche {string} la règle {string}', async function (this: Monde, titre: string, regle: string) {
  await this.appeler(`/api/elements/${ids.get(titre) ?? ''}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ recurrence: regle }) });
});

Then('la réponse donne des exemples de règles', function (this: Monde) {
  assert.match((this.corps as { erreur: string }).erreur, /chaque lundi/);
});

Then('la réponse donne la suivante', function (this: Monde) {
  assert.equal(this.reponse?.status, 200, JSON.stringify(this.corps));
  assert.ok(suivantes.get(this), JSON.stringify(this.corps));
});

Then('la réponse ne donne pas de suivante', function (this: Monde) {
  assert.equal(this.reponse?.status, 200, JSON.stringify(this.corps));
  assert.equal(suivantes.get(this), null);
});

Then("la suivante a l'échéance {string} et la règle {string}", async function (this: Monde, echeance: string, regle: string) {
  const { element } = await lire(this, suivantes.get(this) ?? '');
  assert.equal(element.statut, 'a_faire');
  assert.equal(element.echeance, echeance);
  assert.equal(element.recurrence, regle);
});

Then('la suivante appartient au projet {string} et porte le tag {string}', async function (this: Monde, projet: string, tag: string) {
  const id = suivantes.get(this) ?? '';
  const { liens, tags } = await lire(this, id);
  assert.ok(liens.some((l) => l.source === id && l.cible === ids.get(projet) && l.type === 'appartient_a'), JSON.stringify(liens));
  assert.deepEqual(tags.map((t) => (t.valeur ? `${t.cle}:${t.valeur}` : t.cle)), [tag]);
});

Then("la tâche cochée n'a plus de règle", async function (this: Monde) {
  const { element } = await lire(this, cochees.get(this) ?? '');
  assert.equal(element.statut, 'fait');
  assert.equal(element.recurrence, null);
});

Then("la suivante est prévue 3 mois après aujourd'hui, sans échéance", async function (this: Monde) {
  const { element } = await lire(this, suivantes.get(this) ?? '');
  const auj = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
  const [a, m, j] = auj.split('-').map(Number) as [number, number, number];
  const dernier = new Date(Date.UTC(a, m + 3, 0)).getUTCDate();
  const attendu = new Date(Date.UTC(a, m + 2, Math.min(j, dernier))).toISOString().slice(0, 10);
  assert.equal(element.jourPlanifie, attendu);
  assert.equal(element.echeance, null);
  assert.equal(element.recurrence, '3 mois après fait');
});

Then('la page montre {int} tâches {string}, dont une cochée', async function (this: Monde, nombre: number, titre: string) {
  if (!this.page) throw new Error('Pas de navigateur.');
  const lignes = this.page.locator('#liste li').filter({ has: this.page.getByRole('button', { name: titre, exact: true }) });
  await expect(lignes).toHaveCount(nombre);
  await expect(lignes.filter({ has: this.page.locator('input[type=checkbox]:checked') })).toHaveCount(1);
});
