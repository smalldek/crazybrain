// Les phrases du fil de Claude (étape 9), jouées dans le navigateur.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

const fil = (monde: Monde): Locator => page(monde).getByRole('dialog', { name: 'Discuter avec Claude' });
const retour = (monde: Monde, titre: string): Locator =>
  fil(monde).locator('li.retour').filter({ hasText: titre });

Given("j'ouvre la vue {string}", async function (this: Monde, chemin: string) {
  await page(this).goto(this.worker.adresse + chemin);
  await expect(page(this).locator('#message')).not.toHaveText('Chargement…');
});

When("j'ouvre le fil de Claude", async function (this: Monde) {
  if (await fil(this).count() === 0) await page(this).locator('#bouton-claude').click();
  await expect(fil(this)).toBeVisible();
});

When('je ferme le fil', async function (this: Monde) {
  await fil(this).getByRole('button', { name: 'Fermer le fil' }).click();
  await expect(fil(this)).toHaveCount(0);
});

When("j'écris à Claude {string}", async function (this: Monde, texte: string) {
  if (await fil(this).count() === 0) await page(this).locator('#bouton-claude').click();
  await fil(this).getByRole('textbox', { name: 'Ton retour sur cette page' }).fill(texte.replaceAll('\\n', '\n'));
  await fil(this).getByRole('button', { name: 'Envoyer' }).click();
  await expect(fil(this).getByRole('status')).toContainText('Retour gardé');
});

Then('le fil montre le retour {string} en attente de Claude', async function (this: Monde, titre: string) {
  await expect(retour(this, titre)).toHaveCount(1);
  await expect(retour(this, titre).locator('.attente')).toHaveText('En attente de Claude.');
});

Then('le bouton Claude compte {int} retour(s) ouvert(s)', async function (this: Monde, nombre: number) {
  const bouton = page(this).locator('#bouton-claude');
  if (nombre === 0) await expect(bouton.locator('.pastille')).toHaveCount(0);
  else await expect(bouton.locator('.pastille')).toHaveText(String(nombre));
});

Then('le fil montre la réponse de Claude {string}', async function (this: Monde, texte: string) {
  await expect(fil(this).locator('.bulle.claude').filter({ hasText: texte })).toHaveCount(1);
  await expect(fil(this).locator('.attente').first()).toHaveText('Claude a répondu.');
});

When('je marque le retour {string} comme réglé', async function (this: Monde, titre: string) {
  await retour(this, titre).getByRole('button', { name: 'C’est réglé' }).click();
  await expect(fil(this).locator('.retours-faits summary')).toHaveText('1 réglé');
});

When('je continue le retour {string} dans Claude', async function (this: Monde, titre: string) {
  // Claude.ai n'est pas joignable depuis les tests : on retient l'adresse de l'onglet sans le charger.
  await page(this).context().route('https://claude.ai/**', (r) => r.fulfill({ status: 200, body: 'claude.ai' }));
  const onglet = page(this).context().waitForEvent('page');
  await retour(this, titre).getByRole('button', { name: 'Continuer dans Claude' }).click();
  this.ongletClaude = await onglet;
});

Then("un onglet s'ouvre sur une nouvelle conversation claude.ai qui nomme le retour {string}", async function (this: Monde, titre: string) {
  const onglet = this.ongletClaude;
  if (!onglet) throw new Error('Aucun onglet ouvert.');
  await onglet.waitForLoadState();
  const adresse = new URL(onglet.url());
  expect(adresse.origin + adresse.pathname).toBe('https://claude.ai/new');
  const message = adresse.searchParams.get('q') ?? '';
  expect(message).toContain(`« ${titre} »`);
  expect(message).toContain('sur la page Cercles');
  expect(message).toContain('lire_element');
});
