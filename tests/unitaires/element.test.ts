// Règles de l'entité Element (une tâche, plus tard aussi un projet, un objectif…).
import { describe, expect, it } from 'vitest';
import { Element } from '../../src/domaine/element';
import { Titre } from '../../src/domaine/titre';

const maintenant = new Date('2026-11-03T08:30:00.000Z');

describe('Element', () => {
  it('se crée « à faire », créé et modifié maintenant', () => {
    const element = Element.creer({ id: 'el-1', titre: Titre.creer('Acheter du pain'), maintenant });

    expect(element.id).toBe('el-1');
    expect(element.titre.valeur).toBe('Acheter du pain');
    expect(element.statut).toBe('a_faire');
    expect(element.creeLe).toEqual(maintenant);
    expect(element.modifieLe).toEqual(maintenant);
  });

  it('donne son instantané, une photo en données simples', () => {
    const element = Element.creer({ id: 'el-1', titre: Titre.creer('Acheter du pain'), maintenant });

    expect(element.instantane()).toEqual({
      id: 'el-1',
      titre: 'Acheter du pain',
      statut: 'a_faire',
      creeLe: '2026-11-03T08:30:00.000Z',
      modifieLe: '2026-11-03T08:30:00.000Z',
    });
  });

  it('se reconstitue depuis son instantané (relu en base)', () => {
    const element = Element.creer({ id: 'el-1', titre: Titre.creer('Acheter du pain'), maintenant });

    const relu = Element.depuisInstantane(element.instantane());

    expect(relu.instantane()).toEqual(element.instantane());
  });
});
