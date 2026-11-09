// La vue en cercles sans React (ui/cercles.ts) : le dessin d'une part (chemin), les tâches rattachées
// à un projet (rattacher).
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { chemin, disposer, rattacher } from '../../ui/cercles';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null,
    faitLe: null, archiveLe: null, creeLe: '2026-11-09T10:00:00.000Z', modifieLe: '2026-11-09T10:00:00.000Z', ...champs,
  };
}

describe('chemin', () => {
  it("dessine un morceau d'anneau avec ses deux bords droits", () => {
    const d = chemin(24, 48, 0, Math.PI / 2);
    expect(d).toBe('M 0 -48 A 48 48 0 0 1 48 0 L 24 0 A 24 24 0 0 0 0 -24 Z');
  });

  it('dessine un tour complet en deux cercles, sans trait du centre vers le bord', () => {
    // Le cas d'une seule part autour du centre (un seul projet) : avant, deux moitiés avec une
    // couture en haut et en bas, qui faisaient croire à deux parts.
    const d = chemin(24, 48, 0, 2 * Math.PI);
    expect(d).not.toContain('L');
    expect(d).toBe('M 0 -48 A 48 48 0 1 1 0 48 A 48 48 0 1 1 0 -48 Z M 0 -24 A 24 24 0 1 0 0 24 A 24 24 0 1 0 0 -24 Z');
  });

  it("dessine un tour complet qui ne commence pas en haut de la même façon", () => {
    expect(chemin(24, 48, 1, 1 + 2 * Math.PI)).toBe(chemin(24, 48, 0, 2 * Math.PI));
  });

  it('dessine un disque plein quand il n\'y a pas de trou', () => {
    expect(chemin(0, 48, 0, 2 * Math.PI)).toBe('M 0 -48 A 48 48 0 1 1 0 48 A 48 48 0 1 1 0 -48 Z');
  });
});

describe('rattacher', () => {
  const sport = element('sport', { type: 'projet' });
  const maison = element('maison', { type: 'projet' });

  it('range dans son projet une tâche rattachée et rangée nulle part', () => {
    const velo = element('velo');
    const resultat = rattacher([sport, velo], [{ source: 'velo', cible: 'sport' }]);
    expect(resultat.find((e) => e.id === 'velo')?.parent).toBe('sport');
    // Le projet n'est plus vide : la tâche y fait le tour entier.
    expect(disposer(resultat, 'sport', 3).parts.map((p) => p.element.id)).toEqual(['velo']);
  });

  it('garde le rangement choisi à la main, et prend le premier projet quand il y en a plusieurs', () => {
    const rangee = element('rangee', { parent: 'maison' });
    const double = element('double');
    const resultat = rattacher([sport, maison, rangee, double],
      [{ source: 'rangee', cible: 'sport' }, { source: 'double', cible: 'maison' }, { source: 'double', cible: 'sport' }]);
    expect(resultat.find((e) => e.id === 'rangee')?.parent).toBe('maison');
    expect(resultat.find((e) => e.id === 'double')?.parent).toBe('maison');
  });

  it("ignore un projet qui n'est pas chargé et un rattachement qui ferait une boucle", () => {
    const a = element('a', { type: 'projet' });
    const b = element('b', { type: 'projet', parent: 'a' });
    const resultat = rattacher([a, b, element('seule')],
      [{ source: 'a', cible: 'b' }, { source: 'seule', cible: 'inconnu' }]);
    expect(resultat.find((e) => e.id === 'a')?.parent).toBeNull();
    expect(resultat.find((e) => e.id === 'seule')?.parent).toBeNull();
  });
});
