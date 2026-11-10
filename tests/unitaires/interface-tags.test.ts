// Les tags à l'écran : regroupement, complétion, projet de l'élément, sens d'une saisie.
import { describe, expect, it } from 'vitest';
import type { Element, Tag } from '../../ui/api';
import { lireSaisie, projetDe, suggestions, tagsParElement } from '../../ui/tags';

const tag = (elementId: string, cle: string, valeur = ''): Tag => ({ elementId, cle, valeur });
function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}

describe('tagsParElement', () => {
  it('regroupe et trie les tags de chaque élément', () => {
    const m = tagsParElement([tag('a', 'urgent'), tag('a', 'composant', 'pxe'), tag('b', 'release', 'v1')]);
    expect(m.get('a')).toEqual(['composant:pxe', 'urgent']);
    expect(m.get('b')).toEqual(['release:v1']);
  });
});

describe('suggestions', () => {
  it('propose les tags les plus utilisés d’abord, sauf ceux déjà posés, puis les projets', () => {
    const tous = [tag('a', 'lieu', 'garage'), tag('b', 'lieu', 'garage'), tag('c', 'urgent'), tag('d', 'release', 'v1')];
    const elements = [element('Maison', { type: 'projet' }), element('x')];
    expect(suggestions(tous, ['urgent'], elements)).toEqual(['lieu:garage', 'release:v1', 'projet:Maison']);
  });
});

describe('projetDe', () => {
  it('remonte les parents jusqu’au premier projet', () => {
    const elements = [element('P', { type: 'projet' }), element('epic', { type: 'epic', parent: 'P' }), element('t', { parent: 'epic' })];
    expect(projetDe('t', elements)?.id).toBe('P');
    expect(projetDe('P', elements)).toBeNull();
  });

  it('s’arrête sur une boucle ou un parent absent', () => {
    expect(projetDe('a', [element('a', { parent: 'b' }), element('b', { parent: 'a' })])).toBeNull();
    expect(projetDe('a', [element('a', { parent: 'absent' })])).toBeNull();
  });
});

describe('lireSaisie', () => {
  const elements = [element('m', { type: 'projet', titre: 'Maison' }), element('t', { titre: 'Maison' })];

  it('un tag ordinaire se pose tel quel', () => {
    expect(lireSaisie('  composant:pxe ', elements)).toEqual({ sorte: 'tag', texte: 'composant:pxe' });
  });

  it('projet:<titre> range dans le projet, sans tenir compte des majuscules', () => {
    const lu = lireSaisie('projet:maison', elements);
    expect(lu.sorte === 'projet' && lu.projet.id).toBe('m');
  });

  it('un projet inconnu ou une saisie vide est expliqué', () => {
    expect(lireSaisie('projet:Jardin', elements)).toEqual({ sorte: 'erreur', message: "Aucun projet ne s'appelle « Jardin »." });
    expect(lireSaisie('  ', elements).sorte).toBe('erreur');
  });
});
