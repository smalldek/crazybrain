// Fabrique les icônes PNG de l'appli (ui/public/) à partir des SVG, avec le Chromium de Playwright.
// À relancer seulement si le dessin change : `node outils/icones.mjs`. Les PNG sont commités, parce
// qu'Android en a besoin (192 et 512 pixels) et qu'on ne veut pas de navigateur au déploiement.
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const navigateur = await chromium.launch();
const page = await navigateur.newPage();
for (const [source, cible, taille] of [
  ['icone.svg', 'icone-192.png', 192], ['icone.svg', 'icone-512.png', 512],
  ['icone-masquable.svg', 'icone-masquable-512.png', 512], ['icone.svg', 'apple-touch-icon.png', 180],
]) {
  const svg = await readFile(`ui/public/${source}`, 'utf8');
  await page.setViewportSize({ width: taille, height: taille });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${taille}" height="${taille}" `)}</body></html>`);
  await page.locator('svg').screenshot({ path: `ui/public/${cible}`, omitBackground: true });
}
await navigateur.close();
