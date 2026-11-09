// Le dessin des parts (ui/cercles.ts, chemin) : un morceau d'anneau, ou un tour entier sans couture.
import { describe, expect, it } from 'vitest';
import { chemin } from '../../ui/cercles';

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
