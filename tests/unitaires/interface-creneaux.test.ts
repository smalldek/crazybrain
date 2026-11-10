// Les créneaux de la journée : le temps disponible, les créneaux et leurs chevauchements, caser à la suite.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { bilanDuJour, caserALaSuite, creneaux, disponible, lirePlage, PLAGE_PAR_DEFAUT } from '../../ui/creneaux';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: '2026-11-10', heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}
const plage = { debut: '09:00', fin: '18:00' };

describe('disponible', () => {
  it('compte de maintenant à la fin, ou du début si la journée n’a pas commencé ; jamais moins que zéro', () => {
    expect(disponible(plage, '07:00')).toBe(9 * 60);
    expect(disponible(plage, '16:30')).toBe(90);
    expect(disponible(plage, '19:00')).toBe(0);
  });
});

describe('creneaux', () => {
  it('pose les tâches casées et pas faites, signale celles qui se chevauchent', () => {
    const c = creneaux([
      element('apres', { heurePlanifiee: '14:00', estimation: 60 }),
      element('matin', { heurePlanifiee: '09:00', estimation: 90 }),
      element('pendant', { heurePlanifiee: '10:00' }),
      element('faite', { heurePlanifiee: '09:00', statut: 'fait' }),
      element('sans-heure'),
    ]);
    expect(c.map((x) => [x.element.id, x.debut, x.fin, x.chevauche])).toEqual([
      ['matin', 540, 630, true], ['pendant', 600, 630, true], ['apres', 840, 900, false],
    ]);
  });
});

describe('caserALaSuite', () => {
  it('case dans l’ordre, à partir de maintenant arrondi, en sautant les créneaux pris, et pas après la fin', () => {
    const taches = [
      element('pris', { heurePlanifiee: '10:00', estimation: 60 }),
      element('a', { estimation: 45 }),
      element('b'),
      element('c', { estimation: 60 }),
      element('trop-long', { estimation: 600 }),
      element('faite', { statut: 'fait' }),
    ];
    const h = caserALaSuite(taches, plage, '09:02');
    // a : 09:05–09:50 ; b (30 min) ne tient pas avant 10:00, donc 11:00 ; c à 11:30 ; trop-long ne tient pas.
    expect([...h]).toEqual([['a', '09:05'], ['b', '11:00'], ['c', '11:30']]);
  });

  it('commence au début de la journée si on est avant', () => {
    expect([...caserALaSuite([element('a')], plage, '06:12')]).toEqual([['a', '09:00']]);
  });
});

describe('bilanDuJour et lirePlage', () => {
  it('dit l’excès et la part du disponible', () => {
    expect(bilanDuJour(300, 240)).toEqual({ prevu: 300, disponible: 240, trop: 60, part: 1 });
    expect(bilanDuJour(60, 240)).toEqual({ prevu: 60, disponible: 240, trop: 0, part: 0.25 });
    expect(bilanDuJour(0, 0).part).toBe(0);
  });

  it('lit la plage gardée, et sinon prend celle par défaut', () => {
    expect(lirePlage('{"debut":"08:00","fin":"17:30"}')).toEqual({ debut: '08:00', fin: '17:30' });
    expect(lirePlage(null)).toEqual(PLAGE_PAR_DEFAUT);
    expect(lirePlage('{"debut":"18:00","fin":"08:00"}')).toEqual(PLAGE_PAR_DEFAUT);
    expect(lirePlage('pas du json')).toEqual(PLAGE_PAR_DEFAUT);
  });
});
