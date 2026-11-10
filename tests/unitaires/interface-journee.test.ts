// Le mode journée : les tâches du jour, celles qui ont glissé, le temps prévu.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { duJour, duree, enSouffrance, tempsPrevu } from '../../ui/journee';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}
const ids = (liste: readonly Element[]): string[] => liste.map((e) => e.id);
const JOUR = '2026-11-10';

describe('duJour', () => {
  it('garde le jour prévu, faites comprises ; l’heure d’abord, puis le rang, puis le titre', () => {
    const liste = [
      element('b-sans-heure', { jourPlanifie: JOUR }),
      element('a-sans-heure', { jourPlanifie: JOUR }),
      element('rang-1', { jourPlanifie: JOUR, rang: 1 }),
      element('tard', { jourPlanifie: JOUR, heurePlanifiee: '17:00' }),
      element('tot', { jourPlanifie: JOUR, heurePlanifiee: '08:30', statut: 'fait' }),
      element('demain', { jourPlanifie: '2026-11-11' }),
      element('archivee', { jourPlanifie: JOUR, archiveLe: '2026-11-09T10:00:00.000Z' }),
    ];
    expect(ids(duJour(liste, JOUR))).toEqual(['tot', 'tard', 'rang-1', 'a-sans-heure', 'b-sans-heure']);
  });
});

describe('enSouffrance', () => {
  it('ce qui était prévu avant et n’est pas fait, du plus ancien au plus récent', () => {
    const liste = [
      element('hier', { jourPlanifie: '2026-11-09' }),
      element('semaine-passee', { jourPlanifie: '2026-11-03', statut: 'en_cours' }),
      element('faite-hier', { jourPlanifie: '2026-11-09', statut: 'fait' }),
      element('aujourdhui', { jourPlanifie: JOUR }),
      element('jamais', {}),
    ];
    expect(ids(enSouffrance(liste, JOUR))).toEqual(['semaine-passee', 'hier']);
  });
});

describe('tempsPrevu et duree', () => {
  it('additionne les estimations de ce qui reste, et compte ce qui n’en a pas', () => {
    const t = tempsPrevu([
      element('a', { estimation: 30 }), element('b', { estimation: 60 }),
      element('c'), element('faite', { estimation: 120, statut: 'fait' }),
    ]);
    expect(t).toEqual({ minutes: 90, sansEstimation: 1, restantes: 3 });
  });

  it('écrit une durée en heures et minutes', () => {
    expect(duree(45)).toBe('45 min');
    expect(duree(90)).toBe('1 h 30');
    expect(duree(120)).toBe('2 h');
    expect(duree(65)).toBe('1 h 05');
    expect(duree(0)).toBe('0 min');
  });
});
