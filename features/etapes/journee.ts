// Les phrases du mode journée (features/journee.feature), jouées dans le navigateur.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';
import { creer } from './kanban';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

const section = (monde: Monde, nom: string): Locator => page(monde).locator('#journee').getByRole('region', { name: nom });
/** Clique, et attend que le serveur ait enregistré (un rechargement juste après couperait l'envoi). */
async function cliquerEtEnregistrer(monde: Monde, bouton: Locator): Promise<void> {
  const enregistre = page(monde).waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes('/api/elements/'));
  await bouton.click();
  expect((await enregistre).ok()).toBe(true);
}

const ligne = (zone: Locator, titre: string): Locator =>
  zone.locator('li').filter({ has: zone.page().getByRole('button', { name: titre, exact: true }) });

Given("la tâche {string} existe avec l'estimation {int}", async function (this: Monde, titre: string, estimation: number) {
  await creer(this, { titre, estimation });
});

Given('la tâche {string} est prévue le {string}', async function (this: Monde, titre: string, jour: string) {
  await creer(this, { titre, jourPlanifie: jour });
});

When("j'ouvre le mode journée", async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Journée' }).click();
  await expect(page(this).locator('#journee')).toBeVisible();
});

Then('le backlog de la journée montre {string}', async function (this: Monde, titre: string) {
  await expect(ligne(section(this, 'Choisir dans le backlog'), titre)).toHaveCount(1);
});

Then('le backlog de la journée ne montre plus {string}', async function (this: Monde, titre: string) {
  await expect(ligne(section(this, 'Choisir dans le backlog'), titre)).toHaveCount(0);
});

Then('les tâches qui ont glissé montrent {string}', async function (this: Monde, titre: string) {
  await expect(ligne(section(this, 'Prévues avant, pas faites'), titre)).toHaveCount(1);
});

Then('les tâches qui ont glissé ne montrent plus {string}', async function (this: Monde, titre: string) {
  await expect(ligne(page(this).locator('#journee'), titre)).toHaveCount(1); // une seule fois : dans la journée
  await expect(ligne(page(this).locator('#journee ul.du-jour'), titre)).toHaveCount(1);
});

When("je prends {string} pour aujourd'hui", async function (this: Monde, titre: string) {
  await cliquerEtEnregistrer(this, page(this).getByRole('button', { name: `Prendre aujourd’hui : ${titre}`, exact: true }));
});

When("je reprends aujourd'hui {string}", async function (this: Monde, titre: string) {
  await cliquerEtEnregistrer(this, page(this).getByRole('button', { name: `Reprendre aujourd’hui : ${titre}`, exact: true }));
});

When('je retire de la journée {string}', async function (this: Monde, titre: string) {
  await cliquerEtEnregistrer(this, page(this).getByRole('button', { name: `Retirer de la journée : ${titre}`, exact: true }));
});

When('je coche dans la journée {string}', async function (this: Monde, titre: string) {
  await page(this).getByRole('checkbox', { name: `Fait : ${titre}`, exact: true }).check();
});

Then('la journée montre {string} avec {string}', async function (this: Monde, titre: string, info: string) {
  const l = ligne(page(this).locator('#journee ul.du-jour'), titre);
  await expect(l).toHaveCount(1);
  if (info) await expect(l.locator('small')).toContainText(info);
});

Then('dans la journée, {string} est faite', async function (this: Monde, titre: string) {
  await expect(ligne(page(this).locator('#journee ul.du-jour'), titre)).toHaveClass(/fait/);
});
