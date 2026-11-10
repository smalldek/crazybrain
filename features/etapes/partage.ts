// Les phrases du partage (features/partage.feature), jouées dans Chromium.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

/** Dans le texte du scénario, « \n » est un retour à la ligne. */
const lignes = (texte: string): string => texte.replace(/\\n/g, '\n');

Then('le manifeste reçoit les partages sur {string} avec titre, texte et lien', async function (this: Monde, action: string) {
  const reponse = await page(this).request.get(`${this.worker.adresse}/manifest.webmanifest`);
  const manifeste = (await reponse.json()) as { share_target?: { action: string; method: string; params: Record<string, string> } };
  expect(manifeste.share_target).toEqual({ action, method: 'GET', params: { title: 'titre', text: 'texte', url: 'lien' } });
});

// Ce que fait Android quand on choisit Crazybrain dans le menu de partage d'une autre appli.
When('une autre appli partage le texte {string} et le lien {string}', async function (this: Monde, texte: string, lien: string) {
  const p = new URLSearchParams({ titre: '', texte: lignes(texte), lien });
  await page(this).goto(`${this.worker.adresse}/partage?${p.toString()}`);
  await expect(page(this).locator('#message')).not.toHaveText('Chargement…');
});

Then('la saisie contient {string}', async function (this: Monde, titre: string) {
  await expect(page(this).locator('#titre')).toHaveValue(titre);
});

Then('la page annonce la description partagée', async function (this: Monde) {
  await expect(page(this).locator('#partage')).toContainText('Ils ferment');
});

When("j'appuie sur Entrée dans la saisie", async function (this: Monde) {
  await page(this).locator('#titre').press('Enter');
  await expect(page(this).locator('#titre')).toHaveValue('');
});

Then('la tâche {string} a pour description {string}', async function (this: Monde, titre: string, description: string) {
  const reponse = await page(this).request.get(`${this.worker.adresse}/api/elements`);
  const { elements } = (await reponse.json()) as { elements: { titre: string; description: string | null }[] };
  expect(elements.find((e) => e.titre === titre)?.description).toBe(lignes(description));
});

// Chromium sans écran n'a pas de vrai menu de partage : on le remplace par un faux qui note ce qu'il reçoit.
Given('le téléphone a un menu de partage', async function (this: Monde) {
  await page(this).addInitScript(`
    window.__partages = [];
    navigator.share = async (contenu) => { window.__partages.push(contenu); };
  `);
});

When('je touche « Partager » dans le détail', async function (this: Monde) {
  await page(this).getByRole('complementary', { name: "Détail de l'élément" }).getByRole('button', { name: 'Partager' }).click();
});

Then("le menu de partage a reçu {string} avec l'adresse de la tâche", async function (this: Monde, titre: string) {
  const partages = await page(this).evaluate<{ title: string; text: string; url: string }[]>('window.__partages');
  expect(partages).toHaveLength(1);
  expect(partages[0]?.title).toBe(titre);
  expect(partages[0]?.text).toContain(titre);
  expect(partages[0]?.url).toBe(new URL(page(this).url()).origin + new URL(page(this).url()).pathname);
});
