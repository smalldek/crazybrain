// Les phrases de l'appli installable (features/appli.feature), jouées dans Chromium.
import { Then } from '@cucumber/cucumber';
import { expect, type Page } from 'playwright/test';
import type { Monde } from '../support/monde';

function page(monde: Monde): Page {
  if (!monde.page) throw new Error('Pas de navigateur : le scénario doit porter le tag @navigateur.');
  return monde.page;
}

Then("le service worker de l'appli est actif", async function (this: Monde) {
  // Le code entre `…` s'exécute dans la page (où existent navigator.serviceWorker et caches).
  const etat = await page(this).evaluate<{ etat?: string; script?: string }>(`(async () => {
    const enregistrement = await navigator.serviceWorker.ready;
    return { etat: enregistrement.active?.state, script: enregistrement.active?.scriptURL };
  })()`);
  expect(etat.etat).toBe('activated');
  expect(etat.script).toMatch(/\/sw\.js$/);
});

Then("le manifeste nomme l'appli {string} avec des icônes de 192 et 512 pixels", async function (this: Monde, nom: string) {
  const p = page(this);
  const lien = await p.locator('link[rel=manifest]').getAttribute('href');
  expect(lien).toBe('/manifest.webmanifest');
  const reponse = await p.request.get(new URL(lien ?? '', p.url()).toString());
  expect(reponse.status()).toBe(200);
  const manifeste = (await reponse.json()) as { name: string; display: string; icons: { src: string; sizes: string; type: string }[] };
  expect(manifeste.name).toBe(nom);
  expect(manifeste.display).toBe('standalone');
  for (const taille of ['192x192', '512x512']) {
    const icone = manifeste.icons.find((i) => i.sizes === taille && i.type === 'image/png');
    expect(icone, `icône ${taille}`).toBeDefined();
    const image = await p.request.get(new URL(icone?.src ?? '', p.url()).toString());
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
  }
});

// Chromium dit lui-même ce qui empêcherait d'installer la page (protocole de débogage, comme les
// outils de développement, onglet « Application »). Une liste vide : l'appli est installable.
Then("Chromium ne trouve aucun obstacle à l'installation", async function (this: Monde) {
  const p = page(this);
  const session = await p.context().newCDPSession(p);
  await expect.poll(async () => {
    const { installabilityErrors } = (await session.send('Page.getInstallabilityErrors')) as { installabilityErrors: { errorId: string }[] };
    return installabilityErrors.map((e) => e.errorId);
  }, { timeout: 10_000 }).toEqual([]);
});

Then("aucune réponse de l'API n'est dans le cache du service worker", async function (this: Monde) {
  const adresses = await page(this).evaluate<string[]>(`(async () => {
    const toutes = [];
    for (const nom of await caches.keys()) {
      for (const requete of await (await caches.open(nom)).keys()) toutes.push(new URL(requete.url).pathname);
    }
    return toutes;
  })()`);
  expect(adresses.length).toBeGreaterThan(0);
  expect(adresses.filter((a) => a.startsWith('/api/'))).toEqual([]);
});
