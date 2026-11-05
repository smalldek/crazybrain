// Un vrai navigateur (Chromium, piloté par Playwright) pour les scénarios marqués @navigateur :
// on teste la page comme Adrien s'en sert, sur un écran de téléphone, contre le Worker local.
// Cloudflare Access n'existe pas en local : on ajoute nous-mêmes à chaque requête l'en-tête qu'il
// poserait après la connexion Google, avec un jeton de la serrure de test.
import { After, AfterAll, Before } from '@cucumber/cucumber';
import { chromium, devices, type Browser } from 'playwright';
import type { Monde } from './monde';

let navigateur: Browser | undefined;

// Par défaut un téléphone (Pixel 7) ; un scénario marqué @ordinateur se joue sur un écran large.
Before({ tags: '@navigateur', timeout: 60_000 }, async function (this: Monde, { pickle }) {
  navigateur ??= await chromium.launch();
  const jeton = await this.serrure.jeton();
  const ordinateur = pickle.tags.some((t) => t.name === '@ordinateur');
  this.contexte = await navigateur.newContext({
    ...(ordinateur ? { viewport: { width: 1280, height: 800 } } : devices['Pixel 7']),
    locale: 'fr-FR',
    extraHTTPHeaders: { 'Cf-Access-Jwt-Assertion': jeton },
  });
  this.page = await this.contexte.newPage();
});

After({ tags: '@navigateur' }, async function (this: Monde) {
  await this.contexte?.close();
});

AfterAll(async () => {
  await navigateur?.close();
});
