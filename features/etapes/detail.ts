// Les phrases du panneau de détail (features/detail.feature), jouées dans le navigateur.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

function panneau(monde: Monde): Locator {
  return page(monde).getByRole('complementary', { name: "Détail de l'élément" });
}

/** L'id d'une tâche de la liste, lu sur sa ligne. */
async function idDe(monde: Monde, titre: string): Promise<string> {
  const ligne = page(monde).locator('#liste li').filter({ has: page(monde).getByRole('button', { name: titre, exact: true }) });
  const id = await ligne.getAttribute('data-id');
  if (!id) throw new Error(`Pas d'id pour « ${titre} ».`);
  return id;
}

// Les tâches créées sans passer par la page, par titre.
const creees = new WeakMap<Monde, Map<string, string>>();

Given('la tâche {string} existe', async function (this: Monde, titre: string) {
  // La requête part du navigateur de test, qui porte déjà l'en-tête d'Access.
  const reponse = await page(this).request.post(`${this.worker.adresse}/api/elements`, { data: { titre } });
  expect(reponse.status()).toBe(201);
  const { element } = (await reponse.json()) as { element: { id: string } };
  const ids = creees.get(this) ?? new Map<string, string>();
  ids.set(titre, element.id);
  creees.set(this, ids);
});

When("j'ouvre l'adresse de la tâche {string}", async function (this: Monde, titre: string) {
  const id = creees.get(this)?.get(titre);
  if (!id) throw new Error(`« ${titre} » n'a pas été créée dans ce scénario.`);
  await page(this).goto(`${this.worker.adresse}/e/${id}`);
});

When("j'ouvre l'adresse {string}", async function (this: Monde, chemin: string) {
  await page(this).goto(this.worker.adresse + chemin);
});

When('je touche la flèche de la tâche {string}', async function (this: Monde, titre: string) {
  await page(this).getByRole('button', { name: `Ouvrir « ${titre} »` }).click();
  await expect(panneau(this).getByRole('heading', { name: titre })).toBeVisible();
});

Then('le panneau de détail montre {string}', async function (this: Monde, titre: string) {
  await expect(panneau(this).getByRole('heading', { name: titre })).toBeVisible();
  await expect(panneau(this).getByLabel('Titre')).toHaveValue(titre);
});

Then("l'adresse de la page est celle de la tâche {string}", async function (this: Monde, titre: string) {
  const id = await idDe(this, titre);
  expect(new URL(page(this).url()).pathname).toBe(`/e/${id}`);
});

When('dans le détail je choisis {string} pour {string}', async function (this: Monde, option: string, champ: string) {
  await panneau(this).getByLabel(champ, { exact: true }).selectOption({ label: option });
});

When('dans le détail je remplis {string} avec {string}', async function (this: Monde, champ: string, valeur: string) {
  await panneau(this).getByLabel(champ, { exact: true }).fill(valeur);
});

When("j'enregistre le détail", async function (this: Monde) {
  await panneau(this).getByRole('button', { name: 'Enregistrer' }).click();
  await expect(panneau(this).getByRole('status')).toHaveText('Enregistré.');
});

When("je tente d'enregistrer le détail", async function (this: Monde) {
  await panneau(this).getByRole('button', { name: 'Enregistrer' }).click();
});

Then('le détail dit {string}', async function (this: Monde, texte: string) {
  await expect(panneau(this)).toContainText(texte);
});

Then('dans le détail {string} vaut {string}', async function (this: Monde, champ: string, valeur: string) {
  await expect(panneau(this).getByLabel(champ, { exact: true })).toHaveValue(valeur);
});

Then('dans le détail {string} montre {string}', async function (this: Monde, champ: string, libelle: string) {
  const choisi = panneau(this).getByLabel(champ, { exact: true }).locator('option:checked');
  await expect(choisi).toHaveText(libelle);
});

When('je ferme le détail', async function (this: Monde) {
  await panneau(this).getByRole('button', { name: 'Fermer le détail' }).click();
});

When('je reviens en arrière', async function (this: Monde) {
  await page(this).goBack();
});

Then("le panneau de détail est fermé et l'adresse est celle de la liste", async function (this: Monde) {
  await expect(panneau(this)).toHaveCount(0);
  expect(new URL(page(this).url()).pathname).toBe('/');
});
