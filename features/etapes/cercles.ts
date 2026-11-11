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

Given('le projet de cercles {string} existe', async function (this: Monde, titre: string) {
  await creerNomme(this, { titre, type: 'projet' });
});

Given('la tâche {string} est rattachée à {string}, sans y être rangée', async function (this: Monde, titre: string, projet: string) {
  await creerNomme(this, { titre });
  const reponse = await page(this).request.post(`${this.worker.adresse}/api/elements/${id(this, titre)}/liens`,
    { data: { cible: id(this, projet), type: 'appartient_a' } });
  expect(reponse.status()).toBe(201);
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

/** Le point de l'écran d'un point du dessin (de -100 à 100). */
async function ecranDe(monde: Monde, x: number, y: number): Promise<{ x: number; y: number }> {
  return cercles(monde).locator('g.centre').evaluate((el, [px, py]) => {
    const svg = el.ownerSVGElement;
    const matrice = svg?.getScreenCTM();
    if (!svg) throw new Error('Pas de dessin.');
    if (!matrice) throw new Error('Pas de dessin.');
    const p = svg.createSVGPoint();
    p.x = px ?? 0;
    p.y = py ?? 0;
    const q = p.matrixTransform(matrice);
    return { x: q.x, y: q.y };
  }, [x, y]);
}

/** Le point de l'écran du repère `data-x`, `data-y` d'un élément du dessin (le milieu d'une part, une poignée). */
async function repere(monde: Monde, cible: Locator): Promise<{ x: number; y: number }> {
  // Pendant le mouvement d'un zoom, les parts glissent : on attend qu'elles soient en place.
  await expect(cercles(monde).locator('svg[data-anime]')).toHaveCount(0);
  await expect(cible).toHaveCount(1);
  const x = Number(await cible.getAttribute('data-x'));
  const y = Number(await cible.getAttribute('data-y'));
  return ecranDe(monde, x, y);
}

/** Un point du dessin à l'angle donné (en degrés, 0 en haut, sens des aiguilles d'une montre) et au rayon donné. */
const auPoint = (degres: number, rayon: number): { x: number; y: number } => {
  const a = (degres * Math.PI) / 180;
  return { x: rayon * Math.sin(a), y: -rayon * Math.cos(a) };
};

/** Touche une part en son milieu (le point où s'écrit son titre), comme le ferait un doigt. */
When('je touche la part {string}', async function (this: Monde, titre: string) {
  const ecran = await repere(this, part(this, titre));
  await page(this).mouse.click(ecran.x, ecran.y);
});

/** Tire une poignée de la part choisie jusqu'à un point du dessin, à la souris, en plusieurs pas. */
async function tirer(monde: Monde, poignee: string, x: number, y: number): Promise<void> {
  const depart = await repere(monde, cercles(monde).locator(`g.${poignee}`));
  const arrivee = await ecranDe(monde, x, y);
  const souris = page(monde).mouse;
  await souris.move(depart.x, depart.y);
  await souris.down();
  await souris.move(arrivee.x, arrivee.y, { steps: 10 });
  await souris.up();
}

/** Les rayons de l'anneau d'une part, lus sur le dessin. */
async function rayonsDe(monde: Monde, cible: Locator): Promise<{ interieur: number; exterieur: number }> {
  await expect(cercles(monde).locator('svg[data-anime]')).toHaveCount(0);
  return { interieur: Number(await cible.getAttribute('data-interieur')), exterieur: Number(await cible.getAttribute('data-exterieur')) };
}

When("je tire la frontière de la part choisie jusqu'à {int}°", async function (this: Monde, degres: number) {
  const { interieur, exterieur } = await rayonsDe(this, cercles(this).locator('g.part[aria-pressed="true"]'));
  const q = auPoint(degres, (interieur + exterieur) / 2);
  await tirer(this, 'poignee-frontiere', q.x, q.y);
});

When('je tire le remplissage de la part choisie à {int} %', async function (this: Monde, pourcent: number) {
  const { interieur, exterieur } = await rayonsDe(this, cercles(this).locator('g.part[aria-pressed="true"]'));
  const poignee = cercles(this).locator('g.poignee-avancement');
  // Sur le rayon qui passe par la poignée : la même direction, à la distance voulue du centre.
  const x = Number(await poignee.getAttribute('data-x'));
  const y = Number(await poignee.getAttribute('data-y'));
  const longueur = Math.hypot(x, y);
  const rayon = interieur + ((exterieur - interieur) * pourcent) / 100;
  await tirer(this, 'poignee-avancement', (x / longueur) * rayon, (y / longueur) * rayon);
});

When('je glisse la part {string} au milieu de la part {string}', async function (this: Monde, titre: string, cible: string) {
  const depart = await repere(this, part(this, titre));
  const arrivee = await repere(this, part(this, cible));
  const souris = page(this).mouse;
  await souris.move(depart.x, depart.y);
  await souris.down();
  await souris.move(arrivee.x, arrivee.y, { steps: 12 });
  await expect(cercles(this).locator('.consigne-glisse')).toHaveText(`Ranger dans « ${cible} »`);
  await souris.up();
});

Then('{string} est rangé dans {string}', async function (this: Monde, titre: string, parent: string) {
  await expect.poll(async () => {
    const reponse = await page(this).request.get(`${this.worker.adresse}/api/elements/${id(this, titre)}`);
    return ((await reponse.json()) as { element: { parent: string | null } }).element.parent;
  }).toBe(id(this, parent));
});

When("j'appuie sur {string} dans les cercles", async function (this: Monde, touche: string) {
  await page(this).keyboard.press(touche);
});

Then('la part choisie est {string}', async function (this: Monde, titre: string) {
  await expect(cercles(this).locator('g.part[aria-pressed="true"]')).toHaveAttribute('data-titre', titre);
  await expect(part(this, titre)).toBeFocused();
});

Then('le passage au nouveau centre est animé', async function (this: Monde) {
  // Le mouvement dure un tiers de seconde : on le voit commencer, puis finir.
  await expect(cercles(this).locator('svg[data-anime="oui"]')).toHaveCount(1, { timeout: 2000 });
  await expect(cercles(this).locator('svg[data-anime]')).toHaveCount(0);
});

When('je touche le centre des cercles', async function (this: Monde) {
  // En oignon, le centre est une bande autour des ancêtres : on la touche en haut, pas en son milieu.
  const centre = cercles(this).locator('g.centre');
  const boite = await centre.boundingBox();
  if (boite === null) throw new Error('Pas de centre dessiné');
  await centre.click({ position: { x: boite.width / 2, y: Math.min(6, boite.height / 4) } });
});

Then('la part {string} couvre {int}°', async function (this: Monde, titre: string, degres: number) {
  await expect(part(this, titre)).toHaveAttribute('data-angle', String(degres));
});

Then('la part {string} est un anneau sans couture', async function (this: Monde, titre: string) {
  // Un tour entier se dessine sans trait du centre vers le bord (pas de « L » dans le chemin).
  await expect(cercles(this).locator('svg[data-anime]')).toHaveCount(0);
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

// ——— Éditer sur le cercle (3b.13) ———
const saisie = (monde: Monde): Locator => cercles(monde).locator('.saisie-cercle input');

When('je touche le « + » du centre et je tape {string}', async function (this: Monde, titre: string) {
  await cercles(this).locator('g.ajout-centre').click();
  await saisie(this).fill(titre);
  await saisie(this).press('Enter');
  await expect(part(this, titre)).toHaveCount(1);
});

When('je tape {string} dans la saisie du cercle', async function (this: Monde, titre: string) {
  await expect(saisie(this)).toBeFocused();
  await saisie(this).fill(titre);
  await saisie(this).press('Enter');
  await expect(part(this, titre)).toHaveCount(1);
});

When(/^je touche « (Ajouter un sous-élément|Ajouter à côté|Renommer|Supprimer) » sur le cercle$/, async function (this: Monde, action: string) {
  await cercles(this).locator('.barre-part').getByRole('button', { name: action, exact: true }).click();
});

When('je ferme la saisie du cercle', async function (this: Monde) {
  await saisie(this).press('Escape');
  await expect(saisie(this)).toHaveCount(0);
  // La part choisie reprend la main (pour enchaîner un raccourci) : on l'attend, comme le ferait l'œil.
  const choisie = cercles(this).locator('g.part[aria-pressed="true"]');
  if (await choisie.count() > 0) await expect(choisie).toBeFocused();
});

Then('la part {string} est choisie', async function (this: Monde, titre: string) {
  await expect(cercles(this).locator('g.part[aria-pressed="true"]')).toHaveAttribute('data-titre', titre);
});

Then("la part {string} n'existe plus", async function (this: Monde, titre: string) {
  await expect(part(this, titre)).toHaveCount(0);
});

Then('la saisie du cercle propose {string}', async function (this: Monde, libelle: string) {
  await expect(saisie(this)).toHaveAttribute('aria-label', libelle);
});

/** Une bulle posée sur le cercle reste entière dans l'écran du téléphone (elle débordait à gauche). */
async function tientDansLEcran(monde: Monde, selecteur: string): Promise<void> {
  const bulle = cercles(monde).locator(selecteur);
  await expect(bulle).toBeVisible();
  const boite = await bulle.boundingBox();
  const largeur = page(monde).viewportSize()?.width ?? 0;
  if (boite === null) throw new Error(`${selecteur} : pas de boîte`);
  if (boite.x < 0 || boite.x + boite.width > largeur) {
    throw new Error(`${selecteur} déborde : de ${Math.round(boite.x)} à ${Math.round(boite.x + boite.width)} px, écran de ${largeur} px`);
  }
}

Then("la barre d'actions tient dans l'écran", async function (this: Monde) {
  await tientDansLEcran(this, '.barre-part');
});

Then("la saisie du cercle tient dans l'écran", async function (this: Monde) {
  await tientDansLEcran(this, '.saisie-cercle');
});

// ——— Les retours du 11/11 ———
Then("l'oignon montre « Tout » puis {string} autour du centre", async function (this: Monde, titre: string) {
  await expect(cercles(this).locator('g.oignon .racine')).toHaveAttribute('aria-label', 'Remonter à « Tout »');
  await expect(cercles(this).locator(`g.oignon .anneau-parent[data-titre="${titre}"]`)).toHaveCount(1);
  await expect(cercles(this).locator('g.centre.en-oignon')).toHaveCount(1);
});

When("je touche l'anneau {string} de l'oignon", async function (this: Monde, titre: string) {
  // Une bande est un anneau : on la touche en haut, là où s'écrit son titre.
  const bande = cercles(this).locator(`g.oignon .anneau-parent[data-titre="${titre}"]`);
  const boite = await bande.boundingBox();
  if (boite === null) throw new Error(`Pas d'anneau « ${titre} »`);
  await bande.click({ position: { x: boite.width / 2, y: 3 } });
});

Then("pendant que je tire la frontière de la part choisie jusqu'à {int}°, la valeur dit {string}", async function (this: Monde, degres: number, texte: string) {
  const { interieur, exterieur } = await rayonsDe(this, cercles(this).locator('g.part[aria-pressed="true"]'));
  const q = auPoint(degres, (interieur + exterieur) / 2);
  const depart = await repere(this, cercles(this).locator('g.poignee-frontiere'));
  const arrivee = await ecranDe(this, q.x, q.y);
  const souris = page(this).mouse;
  await souris.move(depart.x, depart.y);
  await souris.down();
  await souris.move(arrivee.x, arrivee.y, { steps: 10 });
  // Le doigt encore posé, la valeur s'affiche au-dessus du cercle.
  await expect(cercles(this).locator('.valeur-geste span')).toHaveText(texte);
  await souris.up();
  await expect(cercles(this).locator('.valeur-geste')).toHaveCount(0);
});

When('je touche « Supprimer » sur le cercle alors que le serveur met {int} secondes à répondre', async function (this: Monde, secondes: number) {
  await page(this).route('**/api/elements/*', async (route) => {
    if (route.request().method() !== 'DELETE') { await route.fallback(); return; }
    await new Promise((r) => setTimeout(r, secondes * 1000));
    await route.fallback();
  });
  await cercles(this).locator('.barre-part').getByRole('button', { name: 'Supprimer', exact: true }).click();
});

Then('la part {string} a disparu sans attendre le serveur', async function (this: Monde, titre: string) {
  // Moins d'une seconde, quand le serveur en met trois : la part quitte l'écran sous le doigt.
  let supprimee = false;
  const reponse = page(this).waitForResponse((r) => r.request().method() === 'DELETE', { timeout: 6000 }).then(() => { supprimee = true; });
  const relecture = page(this).waitForResponse((r) => supprimee && r.url().endsWith('/api/elements') && r.request().method() === 'GET', { timeout: 8000 });
  await expect(part(this, titre)).toHaveCount(0, { timeout: 1000 });
  // Et après la réponse du serveur, la relecture ne la fait pas revenir.
  await reponse;
  await relecture;
  await expect(part(this, titre)).toHaveCount(0);
  await page(this).unroute('**/api/elements/*');
});

When(/^je touche « (Zoomer|Dézoomer|Plein écran) » au-dessus du cercle$/, async function (this: Monde, nom: string) {
  await cercles(this).locator('.outils-loupe').getByRole('button', { name: nom, exact: true }).click();
});

Then(/^le dessin est grossi ([\d,]+) fois$/, async function (this: Monde, facteur: string) {
  await expect(cercles(this).locator('svg.dessin-cercles')).toHaveAttribute('data-zoom', facteur.replace(',', '.'));
});

Then('le cercle est en plein écran', async function (this: Monde) {
  await expect(cercles(this).locator('.zone-dessin')).toHaveClass(/plein-ecran/);
});

Then("le cercle n'est plus en plein écran", async function (this: Monde) {
  await expect(cercles(this).locator('.zone-dessin')).not.toHaveClass(/plein-ecran/);
});
