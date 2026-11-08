// Les phrases de la vue en cercles (features/cercles.feature), jouées dans le navigateur.
// Chaque scénario centre la vue sur son propre objectif : la base est partagée par tous les scénarios.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';
import { creer } from './kanban';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

/** Les éléments créés dans ce scénario, par titre. */
const ids = new WeakMap<Monde, Map<string, string>>();
function id(monde: Monde, titre: string): string {
  const trouve = ids.get(monde)?.get(titre);
  if (!trouve) throw new Error(`« ${titre} » n'a pas été créé dans ce scénario.`);
  return trouve;
}
async function creerNomme(monde: Monde, corps: Record<string, unknown> & { titre: string }): Promise<void> {
  const nouveau = await creer(monde, corps);
  const m = ids.get(monde) ?? new Map<string, string>();
  m.set(corps.titre, nouveau);
  ids.set(monde, m);
}

const cercles = (monde: Monde): Locator => page(monde).locator('#cercles');
const part = (monde: Monde, titre: string): Locator => cercles(monde).locator(`g.part[data-titre="${titre}"]`);
const fiche = (monde: Monde): Locator => cercles(monde).locator('.fiche-part');

Given("l'objectif {string} existe", async function (this: Monde, titre: string) {
  await creerNomme(this, { titre, type: 'objectif' });
});

Given(/^"([^"]*)" contient l'objectif "([^"]*)" (?:de poids (\d+)|sans poids)$/,
  async function (this: Monde, parent: string, titre: string, poids: string | undefined) {
    await creerNomme(this, { titre, type: 'objectif', parent: id(this, parent), ...(poids ? { poids: Number(poids) } : {}) });
  });

Given('{string} contient la tâche {string}', async function (this: Monde, parent: string, titre: string) {
  await creerNomme(this, { titre, parent: id(this, parent) });
});

Given('{string} contient la tâche faite {string}', async function (this: Monde, parent: string, titre: string) {
  await creerNomme(this, { titre, parent: id(this, parent), statut: 'fait' });
});

When("j'ouvre les cercles centrés sur {string}", async function (this: Monde, titre: string) {
  await page(this).goto(`${this.worker.adresse}/cercles?centre=${encodeURIComponent(id(this, titre))}`);
  await expect(cercles(this).locator('svg')).toBeVisible();
});

When('je recharge la page des cercles', async function (this: Monde) {
  await page(this).reload();
  await expect(cercles(this).locator('svg')).toBeVisible();
});

When('je reviens en arrière dans les cercles', async function (this: Monde) {
  await page(this).goBack();
});

/** Touche une part en son milieu (le point où s'écrit son titre), comme le ferait un doigt. */
When('je touche la part {string}', async function (this: Monde, titre: string) {
  const g = part(this, titre);
  await expect(g).toHaveCount(1);
  const ecran = await g.evaluate((el) => {
    const svg = el.ownerSVGElement;
    const matrice = svg?.getScreenCTM();
    if (!svg || !matrice) throw new Error('Pas de dessin.');
    const p = svg.createSVGPoint();
    p.x = Number(el.getAttribute('data-x'));
    p.y = Number(el.getAttribute('data-y'));
    const q = p.matrixTransform(matrice);
    return { x: q.x, y: q.y };
  });
  await page(this).mouse.click(ecran.x, ecran.y);
});

When('je touche le centre des cercles', async function (this: Monde) {
  await cercles(this).locator('g.centre').click();
});

Then('la part {string} couvre {int}°', async function (this: Monde, titre: string, degres: number) {
  await expect(part(this, titre)).toHaveAttribute('data-angle', String(degres));
});

Then('la part {string} en est à {int} %', async function (this: Monde, titre: string, pourcent: number) {
  await expect(part(this, titre)).toHaveAttribute('data-avancement', String(pourcent));
});

Then('le centre en est à {string}', async function (this: Monde, texte: string) {
  await expect(cercles(this).locator('g.centre .avancement-centre')).toHaveText(texte);
});

Then('la fiche dit que {string} pèse {string} de son parent', async function (this: Monde, titre: string, pourcent: string) {
  await expect(fiche(this).getByLabel('Titre de la part')).toHaveValue(titre);
  await expect(fiche(this).locator('.part-du-parent')).toHaveText(pourcent);
});

Then('le centre des cercles est {string}', async function (this: Monde, titre: string) {
  await expect(cercles(this).locator('svg')).toHaveAttribute('aria-label', `Cercles de « ${titre} »`);
  await expect.poll(() => new URL(page(this).url()).searchParams.get('centre')).toBe(id(this, titre));
});

Then("le fil d'Ariane dit {string}", async function (this: Monde, texte: string) {
  await expect(page(this).getByRole('navigation', { name: "Fil d'Ariane" })).toHaveText(texte);
});

When("je règle l'avancement à {int}", async function (this: Monde, valeur: number) {
  await fiche(this).getByLabel('Avancement', { exact: true }).fill(String(valeur));
  await page(this).waitForLoadState('networkidle');
});

When("je règle l'importance à {int}", async function (this: Monde, valeur: number) {
  await fiche(this).getByLabel('Importance', { exact: true }).fill(String(valeur));
  await page(this).waitForLoadState('networkidle');
});

When('je coche « Fait » dans la fiche', async function (this: Monde) {
  await fiche(this).getByRole('checkbox', { name: 'Fait' }).check();
  await page(this).waitForLoadState('networkidle');
});

When("j'ajoute le sous-élément {string}", async function (this: Monde, titre: string) {
  const champ = fiche(this).getByLabel('Ajouter : Sous-élément');
  await champ.fill(titre);
  await champ.press('Enter');
  await expect(part(this, titre)).toHaveCount(1);
});

When("j'ajoute à côté {string}", async function (this: Monde, titre: string) {
  const champ = fiche(this).getByLabel('Ajouter : À côté');
  await champ.fill(titre);
  await champ.press('Enter');
  await expect(part(this, titre)).toHaveCount(1);
});

When('je renomme la part en {string}', async function (this: Monde, titre: string) {
  const champ = fiche(this).getByLabel('Titre de la part');
  await champ.fill(titre);
  await champ.press('Enter');
  await expect(part(this, titre)).toHaveCount(1);
});

When('je supprime la part', async function (this: Monde) {
  await fiche(this).getByRole('button', { name: 'Supprimer' }).click();
  await page(this).waitForLoadState('networkidle');
});

When("j'ouvre le détail depuis la fiche", async function (this: Monde) {
  await fiche(this).getByRole('button', { name: 'Détail' }).click();
  await expect(page(this).getByRole('complementary', { name: "Détail de l'élément" })).toBeVisible();
});
