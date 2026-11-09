// Les calculs de la vue en cercles : les parts, le poids pour une part voulue, l'avancement qui remonte.
import { describe, expect, it } from 'vitest';
import { Avancement } from '../../src/domaine/avancement';
import { avancementDeRacines, avancementsCalcules, parts, poidsPourPart, type NoeudCercle } from '../../src/domaine/cercles';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';
import { Poids } from '../../src/domaine/poids';

function noeud(id: string, champs: Partial<NoeudCercle> = {}): NoeudCercle {
  return { id, parent: null, statut: 'a_faire', poids: null, avancement: null, ...champs };
}

describe('parts', () => {
  it('trois sœurs sans poids font un tiers chacune', () => {
    const p = parts([{ poids: null }, { poids: null }, { poids: null }]);
    p.forEach((x) => expect(x).toBeCloseTo(1 / 3));
  });

  it('un poids 2 contre deux poids 1 fait la moitié, et les parts font 100 %', () => {
    const p = parts([{ poids: 2 }, { poids: null }, { poids: 1 }]);
    expect(p).toEqual([0.5, 0.25, 0.25]);
    expect(p.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('poidsPourPart', () => {
  it('rend le poids qui donne exactement la part voulue, les autres gardant leurs proportions', () => {
    const autres = [1, 3];
    const poids = poidsPourPart(0.5, autres);
    const p = parts([{ poids }, ...autres.map((x) => ({ poids: x }))]);
    expect(p[0]).toBeCloseTo(0.5);
    expect(p[2]! / p[1]!).toBeCloseTo(3);
  });

  it('refuse un élément seul, et une part de 0 ou 100 %', () => {
    expect(() => poidsPourPart(0.5, [])).toThrow();
    expect(() => poidsPourPart(0, [1])).toThrow();
    expect(() => poidsPourPart(1, [1])).toThrow();
  });
});

describe('avancementsCalcules', () => {
  it("une feuille : faite 100, sinon son avancement saisi, sinon 0", () => {
    const a = avancementsCalcules([noeud('a', { statut: 'fait' }), noeud('b', { avancement: 40 }), noeud('c')]);
    expect([a.get('a'), a.get('b'), a.get('c')]).toEqual([100, 40, 0]);
  });

  it('un parent vaut la moyenne de ses enfants pondérée par leurs poids, son avancement saisi ignoré', () => {
    const a = avancementsCalcules([
      noeud('p', { avancement: 10 }),
      noeud('x', { parent: 'p', poids: 3, statut: 'fait' }),
      noeud('y', { parent: 'p', poids: 1 }),
    ]);
    expect(a.get('p')).toBe(75);
  });

  it('remonte sur trois niveaux', () => {
    const a = avancementsCalcules([
      noeud('centre'),
      noeud('a', { parent: 'centre' }),
      noeud('b', { parent: 'centre' }),
      noeud('a1', { parent: 'a', avancement: 50 }),
      noeud('a2', { parent: 'a', statut: 'fait' }),
    ]);
    expect(a.get('a')).toBe(75);
    expect(a.get('b')).toBe(0);
    expect(a.get('centre')).toBe(37.5);
  });

  it('un parent « fait » vaut 100, quoi que disent ses enfants', () => {
    const a = avancementsCalcules([noeud('p', { statut: 'fait' }), noeud('x', { parent: 'p' })]);
    expect(a.get('p')).toBe(100);
  });

  it("ne tourne pas sans fin sur une boucle de parents", () => {
    const a = avancementsCalcules([noeud('a', { parent: 'b' }), noeud('b', { parent: 'a' })]);
    expect(a.size).toBe(2);
  });

  it("l'avancement de plusieurs racines (le centre « Tout »)", () => {
    const racines = [noeud('a', { poids: 3, statut: 'fait' }), noeud('b')];
    expect(avancementDeRacines(racines, avancementsCalcules(racines))).toBe(75);
    expect(avancementDeRacines([], new Map())).toBe(0);
  });
});

describe('Poids et Avancement', () => {
  it('refusent ce qui sort de leurs bornes', () => {
    expect(() => Poids.creer(0)).toThrow(ErreurDomaine);
    expect(() => Poids.creer(-1)).toThrow(ErreurDomaine);
    expect(() => Poids.creer(Number.NaN)).toThrow(ErreurDomaine);
    expect(Poids.creer(0.5).valeur).toBe(0.5);
    expect(() => Avancement.creer(101)).toThrow(ErreurDomaine);
    expect(() => Avancement.creer(-1)).toThrow(ErreurDomaine);
    expect(() => Avancement.creer(12.5)).toThrow(ErreurDomaine);
    expect(Avancement.creer(0).pourcent).toBe(0);
  });
});
