// Le tableau de bord (tâche 4.4), sans React : testé seul (tests/unitaires/interface-tableau.test.ts).
// Des chiffres codés (Adrien est seul : pas de tableau configurable, docs/vision.md), calculés sur
// les éléments déjà chargés par la page.
import type { Element } from './api';

/** Le jour AAAA-MM-JJ, `n` jours plus tard (n négatif : plus tôt). */
function plusJours(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Le lundi de la semaine de ce jour. */
export function lundiDe(jour: string): string {
  const jourSemaine = new Date(`${jour}T12:00:00Z`).getUTCDay(); // 0 dimanche … 6 samedi
  return plusJours(jour, -((jourSemaine + 6) % 7));
}

export interface Chiffres {
  readonly aFaire: number;
  readonly enCours: number;
  readonly enRetard: number;
  /** Faites ces 7 derniers jours, aujourd'hui compris. */
  readonly faitesSemaine: number;
  /** Créées ces 7 derniers jours, aujourd'hui compris. */
  readonly creesSemaine: number;
}

/** Les chiffres du haut du tableau. Les projets ne comptent pas : ce sont des conteneurs. */
export function chiffres(elements: readonly Element[], aujourdhui: string): Chiffres {
  const travail = elements.filter((e) => e.type !== 'projet');
  const ilYaSept = plusJours(aujourdhui, -6);
  return {
    aFaire: travail.filter((e) => e.statut === 'a_faire').length,
    enCours: travail.filter((e) => e.statut === 'en_cours').length,
    enRetard: travail.filter((e) => e.statut !== 'fait' && e.echeance !== null && e.echeance < aujourdhui).length,
    faitesSemaine: travail.filter((e) => e.faitLe !== null && e.faitLe.slice(0, 10) >= ilYaSept).length,
    creesSemaine: travail.filter((e) => e.creeLe.slice(0, 10) >= ilYaSept).length,
  };
}

/** Le nombre d'éléments faits chaque semaine (du lundi au dimanche), les `n` dernières, la plus ancienne d'abord. */
export function faitesParSemaine(elements: readonly Element[], aujourdhui: string, n = 8): { lundi: string; nombre: number }[] {
  const derniere = lundiDe(aujourdhui);
  const semaines = Array.from({ length: n }, (_, i) => ({ lundi: plusJours(derniere, -7 * (n - 1 - i)), nombre: 0 }));
  for (const e of elements) {
    const faitLe = e.faitLe;
    if (e.type === 'projet' || faitLe === null) continue;
    const semaine = semaines.find((s) => s.lundi === lundiDe(faitLe.slice(0, 10)));
    if (semaine) semaine.nombre += 1;
  }
  return semaines;
}

/** Les prochaines échéances (pas faites, aujourd'hui ou après), la plus proche d'abord. */
export function prochainesEcheances(elements: readonly Element[], aujourdhui: string, n = 5): Element[] {
  return elements
    .filter((e) => e.statut !== 'fait' && e.echeance !== null && e.echeance >= aujourdhui)
    .sort((a, b) => (a.echeance ?? '').localeCompare(b.echeance ?? '') || a.titre.localeCompare(b.titre, 'fr'))
    .slice(0, n);
}

/** Un jour AAAA-MM-JJ écrit court, « 10/11 ». */
export function jourCourt(jour: string): string {
  return `${jour.slice(8, 10)}/${jour.slice(5, 7)}`;
}
