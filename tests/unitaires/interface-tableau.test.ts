// Le tableau de bord (tâche 4.4) : les chiffres et les semaines, sans React.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { chiffres, faitesParSemaine, jourCourt, lundiDe, prochainesEcheances } from '../../ui/tableau';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null, faitLe: null,
    archiveLe: null, creeLe: '2026-10-01T10:00:00.000Z', modifieLe: '2026-10-01T10:00:00.000Z', ...champs,
  };
}

const AUJOURDHUI = '2026-11-10'; // un mardi

describe('le tableau de bord', () => {
  it('trouve le lundi de la semaine', () => {
    expect(lundiDe('2026-11-10')).toBe('2026-11-09');
    expect(lundiDe('2026-11-09')).toBe('2026-11-09');
    expect(lundiDe('2026-11-15')).toBe('2026-11-09'); // dimanche
    expect(jourCourt('2026-11-09')).toBe('09/11');
  });

  it('compte à faire, en cours, en retard, faites et créées en 7 jours, sans les projets', () => {
    const c = chiffres([
      element('a'),
      element('b', { statut: 'en_cours', echeance: '2026-11-09' }),
      element('c', { statut: 'fait', faitLe: '2026-11-04T08:00:00.000Z', echeance: '2026-11-01' }),
      element('d', { statut: 'fait', faitLe: '2026-11-03T23:00:00.000Z' }),
      element('e', { creeLe: '2026-11-10T07:00:00.000Z' }),
      element('p', { type: 'projet', creeLe: '2026-11-10T07:00:00.000Z' }),
    ], AUJOURDHUI);
    expect(c).toEqual({ aFaire: 2, enCours: 1, enRetard: 1, faitesSemaine: 1, creesSemaine: 1 });
  });

  it('range les tâches faites par semaine, les 8 dernières, la plus ancienne d’abord', () => {
    const s = faitesParSemaine([
      element('a', { statut: 'fait', faitLe: '2026-11-10T08:00:00.000Z' }),
      element('b', { statut: 'fait', faitLe: '2026-11-09T08:00:00.000Z' }),
      element('c', { statut: 'fait', faitLe: '2026-11-08T08:00:00.000Z' }),
      element('d', { statut: 'fait', faitLe: '2025-01-01T08:00:00.000Z' }),
    ], AUJOURDHUI);
    expect(s).toHaveLength(8);
    expect(s[0]?.lundi).toBe('2026-09-21');
    expect(s.slice(-2)).toEqual([{ lundi: '2026-11-02', nombre: 1 }, { lundi: '2026-11-09', nombre: 2 }]);
  });

  it('montre les prochaines échéances, pas les passées ni les faites', () => {
    const e = prochainesEcheances([
      element('loin', { echeance: '2026-12-01' }),
      element('passee', { echeance: '2026-11-01' }),
      element('faite', { echeance: '2026-11-11', statut: 'fait' }),
      element('demain', { echeance: '2026-11-11' }),
      element('aujourdhui', { echeance: AUJOURDHUI }),
    ], AUJOURDHUI);
    expect(e.map((x) => x.id)).toEqual(['aujourdhui', 'demain', 'loin']);
  });
});
