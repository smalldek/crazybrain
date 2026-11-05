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

// --- Liens et commentaires (tâche 3.3) ---

/** Les \n du scénario deviennent de vrais retours à la ligne. */
const lignes = (texte: string): string => texte.replace(/\\n/g, '\n');

When("j'écris le commentaire {string}", async function (this: Monde, texte: string) {
  await panneau(this).getByLabel('Nouveau commentaire').fill(lignes(texte));
  await panneau(this).getByRole('button', { name: 'Commenter' }).click();
  await expect(panneau(this).getByLabel('Nouveau commentaire')).toHaveValue('');
});

Then("le détail montre le commentaire d'Adrien {string}", async function (this: Monde, texte: string) {
  const commentaire = panneau(this).getByRole('region', { name: 'Commentaires' }).locator('li')
    .filter({ hasText: lignes(texte).split('\n')[0] ?? texte });
  await expect(commentaire).toHaveCount(1);
  await expect(commentaire.locator('.entete')).toContainText('Adrien');
  // innerText garde les retours à la ligne (white-space: pre-wrap) : le texte est rendu tel quel.
  expect(await commentaire.locator('.texte').innerText()).toBe(lignes(texte));
});

When('je lie avec {string} la tâche {string}', async function (this: Monde, sorte: string, titre: string) {
  const liens = panneau(this).getByRole('region', { name: 'Liens' });
  await liens.getByLabel('Sorte de lien').selectOption({ label: sorte });
  await liens.getByLabel('Élément à lier').selectOption({ label: titre });
  await liens.getByRole('button', { name: 'Lier' }).click();
});

function lienAffiche(monde: Monde, sorte: string, titre: string): Locator {
  return panneau(monde).getByRole('region', { name: 'Liens' }).locator('li')
    .filter({ hasText: sorte }).filter({ has: page(monde).getByRole('link', { name: titre, exact: true }) });
}

Then('le détail montre le lien {string} vers {string}', async function (this: Monde, sorte: string, titre: string) {
  await expect(lienAffiche(this, sorte, titre)).toHaveCount(1);
});

When('je suis le lien vers {string}', async function (this: Monde, titre: string) {
  await panneau(this).getByRole('region', { name: 'Liens' }).getByRole('link', { name: titre, exact: true }).click();
});

When('je retire le lien {string} vers {string}', async function (this: Monde, sorte: string, titre: string) {
  await lienAffiche(this, sorte, titre).getByRole('button', { name: /^Retirer le lien/ }).click();
});

// --- Tags (tâche 3.6) ---

const blocTags = (monde: Monde): Locator => panneau(monde).getByRole('region', { name: 'Tags' });

When('je tente de poser le tag {string} dans le détail', async function (this: Monde, tag: string) {
  await blocTags(this).getByLabel('Nouveau tag').fill(tag);
  await blocTags(this).getByRole('button', { name: 'Poser' }).click();
});

When('je pose le tag {string} dans le détail', async function (this: Monde, tag: string) {
  await blocTags(this).getByLabel('Nouveau tag').fill(tag);
  await blocTags(this).getByRole('button', { name: 'Poser' }).click();
  await expect(blocTags(this).getByLabel('Nouveau tag')).toHaveValue('');
});

When('je retire le tag {string} dans le détail', async function (this: Monde, tag: string) {
  await blocTags(this).getByRole('button', { name: `Retirer le tag ${tag}` }).click();
  await expect(blocTags(this).getByRole('button', { name: `Retirer le tag ${tag}` })).toHaveCount(0);
});

Then('le détail montre les tags {string}', async function (this: Monde, attendus: string) {
  await expect(blocTags(this).locator('li.tag:not(.tag-projet) span')).toHaveText(attendus.split(', '));
});

Then('le champ des tags propose {string}', async function (this: Monde, tag: string) {
  await expect(blocTags(this).locator(`datalist option[value="${tag}"]`)).toHaveCount(1);
});

Then('le détail montre le projet {string} parmi les tags', async function (this: Monde, titre: string) {
  await expect(blocTags(this).getByRole('link', { name: `projet:${titre}` })).toBeVisible();
});

Then('la carte {string} montre {string}', async function (this: Monde, titre: string, texte: string) {
  const carte = page(this).locator('#kanban li').filter({ has: page(this).getByRole('button', { name: titre, exact: true }) });
  await expect(carte.locator('.etiquette', { hasText: texte })).toBeVisible();
});
