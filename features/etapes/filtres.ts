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
