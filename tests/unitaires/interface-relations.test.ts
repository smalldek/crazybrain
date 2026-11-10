// Les liens d'un élément, lus depuis lui.
import { describe, expect, it } from 'vitest';
import type { Element, Lien } from '../../ui/api';
import { liensVusDe } from '../../ui/relations';

const lien = (id: string, source: string, cible: string, type: Lien['type']): Lien =>
  ({ id, source, cible, type, creeLe: '2026-11-05T10:00:00.000Z' });
const element = (id: string, titre: string): Element => ({
  id, titre, type: 'tache', parent: null, description: null, statut: 'a_faire', priorite: null, echeance: null,
  jourPlanifie: null, heurePlanifiee: null, estimation: null, rang: null, poids: null, avancement: null, rappel: null, recurrence: null, horizon: null, faitLe: null, archiveLe: null,
  creeLe: '2026-11-05T10:00:00.000Z', modifieLe: '2026-11-05T10:00:00.000Z',
});

describe('liensVusDe', () => {
  it('dit le lien dans le bon sens, depuis la source comme depuis la cible', () => {
    const liens = [lien('l1', 'a', 'b', 'bloque'), lien('l2', 'c', 'a', 'bloque'), lien('l3', 'a', 'p', 'appartient_a')];
    const elements = [element('a', 'A'), element('b', 'B'), element('c', 'C'), element('p', 'Projet P')];
    expect(liensVusDe('a', liens, elements)).toEqual([
      { id: 'l3', libelle: 'Appartient à', autre: 'p', titreAutre: 'Projet P' },
      { id: 'l1', libelle: 'Bloque', autre: 'b', titreAutre: 'B' },
      { id: 'l2', libelle: 'Bloqué par', autre: 'c', titreAutre: 'C' },
    ]);
    // L'API ne rend que les liens de l'élément lu : pour p, seulement l3.
    expect(liensVusDe('p', [liens[2]!], elements)).toEqual([{ id: 'l3', libelle: 'Contient', autre: 'a', titreAutre: 'A' }]);
  });

  it("garde un lien vers un élément absent de la liste, sans titre", () => {
    expect(liensVusDe('a', [lien('l1', 'a', 'z', 'lie_a')], [])[0]?.titreAutre).toBeNull();
  });
});
