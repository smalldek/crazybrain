// Le calendrier (tâche 6.1).
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { deplacer, jourLisible, lundi, mois, poses, semaine, titrePeriode } from '../../ui/calendrier';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}

describe('les jours', () => {
  it('une semaine va du lundi au dimanche', () => {
    expect(lundi('2026-11-10')).toBe('2026-11-09');
    expect(lundi('2026-11-15')).toBe('2026-11-09'); // dimanche
    expect(semaine('2026-11-10')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
  });

  it('un mois se couvre de semaines entières', () => {
    const m = mois('2026-11-10');
    expect(m).toHaveLength(6); // novembre 2026 commence un dimanche, finit un lundi
    expect(m[0]?.[0]).toBe('2026-10-26');
    expect(m.at(-1)?.at(-1)).toBe('2026-12-06');
    expect(mois('2027-02-10')).toHaveLength(4); // février 2027 : du lundi 1er au dimanche 28
  });

  it('avancer ou reculer d’une période', () => {
    expect(deplacer('2026-11-10', 'semaine', 1)).toBe('2026-11-17');
    expect(deplacer('2026-01-31', 'mois', 1)).toBe('2026-02-01');
    expect(deplacer('2026-01-15', 'mois', -1)).toBe('2025-12-01');
  });

  it('se lisent en français', () => {
    expect(jourLisible('2026-11-10')).toBe('mardi 10 novembre');
    expect(titrePeriode('2026-11-10', 'mois')).toBe('novembre 2026');
    expect(titrePeriode('2026-11-10', 'semaine')).toBe('du 9 au 15 novembre 2026');
    expect(titrePeriode('2026-12-01', 'semaine')).toBe('du 30 novembre au 6 décembre 2026');
  });
});

describe('poser les éléments', () => {
  it('à leur échéance et à leur jour prévu, une fois s’ils coïncident ; jamais les supprimés', () => {
    const jours = semaine('2026-11-10');
    const p = poses([
      element('deux-jours', { echeance: '2026-11-13', jourPlanifie: '2026-11-10' }),
      element('meme-jour', { echeance: '2026-11-10', jourPlanifie: '2026-11-10' }),
      element('hors-semaine', { echeance: '2026-12-01' }),
      element('supprime', { echeance: '2026-11-10', archiveLe: '2026-11-09T00:00:00Z' }),
    ], jours);
    expect(p.get('2026-11-10')?.map((x) => `${x.element.id}:${x.sorte}`)).toEqual(['deux-jours:prevu', 'meme-jour:prevu']);
    expect(p.get('2026-11-13')?.map((x) => `${x.element.id}:${x.sorte}`)).toEqual(['deux-jours:echeance']);
    expect([...p.values()].flat()).toHaveLength(3);
  });

  it('dans un jour : à faire avant fait, puis par heure, puis par titre', () => {
    const p = poses([
      element('b'), element('fini', { statut: 'fait' }), element('a'), element('tot', { heurePlanifiee: '08:00' }),
    ].map((e) => ({ ...e, jourPlanifie: '2026-11-10' })), ['2026-11-10']);
    expect(p.get('2026-11-10')?.map((x) => x.element.id)).toEqual(['tot', 'a', 'b', 'fini']);
  });
});
