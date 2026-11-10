// Les projets en arbre et les releases.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { arbreProjets, releases } from '../../ui/projets';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'tache', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null, faitLe: null,
    archiveLe: null, creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z', ...champs,
  };
}

describe('arbreProjets', () => {
  const elements = [
    element('maison', { type: 'projet', titre: 'Maison' }),
    element('cuisine', { type: 'projet', titre: 'Cuisine', parent: 'maison' }),
    element('bain', { type: 'projet', titre: 'Bain', parent: 'maison' }),
    element('carreler', { parent: 'cuisine', statut: 'fait' }),
    element('peindre', { parent: 'cuisine' }),
    element('toit', { parent: 'maison', statut: 'fait' }),
    element('auto', { type: 'projet', titre: 'Auto' }),
    element('tache', { titre: 'Une tâche' }),
    element('perdu', { type: 'projet', titre: 'Sous une tâche', parent: 'tache' }),
  ];
  const lignes = arbreProjets(elements);

  it('met les sous-projets en retrait sous leur projet, par ordre alphabétique', () => {
    expect(lignes.map((l) => [l.projet.titre, l.profondeur])).toEqual([
      ['Auto', 0], ['Maison', 0], ['Bain', 1], ['Cuisine', 1], ['Sous une tâche', 0],
    ]);
  });

  it('compte le travail à toute profondeur, sans compter les sous-projets', () => {
    const de = (titre: string) => lignes.find((l) => l.projet.titre === titre)?.avancement;
    expect(de('Maison')).toEqual({ faits: 2, total: 3 });
    expect(de('Cuisine')).toEqual({ faits: 1, total: 2 });
    expect(de('Auto')).toEqual({ faits: 0, total: 0 });
  });
});

describe('releases', () => {
  it('groupe par tag release:<nom>, les ouvertes d’abord, par nom (v2 avant v10)', () => {
    const elements = [element('a'), element('b', { statut: 'fait' }), element('c', { statut: 'fait' }), element('d')];
    const tags = new Map<string, string[]>([
      ['a', ['release:v10']], ['b', ['release:v10', 'composant:pxe']], ['c', ['release:v1']], ['d', ['release:v2', 'release']],
    ]);
    expect(releases(elements, tags)).toEqual([
      { nom: 'v2', avancement: { faits: 0, total: 1 } },
      { nom: 'v10', avancement: { faits: 1, total: 2 } },
      { nom: 'v1', avancement: { faits: 1, total: 1 } },
    ]);
  });
});
