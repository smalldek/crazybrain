// Les créneaux de la journée (tâche 6.3) : caser ses tâches du jour à une heure, et voir le temps
// prévu face au temps disponible. Une tâche casée a une heure (son « À ») ; son créneau dure son
// estimation (30 minutes si elle n'en a pas). Ici, le calcul, sans React ; les heures sont « HH:MM ».
import type { Element } from './api';

/** Les heures de travail de la journée : de `debut` à `fin`. */
export interface Plage { readonly debut: string; readonly fin: string }

export const PLAGE_PAR_DEFAUT: Plage = { debut: '09:00', fin: '18:00' };
/** La durée d'un créneau dont la tâche n'a pas d'estimation. */
export const DUREE_PAR_DEFAUT = 30;

export interface Creneau {
  readonly element: Element;
  readonly debut: number;
  readonly fin: number;
  /** Il empiète sur un autre créneau. */
  readonly chevauche: boolean;
}

export const minutes = (heure: string): number => Number(heure.slice(0, 2)) * 60 + Number(heure.slice(3, 5));
export const heure = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const dureeDe = (e: Element): number => e.estimation ?? DUREE_PAR_DEFAUT;

/** Le temps disponible : de maintenant (ou du début, s'il n'est pas encore là) à la fin, jamais négatif. */
export function disponible(plage: Plage, maintenant: string): number {
  return Math.max(0, minutes(plage.fin) - Math.max(minutes(plage.debut), minutes(maintenant)));
}

/** Les créneaux des tâches casées et pas faites, dans l'ordre de l'heure, avec ceux qui se chevauchent. */
export function creneaux(taches: readonly Element[]): Creneau[] {
  const poses = taches
    .filter((e) => e.heurePlanifiee !== null && e.statut !== 'fait')
    .map((e) => ({ element: e, debut: minutes(e.heurePlanifiee ?? '00:00'), fin: minutes(e.heurePlanifiee ?? '00:00') + dureeDe(e) }))
    .sort((a, b) => a.debut - b.debut || a.fin - b.fin);
  return poses.map((c) => ({ ...c, chevauche: poses.some((o) => o !== c && o.debut < c.fin && c.debut < o.fin) }));
}

/**
 * Case à la suite les tâches pas faites qui n'ont pas d'heure, dans l'ordre reçu : chacune au
 * premier moment libre assez long, à partir de maintenant (arrondi aux 5 minutes) ou du début de la
 * journée, et avant sa fin. Rend l'heure de chacune ; celles qui ne tiennent plus n'en ont pas.
 */
export function caserALaSuite(taches: readonly Element[], plage: Plage, maintenant: string): Map<string, string> {
  const occupes = creneaux(taches).map((c) => [c.debut, c.fin] as [number, number]);
  const fin = minutes(plage.fin);
  let curseur = Math.max(minutes(plage.debut), Math.ceil(minutes(maintenant) / 5) * 5);
  const heures = new Map<string, string>();
  for (const e of taches) {
    if (e.heurePlanifiee !== null || e.statut === 'fait') continue;
    const duree = dureeDe(e);
    let debut = curseur;
    // Avance après chaque créneau occupé qui gêne, jusqu'à trouver la place.
    for (let gene = occupes.find(([d, f]) => d < debut + duree && debut < f); gene; gene = occupes.find(([d, f]) => d < debut + duree && debut < f)) {
      debut = gene[1];
    }
    if (debut + duree > fin) continue;
    heures.set(e.id, heure(debut));
    occupes.push([debut, debut + duree]);
    curseur = debut + duree;
  }
  return heures;
}

/** Le bilan : le temps prévu (ce qui reste à faire) face au temps disponible, et l'excès s'il y en a. */
export function bilanDuJour(prevu: number, dispo: number): { prevu: number; disponible: number; trop: number; part: number } {
  return { prevu, disponible: dispo, trop: Math.max(0, prevu - dispo), part: dispo === 0 ? (prevu > 0 ? 1 : 0) : Math.min(1, prevu / dispo) };
}

/** La plage lue dans le téléphone (chaque appareil garde la sienne) ; la plage par défaut sinon. */
export function lirePlage(texte: string | null): Plage {
  try {
    const p = JSON.parse(texte ?? 'null') as unknown;
    if (typeof p === 'object' && p !== null && 'debut' in p && 'fin' in p) {
      const { debut, fin } = p as { debut: unknown; fin: unknown };
      const ok = (h: unknown): h is string => typeof h === 'string' && /^\d{2}:\d{2}$/.test(h);
      if (ok(debut) && ok(fin) && debut < fin) return { debut, fin };
    }
  } catch { /* illisible : la plage par défaut */ }
  return PLAGE_PAR_DEFAUT;
}
