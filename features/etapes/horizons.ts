// Les phrases des horizons (features/horizons.feature), jouées dans le navigateur.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';
import { creer } from './kanban';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

const colonne = (monde: Monde, nom: string): Locator => page(monde).locator('#horizons').getByRole('region', { name: nom, exact: true });
const titreDans = (zone: Locator, titre: string): Locator => zone.getByRole('button', { name: titre, exact: true });

Given("l'objectif {string} existe avec l'horizon {string}", async function (this: Monde, titre: string, horizon: string) {
  await creer(this, { titre, type: 'objectif', horizon });
});

Given("la tâche {string} existe avec l'horizon {string}", async function (this: Monde, titre: string, horizon: string) {
  await creer(this, { titre, horizon });
});

When("j'ouvre les horizons", async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Horizons' }).click();
  await expect(page(this).locator('#horizons')).toBeVisible();
});

When("j'avance la colonne {string}", async function (this: Monde, nom: string) {
  await colonne(this, nom).getByRole('button', { name: `${nom} suivant` }).click();
});

Then('la colonne {string} montre {string}', async function (this: Monde, nom: string, titre: string) {
  await expect(titreDans(colonne(this, nom), titre)).toBeVisible();
});

Then('la colonne {string} ne montre pas {string}', async function (this: Monde, nom: string, titre: string) {
  await expect(colonne(this, nom)).toBeVisible();
  await expect(titreDans(colonne(this, nom), titre)).toHaveCount(0);
});

Then("l'adresse garde les décalages {string}", async function (this: Monde, decalages: string) {
  await expect.poll(() => new URL(page(this).url()).searchParams.get('decalages')).toBe(decalages);
});

When("j'ajoute {string} dans la colonne {string}", async function (this: Monde, titre: string, nom: string) {
  const cree = page(this).waitForResponse((r) => r.request().method() === 'POST' && r.url().endsWith('/api/elements'));
  const champ = colonne(this, nom).getByLabel(`Ajouter à ${nom}`);
  await champ.fill(titre);
  await champ.press('Enter');
  expect((await cree).status()).toBe(201);
});

Then('les horizons dépassés montrent {string} pour {string}', async function (this: Monde, titre: string, libelle: string) {
  const zone = page(this).locator('#horizons').getByRole('region', { name: 'Horizon dépassé, pas fait' });
  await expect(zone.locator('li').filter({ has: page(this).getByRole('button', { name: titre, exact: true }) }).locator('small')).toHaveText(libelle);
});
