// Les phrases des filtres et du backlog (features/filtres.feature), jouées dans le navigateur.
import { Given, Then, When } from '@cucumber/cucumber';
import { expect, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';
import { creer } from './kanban';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

const filtres = (monde: Monde) => page(monde).getByRole('region', { name: 'Filtres', exact: true });

/** Ouvre la zone des critères si elle est fermée. */
async function ouvrirFiltres(monde: Monde): Promise<void> {
  const bouton = filtres(monde).locator('.bouton-filtres');
  if ((await bouton.getAttribute('aria-expanded')) !== 'true') await bouton.click();
}

/** Les projets créés dans ce scénario, par titre : pour y ranger d'autres éléments. */
const projets = new Map<string, string>();

Given('le projet {string} existe', async function (this: Monde, titre: string) {
  projets.set(titre, await creer(this, { titre, type: 'projet' }));
});

Given('le projet {string} contient le projet {string}', async function (this: Monde, parent: string, titre: string) {
  projets.set(titre, await creer(this, { titre, type: 'projet', parent: projets.get(parent) }));
});

Given('le projet {string} contient la tâche {string}', async function (this: Monde, parent: string, titre: string) {
  await creer(this, { titre, parent: projets.get(parent) });
});

Given('la tâche {string} existe, planifiée le {string}', async function (this: Monde, titre: string, jour: string) {
  await creer(this, { titre, jourPlanifie: jour, priorite: 'urgente' });
});

Given('la tâche {string} existe, déjà faite', async function (this: Monde, titre: string) {
  await creer(this, { titre, statut: 'fait', priorite: 'urgente' });
});

When('je filtre sur le tag {string}', async function (this: Monde, tag: string) {
  await ouvrirFiltres(this);
  const champ = filtres(this).getByLabel('Tag (clé ou clé:valeur)');
  await champ.fill(tag);
  await champ.press('Enter');
  await expect.poll(() => new URL(page(this).url()).searchParams.get('tag')).toBe(tag);
});

When('je cherche {string}', async function (this: Monde, texte: string) {
  await filtres(this).getByRole('searchbox', { name: 'Chercher' }).fill(texte);
  await expect.poll(() => new URL(page(this).url()).searchParams.get('texte')).toBe(texte);
});

When('je filtre « Dans » {string}', async function (this: Monde, titre: string) {
  await ouvrirFiltres(this);
  await filtres(this).getByLabel('Dans', { exact: true }).selectOption({ label: titre });
});

When('je filtre la priorité {string}', async function (this: Monde, priorite: string) {
  await ouvrirFiltres(this);
  await filtres(this).getByLabel('Priorité', { exact: true }).selectOption({ label: priorite });
});

When("j'efface les filtres", async function (this: Monde) {
  await ouvrirFiltres(this);
  await filtres(this).getByRole('button', { name: 'Effacer les filtres' }).click();
  await expect.poll(() => new URL(page(this).url()).search).toBe('');
});

Then('le bouton des filtres dit {string}', async function (this: Monde, texte: string) {
  await expect(filtres(this).locator('.bouton-filtres')).toHaveText(texte);
});

Then('le kanban ne montre pas la carte {string}', async function (this: Monde, titre: string) {
  await expect(page(this).locator('#kanban').getByRole('button', { name: titre, exact: true })).toHaveCount(0);
});

When("j'ouvre le backlog", async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Backlog' }).click();
  await expect(page(this).locator('#liste.backlog')).toBeVisible();
});

// --- Les projets et les releases (tâche 3.8, features/projets.feature) ---

Given('le projet {string} contient la tâche faite {string}', async function (this: Monde, parent: string, titre: string) {
  await creer(this, { titre, parent: projets.get(parent), statut: 'fait' });
});

const vueProjets = (monde: Monde) => page(monde).locator('#projets');
const ligneProjet = (monde: Monde, titre: string) =>
  vueProjets(monde).getByRole('region', { name: 'Projets' }).locator('li')
    .filter({ has: page(monde).getByRole('button', { name: titre, exact: true }) });

When("j'ouvre la vue des projets", async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Projets' }).click();
  await expect(vueProjets(this)).toBeVisible();
});

Then('le projet {string} est en retrait sous {string}', async function (this: Monde, sous: string, parent: string) {
  await expect(ligneProjet(this, sous)).toHaveAttribute('data-profondeur', '1');
  await expect(ligneProjet(this, parent)).toHaveAttribute('data-profondeur', '0');
  const titres = await vueProjets(this).locator('.arbre li .titre').allTextContents();
  expect(titres.indexOf(sous)).toBeGreaterThan(titres.indexOf(parent));
});

Then('le projet {string} en est à {string}', async function (this: Monde, titre: string, compte: string) {
  await expect(ligneProjet(this, titre).locator('.compte')).toHaveText(compte);
});

When('je touche le projet {string}', async function (this: Monde, titre: string) {
  await ligneProjet(this, titre).getByRole('button', { name: titre, exact: true }).click();
});

When('je demande à voir le contenu de {string}', async function (this: Monde, titre: string) {
  await vueProjets(this).getByRole('link', { name: `Voir le contenu de « ${titre} »` }).click();
  await expect(page(this).locator('#liste')).toBeVisible();
});

When('je crée le projet {string}', async function (this: Monde, titre: string) {
  const champ = vueProjets(this).getByLabel('Nouveau projet');
  await champ.fill(titre);
  await champ.press('Enter');
  await expect(champ).toHaveValue('');
});

Then('la vue des projets montre {string}', async function (this: Monde, titre: string) {
  await expect(ligneProjet(this, titre)).toHaveCount(1);
});

const ligneRelease = (monde: Monde, nom: string) =>
  vueProjets(monde).getByRole('region', { name: 'Releases' }).locator('li')
    .filter({ has: page(monde).getByRole('link', { name: nom, exact: true }) });

Then('la release {string} en est à {string}', async function (this: Monde, nom: string, compte: string) {
  await expect(ligneRelease(this, nom).locator('.compte')).toHaveText(compte);
});

When('je touche la release {string}', async function (this: Monde, nom: string) {
  await ligneRelease(this, nom).getByRole('link', { name: nom, exact: true }).click();
  await expect(page(this).locator('#kanban')).toBeVisible();
});

// --- Le tri « modifié récemment » (tâche 3.9) ---

Given('la tâche {string} est commentée', async function (this: Monde, titre: string) {
  const liste = await page(this).request.get(`${this.worker.adresse}/api/elements`);
  const { elements } = (await liste.json()) as { elements: { id: string; titre: string }[] };
  const id = elements.find((e) => e.titre === titre)?.id;
  expect(id, `« ${titre} » absente`).toBeDefined();
  // Quelques millisecondes après la dernière création : sinon les deux dates pourraient être égales.
  await new Promise((r) => setTimeout(r, 5));
  const reponse = await page(this).request.post(`${this.worker.adresse}/api/elements/${id}/commentaires`, { data: { texte: 'Relancée.' } });
  expect(reponse.status()).toBe(201);
});

When('je trie par {string}', async function (this: Monde, ordre: string) {
  await ouvrirFiltres(this);
  await filtres(this).getByLabel('Ordre (liste et backlog)').selectOption({ label: ordre });
  await expect.poll(() => new URL(page(this).url()).searchParams.get('tri')).not.toBeNull();
});

// --- Les requêtes de Claude comme filtres (tâche 4.3) ---

Given('Claude a enregistré la requête {string} qui fait {string}', async function (this: Monde, nom: string, sql: string) {
  const q = (t: string): string => `'${t.replace(/'/g, "''")}'`;
  const maintenant = new Date().toISOString();
  await this.worker.requete(`INSERT INTO requetes (id, nom, description, sql, cree_le, modifie_le)
    VALUES (${q(crypto.randomUUID())}, ${q(nom)}, NULL, ${q(sql)}, ${q(maintenant)}, ${q(maintenant)})`);
});

When('je filtre sur la requête {string}', async function (this: Monde, nom: string) {
  await ouvrirFiltres(this);
  await filtres(this).getByLabel('Requête de Claude').selectOption({ label: nom });
  await expect.poll(() => new URL(page(this).url()).searchParams.get('requete')).not.toBeNull();
});

Then("l'avis de la requête dit {string}", async function (this: Monde, morceau: string) {
  await expect(page(this).locator('#avis-requete')).toContainText(morceau);
});
