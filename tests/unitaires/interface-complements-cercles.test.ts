// Les compléments de la vue en cercles (3b.7) : liste collée, export CSV, importance absolue, couleur choisie.
import { describe, expect, it } from 'vitest';
import type { Element } from '../../ui/api';
import { couleursChoisies, disposer } from '../../ui/cercles';
import { csvDeBranche } from '../../ui/export-csv';
import { lireListe } from '../../ui/liste-collee';

function element(id: string, champs: Partial<Element> = {}): Element {
  return {
    id, type: 'objectif', parent: null, titre: id, description: null, statut: 'a_faire', priorite: null,
    echeance: null, jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null,
    faitLe: null, archiveLe: null, creeLe: '2026-11-08T10:00:00.000Z', modifieLe: '2026-11-08T10:00:00.000Z', ...champs,
  };
}

describe('lireListe', () => {
  it('suit le retrait, les puces et les numéros', () => {
    const lignes = lireListe('- Santé\n  - Courir\n  - Dormir\n2. Famille\n\t* Vacances\n');
    expect(lignes.map((l) => [l.titre, l.parent])).toEqual([['Santé', null], ['Courir', 0], ['Dormir', 0], ['Famille', null], ['Vacances', 3]]);
  });

  it('fait du gras le titre et de la suite la description, et ignore les lignes vides', () => {
    expect(lireListe('**Lire** : un livre par mois\r\n\r\nÉcrire')).toEqual([
      { titre: 'Lire', description: 'un livre par mois', parent: null },
      { titre: 'Écrire', description: null, parent: null },
    ]);
  });

  it("revient au bon parent après plusieurs niveaux", () => {
    const lignes = lireListe('A\n  B\n    C\n  D\nE');
    expect(lignes.map((l) => l.parent)).toEqual([null, 0, 1, 0, null]);
  });
});

const arbre = [
  element('vie'),
  element('sante', { parent: 'vie', poids: 3, rang: 1 }),
  element('famille', { parent: 'vie', rang: 2, echeance: '2026-12-01' }),
  element('courir', { parent: 'sante', type: 'tache', statut: 'fait', titre: 'Courir; vite' }),
  element('dormir', { parent: 'sante', type: 'tache' }),
];

describe('csvDeBranche', () => {
  it('donne une ligne par élément sous le centre, avec ses parts et son avancement', () => {
    const csv = csvDeBranche(arbre, 'vie', new Map([['famille', ['now']]]));
    expect(csv.startsWith('﻿Niveau;Titre;')).toBe(true);
    expect(csv.trim().split('\r\n').slice(1)).toEqual([
      '1;sante;objectif;a_faire;75;75;50;;',
      '2;"Courir; vite";tache;fait;50;37,5;100;;',
      '2;dormir;tache;a_faire;50;37,5;0;;',
      '1;famille;objectif;a_faire;25;25;0;2026-12-01;now',
    ]);
  });
});

describe('disposer : importance absolue et couleur choisie', () => {
  it("la part du centre est le produit des parts", () => {
    const dessin = disposer(arbre, 'vie', 3);
    expect(dessin.parts.find((p) => p.element.id === 'courir')?.absolue).toBeCloseTo(0.375);
  });

  it("une couleur choisie s'applique à l'élément et passe à ses sous-éléments", () => {
    const choisies = couleursChoisies(new Map([['sante', ['couleur:rose']], ['dormir', ['couleur:inconnue']]]));
    expect(choisies).toEqual(new Map([['sante', 6]]));
    const dessin = disposer(arbre, 'vie', 3, undefined, choisies);
    const de = (id: string) => dessin.parts.find((p) => p.element.id === id)?.couleur;
    expect([de('sante'), de('courir'), de('dormir'), de('famille')]).toEqual([6, 6, 6, 1]);
  });
});
