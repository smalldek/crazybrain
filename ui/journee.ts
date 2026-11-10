// Le mode journée (tâche 6.2) : le matin, on choisit ses tâches du jour dans le backlog. Une tâche
// « du jour » est une tâche dont le jour prévu est aujourd'hui : choisir, c'est poser ce jour ;
// retirer, c'est l'enlever (elle retourne au backlog). Ici, le calcul, sans React.
import type { Element } from './api';

/** Les tâches prévues ce jour, faites comprises : d'abord celles qui ont une heure, puis le rang, puis le titre. */
export function duJour(elements: readonly Element[], jour: string): Element[] {
  return elements
    .filter((e) => e.jourPlanifie === jour && e.archiveLe === null)
    .sort((a, b) => (a.heurePlanifiee ?? '99:99').localeCompare(b.heurePlanifiee ?? '99:99')
      || (a.rang ?? Infinity) - (b.rang ?? Infinity)
      || a.titre.localeCompare(b.titre, 'fr'));
}

/**
 * Les tâches prévues un jour passé et pas faites : elles ont glissé. Le mode journée les montre pour
 * qu'on décide (les reprendre aujourd'hui, ou les rendre au backlog), de la plus ancienne à la plus récente.
 */
export function enSouffrance(elements: readonly Element[], jour: string): Element[] {
  return elements
    .filter((e) => e.jourPlanifie !== null && e.jourPlanifie < jour && e.statut !== 'fait' && e.archiveLe === null)
    .sort((a, b) => (a.jourPlanifie ?? '').localeCompare(b.jourPlanifie ?? '') || a.titre.localeCompare(b.titre, 'fr'));
}

/** Le temps prévu : la somme des estimations de ce qui reste à faire, et combien n'en ont pas. */
export function tempsPrevu(taches: readonly Element[]): { minutes: number; sansEstimation: number; restantes: number } {
  const restantes = taches.filter((e) => e.statut !== 'fait');
  return {
    minutes: restantes.reduce((somme, e) => somme + (e.estimation ?? 0), 0),
    sansEstimation: restantes.filter((e) => e.estimation === null).length,
    restantes: restantes.length,
  };
}

/** 90 → « 1 h 30 », 45 → « 45 min », 120 → « 2 h ». */
export function duree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
