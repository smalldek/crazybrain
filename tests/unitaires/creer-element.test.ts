// Créer un élément produit l'élément ET l'événement qui le raconte : on ne peut pas avoir l'un sans l'autre.
import { describe, expect, it } from 'vitest';
import { creerElement } from '../../src/domaine/creer-element';
import { ErreurDomaine } from '../../src/domaine/erreur-domaine';

const commande = {
  idElement: 'el-1',
  idEvenement: 'ev-1',
  titre: '  Acheter du pain ',
  auteur: 'adrien',
  maintenant: new Date('2026-11-03T08:30:00.000Z'),
} as const;

describe('creerElement', () => {
  it('crée l’élément avec le titre nettoyé', () => {
    const { element } = creerElement(commande);

    expect(element.id).toBe('el-1');
    expect(element.titre.valeur).toBe('Acheter du pain');
  });

  it('écrit un événement « element_cree » : avant vide, après = l’élément, auteur, date', () => {
    const { element, evenement } = creerElement(commande);

    expect(evenement).toEqual({
      id: 'ev-1',
      elementId: 'el-1',
      type: 'element_cree',
      versionForme: 2,
      avant: null,
      apres: element.instantane(),
      auteur: 'adrien',
      date: '2026-11-03T08:30:00.000Z',
    });
  });

  it('refuse un titre vide, sans élément ni événement', () => {
    expect(() => creerElement({ ...commande, titre: '   ' })).toThrow(ErreurDomaine);
  });
});
