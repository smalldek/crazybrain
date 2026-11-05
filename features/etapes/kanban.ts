// Les phrases du kanban (features/kanban.feature), jouées dans le navigateur.
// Le glisser-déposer se joue comme une personne : appuyer, bouger par petits pas, relâcher.
import { Then, When } from '@cucumber/cucumber';
import { expect, type Locator, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

const colonne = (monde: Monde, nom: string): Locator =>
  page(monde).locator('#kanban').getByRole('region', { name: nom, exact: true });

const carte = (monde: Monde, titre: string): Locator =>
  page(monde).locator('#kanban li').filter({ has: page(monde).getByRole('button', { name: titre, exact: true }) });

/** Le centre d'un élément à l'écran. */
async function centre(l: Locator): Promise<{ x: number; y: number }> {
  const b = await l.boundingBox();
  if (!b) throw new Error('Élément invisible.');
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Glisse à la souris d'un point à un autre, par petits pas (la bibliothèque suit le mouvement). */
async function glisser(monde: Monde, de: { x: number; y: number }, vers: { x: number; y: number }): Promise<void> {
  const souris = page(monde).mouse;
  await souris.move(de.x, de.y);
  await souris.down();
  await souris.move(de.x + 10, de.y + 10, { steps: 3 });
  await souris.move(vers.x, vers.y, { steps: 15 });
  await souris.move(vers.x, vers.y + 2, { steps: 2 });
  await souris.up();
  await page(monde).waitForLoadState('networkidle');
}

When("j'ouvre le kanban", async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Kanban' }).click();
  await expect(page(this).locator('#kanban')).toBeVisible();
});

When('je reviens à la liste', async function (this: Monde) {
  await page(this).getByRole('navigation', { name: 'Vues' }).getByRole('link', { name: 'Liste' }).click();
  await expect(page(this).locator('#liste')).toBeVisible();
});

Then('la carte {string} est dans la colonne {string}', async function (this: Monde, titre: string, nom: string) {
  await expect(colonne(this, nom).getByRole('button', { name: titre, exact: true })).toBeVisible();
});

Then("l'adresse de la page est {string}", async function (this: Monde, chemin: string) {
  await expect.poll(() => new URL(page(this).url()).pathname).toBe(chemin);
});

Then("l'adresse de la page commence par {string}", async function (this: Monde, debut: string) {
  await expect.poll(() => new URL(page(this).url()).pathname.startsWith(debut)).toBe(true);
});

When('je glisse la carte {string} dans la colonne {string}', async function (this: Monde, titre: string, nom: string) {
  await carte(this, titre).scrollIntoViewIfNeeded();
  const de = await centre(carte(this, titre));
  const cible = await colonne(this, nom).locator('ol').boundingBox();
  if (!cible) throw new Error(`Colonne « ${nom} » invisible.`);
  // La colonne s'étend sur toute la hauteur du kanban : on la vise à la hauteur de la carte, sous
  // ses cartes à elle ; la carte se pose à la fin de la colonne.
  await glisser(this, de, { x: cible.x + cible.width / 2, y: de.y });
  await expect(colonne(this, nom).getByRole('button', { name: titre, exact: true })).toBeVisible();
});

When('je glisse la carte {string} sur la carte {string}', async function (this: Monde, titre: string, autre: string) {
  await carte(this, autre).scrollIntoViewIfNeeded();
  await carte(this, titre).scrollIntoViewIfNeeded();
  const b = await carte(this, autre).boundingBox();
  if (!b) throw new Error(`Carte « ${autre} » invisible.`);
  await glisser(this, await centre(carte(this, titre)), { x: b.x + b.width / 2, y: b.y + b.height * 0.75 });
});

Then('dans la colonne {string}, {string} est au-dessus de {string}', async function (this: Monde, nom: string, haut: string, bas: string) {
  await expect.poll(async () => {
    const titres = await colonne(this, nom).locator('.titre-carte').allTextContents();
    return titres.indexOf(haut) >= 0 && titres.indexOf(haut) < titres.indexOf(bas);
  }).toBe(true);
});

// Le doigt : des événements tactiles envoyés au navigateur (protocole de Chrome), comme l'écran
// d'un téléphone les produit. Appui long d'abord : un glissement court fait défiler, il ne prend pas.
When('je glisse au doigt la carte {string} vers la colonne suivante', async function (this: Monde, titre: string) {
  const p = page(this);
  const cdp = await p.context().newCDPSession(p);
  // Comme le pouce : on fait venir la carte à l'écran, puis on vise le bout visible de la colonne
  // voisine, à droite, à la même hauteur (une colonne s'étend sur toute la hauteur du kanban).
  await carte(this, titre).scrollIntoViewIfNeeded();
  const de = await centre(carte(this, titre));
  const voisine = await colonne(this, 'En cours').locator('ol').boundingBox();
  if (!voisine) throw new Error('Colonne « En cours » introuvable.');
  const vers = { x: voisine.x + 15, y: de.y };
  const toucher = async (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number): Promise<void> => {
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  };
  await toucher('touchStart', de.x, de.y);
  await p.waitForTimeout(400);
  for (let i = 1; i <= 15; i++) {
    await toucher('touchMove', de.x + ((vers.x - de.x) * i) / 15, de.y + ((vers.y - de.y) * i) / 15);
    await p.waitForTimeout(16);
  }
  await p.waitForTimeout(100);
  await toucher('touchEnd', vers.x, vers.y);
  await p.waitForLoadState('networkidle');
});

When('je touche la carte {string}', async function (this: Monde, titre: string) {
  await carte(this, titre).getByRole('button', { name: titre, exact: true }).click();
});
