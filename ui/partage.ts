// Le partage avec les autres applis d'Android (tâches 5.3 et 5.4), sans React : testé seul
// (tests/unitaires/interface-partage.test.ts).
import type { Element } from './api';

const TITRE_MAX = 200;

/**
 * Ce qu'une autre appli (WhatsApp, le navigateur…) nous partage devient une tâche à créer
 * (tâche 5.4). Android ouvre `/partage?titre=…&texte=…&lien=…` (le `share_target` du manifeste).
 * Le titre : celui donné, sinon la première ligne du texte (coupée à 200 caractères). La
 * description : le reste du texte, puis le lien s'il n'y est pas déjà. Null si rien n'est partagé.
 */
export function lirePartage(p: URLSearchParams): { titre: string; description: string | null } | null {
  const titreDonne = (p.get('titre') ?? '').trim();
  const texte = (p.get('texte') ?? '').trim();
  const lien = (p.get('lien') ?? '').trim();
  let titre = titreDonne;
  let reste = texte;
  if (titre === '') {
    const lignes = texte.split(/\r?\n/);
    titre = (lignes.shift() ?? '').trim();
    reste = lignes.join('\n').trim();
    if (titre === '') { titre = lien; }
  }
  if ([...titre].length > TITRE_MAX) {
    reste = `${titre}\n\n${reste}`.trim();
    titre = `${[...titre].slice(0, TITRE_MAX - 1).join('')}…`;
  }
  const morceaux = [reste, lien && !reste.includes(lien) && titre !== lien ? lien : ''].filter((m) => m !== '');
  if (titre === '') return null;
  return { titre, description: morceaux.length > 0 ? morceaux.join('\n\n') : null };
}

/** Ce qu'on donne au menu de partage d'Android pour un élément (tâche 5.3). */
export function contenuAPartager(e: Element, origine: string): { title: string; text: string; url: string } {
  const lignes = [e.titre];
  if (e.echeance) lignes.push(`Échéance : ${e.echeance.slice(8, 10)}/${e.echeance.slice(5, 7)}/${e.echeance.slice(0, 4)}`);
  if (e.description) lignes.push('', e.description);
  return { title: e.titre, text: lignes.join('\n'), url: `${origine}/e/${encodeURIComponent(e.id)}` };
}
