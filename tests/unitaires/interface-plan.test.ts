// Le plan de la vue en cercles : les lignes, et ce que fait un glissement.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { deplacement, lignesDuPlan, positionDans } from '../../ui/plan';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'objectif', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null,
    faitLe: null, archiveLe: null, creeLe: '2026-11-08T10:00:00.000Z', modifieLe: '2026-11-08T10:00:00.000Z', ...champs,
  };
}

const arbre = [
  element('vie'),
  element('sante', { parent: 'vie', rang: 1000, poids: 3 }),
  element('famille', { parent: 'vie', rang: 2000 }),
  element('courir', { parent: 'sante', type: 'tache', statut: 'fait' }),
  element('dormir', { parent: 'sante', type: 'tache' }),
];

describe('lignesDuPlan', () => {
  it('met les sous-éléments en retrait sous leur parent, avec leur part et leur avancement', () => {
    const lignes = lignesDuPlan(arbre, 'vie', new Set());
    expect(lignes.map((l) => [l.element.id, l.niveau])).toEqual([['sante', 1], ['courir', 2], ['dormir', 2], ['famille', 1]]);
    expect(lignes[0]?.part).toBe(0.75);
    expect(lignes[0]?.avancement).toBe(50);
  });

  it("cache les sous-éléments d'une branche repliée", () => {
    expect(lignesDuPlan(arbre, 'vie', new Set(['sante'])).map((l) => l.element.id)).toEqual(['sante', 'famille']);
  });
});

describe('deplacement', () => {
  it('avant ou après une sœur : change l’ordre de la fratrie', () => {
    expect(deplacement(arbre, 'vie', 'famille', 'sante', 'avant')).toEqual({ parent: 'vie', ordre: ['famille', 'sante'] });
    expect(deplacement(arbre, 'vie', 'courir', 'dormir', 'apres')).toEqual({ parent: 'sante', ordre: ['dormir', 'courir'] });
  });

  it('dans une autre ligne : range l’élément à la fin de ses sous-éléments', () => {
    expect(deplacement(arbre, 'vie', 'dormir', 'famille', 'dans')).toEqual({ parent: 'famille', ordre: ['dormir'] });
  });

  it('à côté d’une ligne d’un autre parent : change de parent', () => {
    expect(deplacement(arbre, 'vie', 'courir', 'famille', 'apres')).toEqual({ parent: 'vie', ordre: ['sante', 'famille', 'courir'] });
  });

  it('refuse de ranger un élément dans ce qu’il contient, et ne fait rien sans changement', () => {
    expect(deplacement(arbre, 'vie', 'sante', 'courir', 'dans')).toMatch(/Impossible/);
    expect(deplacement(arbre, 'vie', 'sante', 'famille', 'avant')).toBeNull();
    expect(deplacement(arbre, 'vie', 'sante', 'sante', 'dans')).toBeNull();
  });

  it('lit la position à la hauteur du dépôt', () => {
    expect([positionDans(0.1), positionDans(0.5), positionDans(0.9)]).toEqual(['avant', 'dans', 'apres']);
  });
});
