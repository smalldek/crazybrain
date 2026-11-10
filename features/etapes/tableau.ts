// Les phrases du tableau de bord (features/tableau.feature), jouées dans le navigateur.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';
import { creer } from './kanban';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

const tableau = (monde: Monde) => page(monde).locator('#tableau');

Given("la tâche {string} existe avec l'échéance {string}", async function (this: Monde, titre: string, echeance: string) {
  await creer(this, { titre, echeance });
});

When("j'ouvre le tableau de bord", async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Tableau' }).click();
  await expect(tableau(this)).toBeVisible();
});

Then('le chiffre {string} vaut au moins {int}', async function (this: Monde, libelle: string, minimum: number) {
  const valeur = tableau(this).getByRole('group', { name: libelle, exact: true }).locator('.valeur');
  await expect.poll(async () => Number(await valeur.textContent())).toBeGreaterThanOrEqual(minimum);
});

Then('la semaine en cours compte au moins {int} tâche faite', async function (this: Monde, minimum: number) {
  const derniere = tableau(this).locator('svg.barres g[data-semaine]').last();
  await expect.poll(async () => Number(await derniere.getAttribute('data-nombre'))).toBeGreaterThanOrEqual(minimum);
});

Then('les prochaines échéances montrent {string}', async function (this: Monde, titre: string) {
  await expect(tableau(this).getByRole('region', { name: 'Prochaines échéances' }).getByRole('button', { name: titre })).toBeVisible();
});

Then('la requête {string} montre un tableau avec les colonnes {string}', async function (this: Monde, nom: string, colonnes: string) {
  const article = tableau(this).getByRole('article', { name: nom });
  await expect(article.locator('th')).toHaveText(colonnes.split(', '));
  await expect(article.locator('tbody tr').first()).toBeVisible();
});

When('je vois la requête {string} dans la liste', async function (this: Monde, nom: string) {
  await tableau(this).getByRole('article', { name: nom }).getByRole('button', { name: 'Voir dans la liste' }).click();
  await expect(page(this).locator('#liste')).toBeVisible();
});
