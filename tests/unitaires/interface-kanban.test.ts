// Les règles du kanban : les colonnes, l'ordre à la main, le déplacement d'une carte.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { colonnesDe, deplacer, rangsAPoser } from '../../ui/kanban';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}

describe('colonnesDe', () => {
  it('range par statut, le rang choisi d’abord, puis les plus récents', () => {
    const elements = [
      element('ancien', { creeLe: '2026-11-01T00:00:00.000Z' }),
      element('second', { rang: 2000 }),
      element('recent', { creeLe: '2026-11-05T00:00:00.000Z' }),
      element('premier', { rang: 1000 }),
      element('en-cours', { statut: 'en_cours' }),
      element('fini', { statut: 'fait' }),
    ];
    expect(colonnesDe(elements)).toEqual({
      a_faire: ['premier', 'second', 'recent', 'ancien'],
      en_cours: ['en-cours'],
      fait: ['fini'],
    });
  });
});

describe('deplacer', () => {
  const colonnes = { a_faire: ['a', 'b', 'c'], en_cours: ['x'], fait: [] };

  it('pose une carte au-dessus de celle survolée dans une autre colonne', () => {
    expect(deplacer(colonnes, 'b', 'x')).toEqual({ a_faire: ['a', 'c'], en_cours: ['b', 'x'], fait: [] });
  });

  it('pose une carte à la fin d’une colonne quand on survole la colonne (vide ou non)', () => {
    expect(deplacer(colonnes, 'a', 'fait')).toEqual({ a_faire: ['b', 'c'], en_cours: ['x'], fait: ['a'] });
    expect(deplacer(colonnes, 'a', 'en_cours')).toEqual({ a_faire: ['b', 'c'], en_cours: ['x', 'a'], fait: [] });
  });

  it('dans la même colonne, monte au-dessus, descend en dessous', () => {
    expect(deplacer(colonnes, 'c', 'a').a_faire).toEqual(['c', 'a', 'b']);
    expect(deplacer(colonnes, 'a', 'b').a_faire).toEqual(['b', 'a', 'c']);
  });

  it('ne change rien pour une carte inconnue ou posée sur elle-même', () => {
    expect(deplacer(colonnes, 'z', 'a')).toBe(colonnes);
    expect(deplacer(colonnes, 'a', 'a')).toBe(colonnes);
  });
});

describe('rangsAPoser', () => {
  it('numérote de 1000 en 1000 et n’envoie que les rangs qui changent', () => {
    const elements = [element('a', { rang: 1000 }), element('b', { rang: 3000 }), element('c')];
    expect(rangsAPoser(['a', 'c', 'b'], elements)).toEqual([{ id: 'c', rang: 2000 }]);
  });
});
