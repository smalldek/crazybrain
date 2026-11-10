// Les phrases des scénarios de la page, jouées dans le navigateur (Playwright).
// Playwright attend tout seul qu'un élément apparaisse ou change (jusqu'à 5 secondes) : pas de pause à la main.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

/** La ligne de la liste dont le titre est exactement ce texte. */
function ligne(monde: Monde, titre: string): Locator {
  return page(monde).locator('#liste li').filter({ has: page(monde).getByRole('button', { name: titre, exact: true }) });
}

/** Attend que la page ait fini de charger la liste (le message « Chargement… » disparaît). */
async function listeChargee(monde: Monde): Promise<void> {
  await expect(page(monde).locator('#message')).not.toHaveText('Chargement…');
}

Given("j'ouvre la page", async function (this: Monde) {
  await page(this).goto(this.worker.adresse + '/');
  await listeChargee(this);
});

When('je recharge la page', async function (this: Monde) {
  await page(this).reload();
  await listeChargee(this);
});

When('je tape la tâche {string} et j\'appuie sur Entrée', async function (this: Monde, titre: string) {
  await page(this).locator('#titre').fill(titre);
  await page(this).locator('#titre').press('Enter');
  await expect(ligne(this, titre)).toHaveCount(1);
});

When('je coche la tâche {string}', async function (this: Monde, titre: string) {
  await ligne(this, titre).getByRole('checkbox').check();
  await expect(ligne(this, titre)).toHaveClass(/fait/);
});

When('je décoche la tâche {string}', async function (this: Monde, titre: string) {
  await ligne(this, titre).getByRole('checkbox').uncheck();
  await expect(ligne(this, titre)).not.toHaveClass(/fait/);
});

When('je touche le titre {string} et je le remplace par {string}', async function (this: Monde, ancien: string, nouveau: string) {
  await ligne(this, ancien).getByRole('button', { name: ancien, exact: true }).click();
  const champ = page(this).getByRole('textbox', { name: 'Titre de la tâche' });
  await champ.fill(nouveau);
  await champ.press('Enter');
  await expect(ligne(this, nouveau)).toHaveCount(1);
});

When('je touche le titre {string}, je tape {string} puis Échap', async function (this: Monde, titre: string, texte: string) {
  await ligne(this, titre).getByRole('button', { name: titre, exact: true }).click();
  const champ = page(this).getByRole('textbox', { name: 'Titre de la tâche' });
  await champ.fill(texte);
  await champ.press('Escape');
});

When("je donne à la tâche {string} l'échéance {string}", async function (this: Monde, titre: string, jour: string) {
  const date = ligne(this, titre).getByLabel('Échéance');
  await date.fill(jour);
  // Le changement part au serveur, qui renvoie la liste : on attend que la nouvelle ligne la montre.
  await expect(ligne(this, titre).getByLabel('Échéance')).toHaveValue(jour);
  await page(this).waitForLoadState('networkidle');
});

Then('la page montre la tâche {string}', async function (this: Monde, titre: string) {
  await expect(ligne(this, titre)).toHaveCount(1);
});

Then('la page ne montre pas la tâche {string}', async function (this: Monde, titre: string) {
  await expect(ligne(this, titre)).toHaveCount(0);
});

Then('la tâche {string} est cochée et barrée', async function (this: Monde, titre: string) {
  await expect(ligne(this, titre).getByRole('checkbox')).toBeChecked();
  await expect(ligne(this, titre).getByRole('button', { name: titre, exact: true })).toHaveCSS('text-decoration-line', 'line-through');
});

Then("la tâche {string} n'est pas cochée", async function (this: Monde, titre: string) {
  await expect(ligne(this, titre).getByRole('checkbox')).not.toBeChecked();
});

Then('la tâche {string} est après la tâche {string}', async function (this: Monde, apres: string, avant: string) {
  // Relu jusqu'à ce que l'ordre tienne (la liste se redessine après un changement d'adresse).
  const ordre = async (): Promise<string[]> => page(this).locator('#liste li .titre').allTextContents();
  await expect.poll(async () => {
    const titres = await ordre();
    const [i, j] = [titres.indexOf(avant), titres.indexOf(apres)];
    return i >= 0 && j > i;
  }, { message: `« ${apres} » doit venir après « ${avant} » : ${JSON.stringify(await ordre())}` }).toBe(true);
});

Then("la tâche {string} a l'échéance {string}, marquée en retard", async function (this: Monde, titre: string, jour: string) {
  const date = ligne(this, titre).getByLabel('Échéance');
  await expect(date).toHaveValue(jour);
  await expect(date).toHaveClass(/en-retard/);
});

Then("la tâche {string} a l'échéance {string}, pas en retard", async function (this: Monde, titre: string, jour: string) {
  const date = ligne(this, titre).getByLabel('Échéance');
  await expect(date).toHaveValue(jour);
  await expect(date).not.toHaveClass(/en-retard/);
});

When('je supprime la tâche {string} sur la page', async function (this: Monde, titre: string) {
  await ligne(this, titre).getByRole('button', { name: `Supprimer « ${titre} »` }).click();
  await expect(ligne(this, titre)).toHaveCount(0);
});

When("j'annule la suppression", async function (this: Monde) {
  await page(this).locator('#message').getByRole('button', { name: 'Annuler' }).click();
});
