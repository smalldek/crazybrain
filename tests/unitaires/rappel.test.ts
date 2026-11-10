// L'heure d'un rappel (tâche 5.5).
import { describe, expect, it } from 'vitest';
import { lireRappel } from '../../src/domaine/rappel';
import { Element } from '../../src/domaine/element';
import { modifierElement } from '../../src/domaine/modifier-element';
import { Titre } from '../../src/domaine/titre';

describe('lireRappel', () => {
  it("lit l'heure de Paris, en hiver comme en été", () => {
    expect(lireRappel('2026-11-12 08:30').toISOString()).toBe('2026-11-12T07:30:00.000Z');
    expect(lireRappel('2026-07-14T08:30').toISOString()).toBe('2026-07-14T06:30:00.000Z');
  });

  it("autour du changement d'heure", () => {
    // 29/03/2026 : à 2 h il est 3 h ; 25/10/2026 : à 3 h il est 2 h.
    expect(lireRappel('2026-03-29 01:30').toISOString()).toBe('2026-03-29T00:30:00.000Z');
    expect(lireRappel('2026-03-29 04:00').toISOString()).toBe('2026-03-29T02:00:00.000Z');
    expect(lireRappel('2026-10-25 04:00').toISOString()).toBe('2026-10-25T03:00:00.000Z');
  });

  it('lit un instant ISO avec son fuseau, tel quel', () => {
    expect(lireRappel('2026-11-12T07:30:00.000Z').toISOString()).toBe('2026-11-12T07:30:00.000Z');
    expect(lireRappel('2026-11-12T08:30+01:00').toISOString()).toBe('2026-11-12T07:30:00.000Z');
  });

  it("refuse ce qui n'est pas une heure", () => {
    for (const faux of ['demain', '2026-11-12', '2026-02-30 08:00', '2026-11-12 25:00', '12/11/2026 08:30']) {
      expect(() => lireRappel(faux), faux).toThrow(/illisible/);
    }
  });
});

describe('le rappel d’un élément', () => {
  const maintenant = new Date('2026-11-10T10:00:00Z');
  const e = Element.creer({ id: 'a', titre: Titre.creer('Payer'), maintenant });

  it('se programme, se garde dans l’instantané, et se retire', () => {
    const avec = modifierElement({ element: e, changements: { rappel: '2026-11-12 08:30' }, idEvenement: 'ev', auteur: 'claude', maintenant });
    expect(avec.element.instantane().rappel).toBe('2026-11-12T07:30:00.000Z');
    const sans = modifierElement({ element: avec.element, changements: { rappel: null }, idEvenement: 'ev2', auteur: 'claude', maintenant });
    expect(sans.element.instantane().rappel).toBeNull();
  });
});
