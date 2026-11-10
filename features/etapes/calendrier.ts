// Les phrases du calendrier (features/calendrier.feature), jouées dans le navigateur.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';
import { creer } from './kanban';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

const calendrier = (monde: Monde) => page(monde).locator('#calendrier');
const aujourdhui = (): string => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());

Given("la tâche {string} est prévue aujourd'hui à {string}", async function (this: Monde, titre: string, heure: string) {
  await creer(this, { titre, jourPlanifie: aujourdhui(), heurePlanifiee: heure });
});

Given('la tâche {string} est prévue le {string} avec l\'échéance {string}', async function (this: Monde, titre: string, jour: string, echeance: string) {
  await creer(this, { titre, jourPlanifie: jour, echeance });
});

When("j'ouvre le calendrier", async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Calendrier' }).click();
  await expect(calendrier(this)).toBeVisible();
});

Given("j'ouvre le calendrier au {string} en mois", async function (this: Monde, jour: string) {
  await page(this).goto(`${this.worker.adresse}/calendrier?periode=mois&jour=${jour}`);
  await expect(calendrier(this)).toBeVisible();
});

Then('la période affichée est {string}', async function (this: Monde, titre: string) {
  await expect(calendrier(this).locator('h2')).toHaveText(titre);
});

/** Le jour d'aujourd'hui, ou un jour nommé : son élément, et sa marque (échéance, prévu, ou l'heure). */
async function montre(monde: Monde, jour: string, titre: string, marque: string): Promise<void> {
  const entree = calendrier(monde).locator(`[data-jour="${jour}"] li`).filter({ has: page(monde).getByRole('button', { name: titre, exact: true }) })
    .filter({ has: page(monde).locator('.marque', { hasText: marque }) });
  await expect(entree).toHaveCount(1);
}

Then("le jour d'aujourd'hui montre {string} avec la marque {string}", async function (this: Monde, titre: string, marque: string) {
  await expect(calendrier(this).locator(`[data-jour="${aujourdhui()}"]`)).toHaveClass(/aujourdhui/);
  await montre(this, aujourdhui(), titre, marque);
});

Then('le jour {string} montre {string} avec la marque {string}', async function (this: Monde, jour: string, titre: string, marque: string) {
  await montre(this, jour, titre, marque);
});

When("j'avance d'une période", async function (this: Monde) {
  await calendrier(this).getByRole('button', { name: 'Période suivante' }).click();
});

When('je recule d\'une période', async function (this: Monde) {
  await calendrier(this).getByRole('button', { name: 'Période précédente' }).click();
});

When('je choisis le jour {string}', async function (this: Monde, jour: string) {
  await calendrier(this).locator(`[data-jour="${jour}"] button.numero`).click();
});

When('je clique sur {string} dans le calendrier', async function (this: Monde, titre: string) {
  await calendrier(this).getByRole('button', { name: titre, exact: true }).first().click();
});

Then("l'adresse garde la période {string} et le jour {string}", async function (this: Monde, periode: string, jour: string) {
  await expect.poll(() => new URL(page(this).url()).searchParams.get('periode')).toBe(periode);
  expect(new URL(page(this).url()).searchParams.get('jour')).toBe(jour);
});
