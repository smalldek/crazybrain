// La vue horizons : les colonnes, leurs périodes et leurs éléments, les horizons dépassés.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { colonnes, depasses, ecrireDecalages, libelleHorizon, lireDecalages } from '../../ui/horizons';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}
const AUJ = '2026-11-10';

describe('colonnes', () => {
  const liste = [
    element('objectif-2027', { type: 'objectif', horizon: '2027' }),
    element('cette-semaine', { horizon: '2026-S46' }),
    element('faite', { horizon: '2026-S46', statut: 'fait' }),
    element('b-semaine', { horizon: '2026-S46' }),
    element('semaine-prochaine', { horizon: '2026-S47' }),
    element('un-jour', { horizon: 'vie' }),
    element('sans'),
  ];

  it('une colonne par échelle, sur la période en cours, avec ses éléments (pas faits d’abord)', () => {
    const c = colonnes(liste, AUJ);
    expect(c.map((x) => x.horizon.texte)).toEqual(['2026-11-10', '2026-S46', '2026-11', '2026-T4', '2026', '2020-2029', 'vie']);
    expect(c[1]?.elements.map((e) => e.id)).toEqual(['b-semaine', 'cette-semaine', 'faite']);
    expect(c[6]?.elements.map((e) => e.id)).toEqual(['un-jour']);
  });

  it('une colonne décalée montre une autre période', () => {
    const c = colonnes(liste, AUJ, { semaine: 1, annee: 1 });
    expect(c[1]?.elements.map((e) => e.id)).toEqual(['semaine-prochaine']);
    expect(c[4]?.horizon.libelle).toBe('2027');
    expect(c[4]?.elements.map((e) => e.id)).toEqual(['objectif-2027']);
  });
});

describe('depasses', () => {
  it('garde les horizons finis et pas faits, du plus ancien au plus récent', () => {
    const liste = [
      element('octobre', { horizon: '2026-10' }),
      element('semaine-45', { horizon: '2026-S45' }),
      element('2025', { horizon: '2025' }),
      element('fait', { horizon: '2026-10', statut: 'fait' }),
      element('en-cours', { horizon: '2026-11' }),
      element('vie', { horizon: 'vie' }),
      element('hier', { horizon: '2026-11-09' }),
    ];
    expect(depasses(liste, AUJ).map((e) => e.id)).toEqual(['2025', 'octobre', 'semaine-45', 'hier']);
  });
});

describe('libelleHorizon et décalages dans l’adresse', () => {
  it('écrit lisiblement, et relit ce qu’il écrit', () => {
    expect(libelleHorizon('2026-S46')).toBe('semaine 46 (2026)');
    expect(libelleHorizon('n’importe quoi')).toBe('n’importe quoi');
    expect(lireDecalages('semaine:1,annee:-2,inconnu:3,mois:x,jour:0')).toEqual({ semaine: 1, annee: -2 });
    expect(ecrireDecalages({ annee: -2, semaine: 1, jour: 0 })).toBe('semaine:1,annee:-2');
  });
});
