// Le calendrier (tâche 6.1), sans React : testé seul (tests/unitaires/interface-calendrier.test.ts).
// Les jours s'écrivent AAAA-MM-JJ ; les semaines commencent le lundi.
import type { Element } from './api';

export type Periode = 'semaine' | 'mois';

/** Un élément posé sur un jour : à son échéance, ou au jour où il est prévu. */
export interface Pose {
  readonly element: Element;
  readonly sorte: 'echeance' | 'prevu';
}

const enDate = (jour: string): Date => new Date(`${jour}T00:00:00Z`);
const versJour = (d: Date): string => d.toISOString().slice(0, 10);

export function decaler(jour: string, jours: number): string {
  return versJour(new Date(enDate(jour).getTime() + jours * 86_400_000));
}

/** Le lundi de la semaine de ce jour. */
export function lundi(jour: string): string {
  return decaler(jour, -((enDate(jour).getUTCDay() + 6) % 7));
}

/** Les 7 jours de la semaine, du lundi au dimanche. */
export function semaine(jour: string): string[] {
  const debut = lundi(jour);
  return Array.from({ length: 7 }, (_, i) => decaler(debut, i));
}

/** Les semaines qui couvrent le mois de ce jour (lundi en tête) : 4 à 6 rangées de 7 jours. */
export function mois(jour: string): string[][] {
  const premier = `${jour.slice(0, 7)}-01`;
  const d = enDate(premier);
  const dernier = versJour(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
  const rangees: string[][] = [];
  for (let debut = lundi(premier); debut <= dernier; debut = decaler(debut, 7)) rangees.push(semaine(debut));
  return rangees;
}

/** Le même jour de la période d'avant ou d'après (un mois glissé garde le 1er pour ne pas sauter février). */
export function deplacer(jour: string, periode: Periode, sens: 1 | -1): string {
  if (periode === 'semaine') return decaler(jour, 7 * sens);
  const d = enDate(jour);
  return versJour(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + sens, 1)));
}

/**
 * Les éléments de chaque jour : un élément est posé à son échéance et au jour où il est prévu
 * (deux fois si les deux diffèrent, une seule fois s'ils tombent le même jour). Les supprimés
 * n'apparaissent pas ; dans un jour, ce qui n'est pas fait d'abord, puis par titre.
 */
export function poses(elements: readonly Element[], jours: readonly string[]): Map<string, Pose[]> {
  const parJour = new Map<string, Pose[]>(jours.map((j) => [j, []]));
  for (const e of elements) {
    if (e.archiveLe) continue;
    if (e.jourPlanifie && parJour.has(e.jourPlanifie)) parJour.get(e.jourPlanifie)?.push({ element: e, sorte: 'prevu' });
    if (e.echeance && e.echeance !== e.jourPlanifie && parJour.has(e.echeance)) parJour.get(e.echeance)?.push({ element: e, sorte: 'echeance' });
  }
  for (const liste of parJour.values()) {
    liste.sort((a, b) => Number(a.element.statut === 'fait') - Number(b.element.statut === 'fait')
      || (a.element.heurePlanifiee ?? '99').localeCompare(b.element.heurePlanifiee ?? '99')
      || a.element.titre.localeCompare(b.element.titre, 'fr'));
  }
  return parJour;
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « lundi 10 novembre ». */
export function jourLisible(jour: string): string {
  const d = enDate(jour);
  return `${JOURS[(d.getUTCDay() + 6) % 7] ?? ''} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()] ?? ''}`;
}

/** Le titre de la période : « novembre 2026 », ou « du 9 au 15 novembre 2026 ». */
export function titrePeriode(jour: string, periode: Periode): string {
  const d = enDate(jour);
  if (periode === 'mois') return `${MOIS[d.getUTCMonth()] ?? ''} ${d.getUTCFullYear()}`;
  const [debut, fin] = [enDate(lundi(jour)), enDate(decaler(lundi(jour), 6))];
  const moisDebut = debut.getUTCMonth() !== fin.getUTCMonth() ? ` ${MOIS[debut.getUTCMonth()] ?? ''}` : '';
  return `du ${debut.getUTCDate()}${moisDebut} au ${fin.getUTCDate()} ${MOIS[fin.getUTCMonth()] ?? ''} ${fin.getUTCFullYear()}`;
}

export const JOURS_COURTS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'] as const;
