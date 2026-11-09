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

Then('la part {string} est un anneau sans couture', async function (this: Monde, titre: string) {
  // Un tour entier se dessine sans trait du centre vers le bord (pas de « L » dans le chemin).
  const d = await part(this, titre).locator('path.contour').getAttribute('d');
  expect(d).not.toBeNull();
  expect(d).not.toContain('L');
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

// --- Le plan (3b.4) ---

const plan = (monde: Monde): Locator => cercles(monde).getByRole('region', { name: 'Plan' });
const lignePlan = (monde: Monde, titre: string): Locator => plan(monde).locator(`li[data-titre="${titre}"]`);

Then('le plan montre {string}', async function (this: Monde, attendu: string) {
  await expect.poll(async () => (await plan(this).locator('li').evaluateAll((lis) =>
    lis.map((li) => li.getAttribute('data-titre')))).join(', ')).toBe(attendu);
});

When(/^je (?:replie|déplie) "([^"]*)" dans le plan$/, async function (this: Monde, titre: string) {
  await lignePlan(this, titre).locator('button.replier').click();
});

/** Glisse la poignée d'une ligne vers une autre ligne : en son haut (au-dessus) ou en son milieu (dedans). */
async function glisserLigne(monde: Monde, titre: string, cible: string, hauteur: number): Promise<void> {
  const poignee = lignePlan(monde, titre).locator('button.poignee');
  await poignee.scrollIntoViewIfNeeded();
  const de = await poignee.boundingBox();
  const vers = await lignePlan(monde, cible).boundingBox();
  if (!de || !vers) throw new Error('Ligne invisible.');
  const souris = page(monde).mouse;
  const x = de.x + de.width / 2;
  const y = de.y + de.height / 2;
  await souris.move(x, y);
  await souris.down();
  await souris.move(x, y + 10, { steps: 3 });
  await souris.move(x, vers.y + vers.height * hauteur, { steps: 15 });
  await souris.move(x, vers.y + vers.height * hauteur + 1, { steps: 2 });
  await souris.up();
  await page(monde).waitForLoadState('networkidle');
}

When('je glisse dans le plan {string} au-dessus de {string}', async function (this: Monde, titre: string, cible: string) {
  await glisserLigne(this, titre, cible, 0.12);
});

When('je glisse dans le plan {string} dans {string}', async function (this: Monde, titre: string, cible: string) {
  await glisserLigne(this, titre, cible, 0.5);
});

Then('la page dit {string}', async function (this: Monde, texte: string) {
  await expect(page(this).locator('#message')).toHaveText(texte);
});

// --- Les repères (3b.5) ---

Given('{string} contient la tâche {string} à rendre le {string}', async function (this: Monde, parent: string, titre: string, jour: string) {
  await creerNomme(this, { titre, parent: id(this, parent), echeance: jour });
});

Given('{string} porte le tag {string}', async function (this: Monde, titre: string, tag: string) {
  const reponse = await page(this).request.post(`${this.worker.adresse}/api/elements/${id(this, titre)}/tags`, { data: { tag } });
  expect(reponse.status()).toBe(201);
});

When("j'ouvre les cercles centrés sur {string} avec {string}", async function (this: Monde, titre: string, filtre: string) {
  await page(this).goto(`${this.worker.adresse}/cercles?centre=${encodeURIComponent(id(this, titre))}&${filtre}`);
  await expect(cercles(this).locator('svg')).toBeVisible();
});

Then('la part {string} est éclairée', async function (this: Monde, titre: string) {
  await expect(part(this, titre)).not.toHaveClass(/eteinte/);
});

Then('la part {string} est grisée', async function (this: Monde, titre: string) {
  await expect(part(this, titre)).toHaveClass(/eteinte/);
});

Then('la part {string} est marquée en retard', async function (this: Monde, titre: string) {
  await expect(part(this, titre)).toHaveClass(/en-retard/);
});

Then("la part {string} n'est pas marquée en retard", async function (this: Monde, titre: string) {
  await expect(part(this, titre)).not.toHaveClass(/en-retard/);
});

const fichiers = new WeakMap<Monde, string>();

When("j'enregistre l'image des cercles", async function (this: Monde) {
  const [telechargement] = await Promise.all([
    page(this).waitForEvent('download'),
    cercles(this).getByRole('button', { name: 'Enregistrer l’image' }).click(),
  ]);
  const chemin = await telechargement.path();
  const { readFile } = await import('node:fs/promises');
  fichiers.set(this, await readFile(chemin, 'utf8'));
  expect(telechargement.suggestedFilename()).toMatch(/^cercles-.*\.svg$/);
});

Then('le fichier enregistré est un SVG qui contient {string}', function (this: Monde, texte: string) {
  const contenu = fichiers.get(this) ?? '';
  expect(contenu.startsWith('<svg')).toBe(true);
  expect(contenu).toContain(texte);
});

// --- Les compléments (3b.7) ---

Given('{string} contient la tâche {string} avec la description {string}', async function (this: Monde, parent: string, titre: string, description: string) {
  await creerNomme(this, { titre, parent: id(this, parent), description });
});

Then("la part {string} porte l'indicateur de notes", async function (this: Monde, titre: string) {
  await expect(part(this, titre).locator('circle.indicateur')).toHaveCount(1);
});

Then("la part {string} ne porte pas l'indicateur de notes", async function (this: Monde, titre: string) {
  await expect(part(this, titre).locator('circle.indicateur')).toHaveCount(0);
});

Then('la fiche dit que la part pèse {string} du centre', async function (this: Monde, pourcent: string) {
  await expect(fiche(this).locator('.part-du-centre')).toHaveText(pourcent);
});

When('je choisis la couleur {string}', async function (this: Monde, teinte: string) {
  await fiche(this).getByLabel('Couleur').selectOption(teinte);
  await page(this).waitForLoadState('networkidle');
});

const TEINTES = ['bleu', 'orange', 'vert', 'violet', 'jaune', 'turquoise', 'rose', 'gris'];

Then('la part {string} est de la couleur {string}', async function (this: Monde, titre: string, teinte: string) {
  await expect(part(this, titre)).toHaveClass(new RegExp(`\\bbranche-${TEINTES.indexOf(teinte)}\\b`));
});

When("j'égalise les sous-éléments", async function (this: Monde) {
  await cercles(this).getByRole('button', { name: 'Égaliser les sous-éléments' }).click();
  await page(this).waitForLoadState('networkidle');
});

When('je colle la liste {string}', async function (this: Monde, texte: string) {
  await cercles(this).locator('.coller-liste summary').click();
  await cercles(this).getByLabel('Liste à coller').fill(texte.replace(/\\n/g, '\n'));
  await cercles(this).locator('.coller-liste button').click();
  await page(this).waitForLoadState('networkidle');
});

const csvs = new WeakMap<Monde, string>();

When("j'exporte les cercles en CSV", async function (this: Monde) {
  const [telechargement] = await Promise.all([
    page(this).waitForEvent('download'),
    cercles(this).getByRole('button', { name: 'Exporter en CSV' }).click(),
  ]);
  const { readFile } = await import('node:fs/promises');
  csvs.set(this, await readFile(await telechargement.path(), 'utf8'));
  expect(telechargement.suggestedFilename()).toMatch(/^cercles-.*\.csv$/);
});

Then('le fichier CSV contient la ligne {string}', function (this: Monde, ligne: string) {
  expect((csvs.get(this) ?? '').split('\r\n')).toContain(ligne);
});

Then('la ligne {string} du plan est éclairée', async function (this: Monde, titre: string) {
  await expect(plan(this).locator(`li[data-titre="${titre}"]`)).not.toHaveClass(/eteinte/);
});

Then('la ligne {string} du plan est grisée', async function (this: Monde, titre: string) {
  await expect(plan(this).locator(`li[data-titre="${titre}"]`)).toHaveClass(/eteinte/);
});
